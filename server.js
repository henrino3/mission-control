#!/usr/bin/env node
const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const app = express();
const PORT = 3000;
const db = new Database(path.join(__dirname, 'tasks.db'));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    column TEXT NOT NULL DEFAULT 'backlog',
    recurring BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'Henry',
    assignee TEXT DEFAULT 'Henry'
  );
  
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    user TEXT NOT NULL,
    details TEXT,
    type TEXT DEFAULT 'human',
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    parent_id INTEGER,
    user TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
  )
`);

const taskColumns = db.prepare('PRAGMA table_info(tasks)').all().map(column => column.name);
if (!taskColumns.includes('assignee')) {
  db.exec(`ALTER TABLE tasks ADD COLUMN assignee TEXT DEFAULT 'Henry'`);
  db.exec(`UPDATE tasks SET assignee = COALESCE(NULLIF(created_by, ''), 'Henry') WHERE assignee IS NULL OR assignee = ''`);
}
if (!taskColumns.includes('due_date')) {
  db.exec(`ALTER TABLE tasks ADD COLUMN due_date TEXT`);
}

const activityColumns = db.prepare('PRAGMA table_info(activity)').all().map(column => column.name);
if (!activityColumns.includes('type')) {
  db.exec(`ALTER TABLE activity ADD COLUMN type TEXT DEFAULT 'human'`);
}
if (!activityColumns.includes('session_id')) {
  db.exec(`ALTER TABLE activity ADD COLUMN session_id TEXT`);
}

app.use(express.json());
app.use(express.static('public'));

// Helper: Log activity
function logActivity(taskId, action, user, details = null, type = 'human', sessionId = null) {
  return db
    .prepare('INSERT INTO activity (task_id, action, user, details, type, session_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(taskId, action, user, details, type, sessionId);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildSnippet(text, query, contextLength = 50) {
  if (!text || !query) return '';
  const rawText = String(text);
  const lowerText = rawText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    const trimmed = rawText.slice(0, 120);
    return escapeHtml(trimmed);
  }

  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(rawText.length, matchIndex + lowerQuery.length + contextLength);
  const snippetText = rawText.slice(start, end);
  const snippetLower = snippetText.toLowerCase();
  const localIndex = snippetLower.indexOf(lowerQuery);

  const before = escapeHtml(snippetText.slice(0, localIndex));
  const match = escapeHtml(snippetText.slice(localIndex, localIndex + lowerQuery.length));
  const after = escapeHtml(snippetText.slice(localIndex + lowerQuery.length));
  const prefix = start > 0 ? '...' : '';
  const suffix = end < rawText.length ? '...' : '';
  return `${prefix}${before}<mark>${match}</mark>${after}${suffix}`;
}

function findMatchInfo(task, query) {
  const lowerQuery = query.toLowerCase();
  const matches = (value) => value && String(value).toLowerCase().includes(lowerQuery);

  if (matches(task.name)) {
    return { source: 'name', snippet: buildSnippet(task.name, query) };
  }
  if (matches(task.description)) {
    return { source: 'description', snippet: buildSnippet(task.description, query) };
  }
  if (matches(task.activity_match)) {
    return { source: 'activity', snippet: buildSnippet(task.activity_match, query) };
  }
  if (matches(task.comment_match)) {
    return { source: 'comment', snippet: buildSnippet(task.comment_match, query) };
  }
  if (matches(task.assignee)) {
    return { source: 'assignee', snippet: buildSnippet(task.assignee, query) };
  }

  return { source: 'name', snippet: buildSnippet(task.name || '', query) };
}

// API Routes
app.get('/api/search', (req, res) => {
  const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limitParam = Number(req.query.limit);
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(limitParam, 50)) : 10;

  if (!rawQuery) {
    return res.json({ results: [], total: 0, query: '' });
  }

  const query = rawQuery.toLowerCase();
  const pattern = `%${query}%`;

  const searchStmt = db.prepare(`
    SELECT t.id, t.name, t.description, t.column, t.assignee,
      (SELECT details FROM activity a WHERE a.task_id = t.id AND LOWER(a.details) LIKE ? ORDER BY a.created_at DESC LIMIT 1) AS activity_match,
      (SELECT body FROM comments c WHERE c.task_id = t.id AND LOWER(c.body) LIKE ? ORDER BY c.created_at DESC LIMIT 1) AS comment_match
    FROM tasks t
    WHERE
      LOWER(t.name) LIKE ?
      OR LOWER(t.description) LIKE ?
      OR LOWER(t.assignee) LIKE ?
      OR EXISTS (SELECT 1 FROM activity a WHERE a.task_id = t.id AND LOWER(a.details) LIKE ?)
      OR EXISTS (SELECT 1 FROM comments c WHERE c.task_id = t.id AND LOWER(c.body) LIKE ?)
    ORDER BY t.updated_at DESC
    LIMIT ?
  `);

  const totalStmt = db.prepare(`
    SELECT COUNT(DISTINCT t.id) as total
    FROM tasks t
    WHERE
      LOWER(t.name) LIKE ?
      OR LOWER(t.description) LIKE ?
      OR LOWER(t.assignee) LIKE ?
      OR EXISTS (SELECT 1 FROM activity a WHERE a.task_id = t.id AND LOWER(a.details) LIKE ?)
      OR EXISTS (SELECT 1 FROM comments c WHERE c.task_id = t.id AND LOWER(c.body) LIKE ?)
  `);

  const rows = searchStmt.all(
    pattern,
    pattern,
    pattern,
    pattern,
    pattern,
    pattern,
    pattern,
    limit
  );

  const totalRow = totalStmt.get(
    pattern,
    pattern,
    pattern,
    pattern,
    pattern
  );

  const results = rows.map((task) => {
    const matchInfo = findMatchInfo(task, rawQuery);
    return {
      task_id: task.id,
      task_name: task.name,
      match_source: matchInfo.source,
      snippet: matchInfo.snippet,
      column: task.column,
      assignee: task.assignee || 'Unassigned',
    };
  });

  res.json({
    results,
    total: totalRow ? totalRow.total : results.length,
    query: rawQuery,
  });
});

app.get('/api/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  
  // Add activity for each task
  tasks.forEach(task => {
    task.activity = db.prepare('SELECT * FROM activity WHERE task_id = ? ORDER BY created_at DESC LIMIT 10').all(task.id);
  });
  
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const {
    name,
    description,
    due_date = null,
    column = 'backlog',
    created_by = 'Henry',
    assignee = created_by || 'Henry',
    recurring = false,
    session_id = null,
  } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Task name required' });
  }

  const stmt = db.prepare('INSERT INTO tasks (name, description, due_date, column, created_by, assignee, recurring) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(name, description, due_date, column, created_by, assignee, recurring ? 1 : 0);
  const taskId = result.lastInsertRowid;
  
  logActivity(taskId, 'created', created_by, name, 'human', session_id);
  if (assignee && assignee !== created_by) {
    logActivity(taskId, 'assigned', created_by, assignee, 'human', session_id);
  }
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  task.activity = db.prepare('SELECT * FROM activity WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const { column, name, description, assignee, due_date, session_id = null } = req.body;
  const oldTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  const updates = [];
  const values = [];

  if (column) {
    updates.push('column = ?');
    values.push(column);
    
    // Log column change
    if (column === 'complete') {
      logActivity(req.params.id, 'completed', 'Henry', oldTask.name, 'human', session_id);
    } else {
      logActivity(req.params.id, 'moved', 'Henry', `${oldTask.column} → ${column}`, 'human', session_id);
    }
  }
  if (name) {
    updates.push('name = ?');
    values.push(name);
    logActivity(req.params.id, 'updated', 'Henry', 'changed name', 'human', session_id);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (assignee !== undefined) {
    updates.push('assignee = ?');
    values.push(assignee);
    if (assignee !== oldTask.assignee) {
      logActivity(req.params.id, 'assigned', 'Henry', assignee, 'human', session_id);
    }
  }
  if (due_date !== undefined) {
    updates.push('due_date = ?');
    values.push(due_date);
    if (due_date !== oldTask.due_date) {
      logActivity(req.params.id, 'updated', 'Henry', 'changed due date', 'human', session_id);
    }
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);

  const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  task.activity = db.prepare('SELECT * FROM activity WHERE task_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// Add note to task
app.post('/api/tasks/:id/note', (req, res) => {
  const { note, user = 'Henry', session_id = null } = req.body;
  
  if (!note) {
    return res.status(400).json({ error: 'Note required' });
  }

  logActivity(req.params.id, 'noted', user, note, 'human', session_id);
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  task.activity = db.prepare('SELECT * FROM activity WHERE task_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json(task);
});

// Activity logging API
app.post('/api/tasks/:id/activity', (req, res) => {
  const { action, user = 'Henry', details = null, type = 'human', session_id = null } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action required' });
  }

  const normalizedType = type === 'technical' ? 'technical' : 'human';
  const result = logActivity(req.params.id, action, user, details, normalizedType, session_id);
  const activity = db.prepare('SELECT * FROM activity WHERE id = ?').get(result.lastInsertRowid);
  res.json(activity);
});

// Comments API
app.get('/api/tasks/:id/comments', (req, res) => {
  const comments = db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(comments);
});

app.post('/api/tasks/:id/comments', (req, res) => {
  const { body, user = 'Henry', parent_id = null, session_id = null } = req.body;

  if (!body) {
    return res.status(400).json({ error: 'Comment body required' });
  }

  const stmt = db.prepare('INSERT INTO comments (task_id, parent_id, user, body) VALUES (?, ?, ?, ?)');
  const result = stmt.run(req.params.id, parent_id, user, body);

  logActivity(req.params.id, 'commented', user, body.slice(0, 120), 'human', session_id);

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  res.json(comment);
});

// Webhook endpoint
app.post('/hook/task', (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }

  // Simple parsing: first line = name, rest = description
  const lines = message.trim().split('\n');
  const name = lines[0];
  const description = lines.slice(1).join('\n') || null;

  const stmt = db.prepare('INSERT INTO tasks (name, description, column, created_by, assignee) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(name, description, 'backlog', 'Ada', 'Ada');
  const taskId = result.lastInsertRowid;
  
  logActivity(taskId, 'created', 'Ada', name);
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  task.activity = db.prepare('SELECT * FROM activity WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
  res.json(task);
});

// Sync sessions from other agents
function listAgentSessions({ storePath, activeMinutes }) {
  return new Promise((resolve) => {
    if (!fs.existsSync(storePath)) {
      return resolve({ path: storePath, count: 0, sessions: [], error: 'missing_store' });
    }

    const args = [
      '/home/henrymascot/clawdbot/dist/index.js',
      'sessions',
      '--json',
      '--store',
      storePath,
    ];

    if (typeof activeMinutes === 'number' && !Number.isNaN(activeMinutes)) {
      args.push('--active', String(activeMinutes));
    }

    execFile('node', args, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) {
        return resolve({
          path: storePath,
          count: 0,
          sessions: [],
          error: 'exec_failed',
          details: (stderr || stdout || String(err)).toString().slice(0, 2000),
        });
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (parseErr) {
        resolve({
          path: storePath,
          count: 0,
          sessions: [],
          error: 'bad_json',
          details: (stdout || '').toString().slice(0, 2000),
        });
      }
    });
  });
}

app.get('/api/sync/agents', async (req, res) => {
  const activeMinutes = req.query.activeMinutes ? Number(req.query.activeMinutes) : 240;

  const agents = [
    {
      id: 'spock',
      name: 'Spock',
      storePath: '/home/henrymascot/.clawdbot/agents/spock/sessions/sessions.json',
    },
    {
      id: 'scotty',
      name: 'Scotty',
      storePath: '/home/henrymascot/.clawdbot/agents/scotty/sessions/sessions.json',
    },
  ];

  const results = await Promise.all(
    agents.map(async (agent) => ({
      ...agent,
      sessionStore: await listAgentSessions({ storePath: agent.storePath, activeMinutes }),
    }))
  );

  res.json({
    activeMinutes,
    agents: results.map(({ storePath, ...rest }) => rest),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mission Control running on http://0.0.0.0:${PORT}`);
});
