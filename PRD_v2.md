# PRD: Mission Control v2 - Output Fields, Subtasks & In-Card Chat

**Version:** 1.0  
**Date:** 2026-01-30  
**Author:** Ada  
**MC Task:** #102  
**Priority:** P1  

---

## Executive Summary

Mission Control currently tracks task status but loses deliverables to chat. When a task is "done", there's no way to see WHAT was delivered. This PRD adds 4 features to make MC a true deliverable tracker.

---

## Problem Statement

**Current state:**
- Tasks have description (input) but no output field
- When work is done, results are sent to chat and lost
- Complex tasks with multiple parts aren't broken down
- No way to ask questions about a specific task's context

**User pain:**
> "You say work is done, but I can't see the result. Where's the link to the website? Where's the link to the ad?"

---

## Features

### Feature 1: Output/Result Field

**What:** Add an `output` field to tasks that stores deliverable links and results.

**Schema change:**
```sql
ALTER TABLE tasks ADD COLUMN output TEXT;
ALTER TABLE tasks ADD COLUMN output_type VARCHAR(50); -- 'url', 'file', 'text', 'multiple'
```

**API changes:**
```javascript
// PATCH /api/tasks/:id
{
  "output": "https://ai-influencer-factory.com",
  "output_type": "url"
}

// Support multiple outputs
{
  "output": JSON.stringify([
    { "type": "url", "label": "Website", "value": "https://..." },
    { "type": "url", "label": "GitHub", "value": "https://github.com/..." },
    { "type": "file", "label": "Design", "value": "/path/to/file.pdf" }
  ]),
  "output_type": "multiple"
}
```

**UI changes:**
- Add "Output" section below description in task detail view
- Show clickable links for URLs
- Show file download links for files
- Display text output in a code block

**Agent behavior:**
- When completing a task, agent MUST set the output field
- Agent should extract URLs/file paths from work and populate output

---

### Feature 2: Auto-Subtask Breakdown

**What:** Automatically detect multi-part tasks and create subtasks.

**Schema change:**
```sql
-- Already exists: parent_task_id
-- Add helper fields
ALTER TABLE tasks ADD COLUMN is_parent BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN subtask_count INTEGER DEFAULT 0;
```

**Detection logic:**
```javascript
function shouldBreakdown(taskDescription) {
  // Detect multiple action items
  const patterns = [
    /\d+\.\s/g,           // Numbered lists: "1. Do X 2. Do Y"
    /\n[-•]\s/g,          // Bullet points
    /\band\b.*\band\b/gi, // Multiple "and": "create X and build Y and write Z"
    /,\s*(create|build|write|design|implement)/gi // Comma-separated actions
  ];
  
  return patterns.some(p => (taskDescription.match(p) || []).length >= 2);
}

function extractSubtasks(taskDescription) {
  // Use LLM to extract discrete tasks
  // Return array of { name, description }
}
```

**API changes:**
```javascript
// POST /api/tasks/:id/breakdown
// Triggers auto-breakdown of a task into subtasks
// Returns created subtask IDs

// GET /api/tasks/:id/subtasks
// Returns all subtasks for a parent task
```

**UI changes:**
- Show subtask tree under parent task
- Progress bar showing X/Y subtasks complete
- Collapse/expand subtask list
- "Break down" button on complex tasks

**Agent behavior:**
- When receiving a complex task, check if it should be broken down
- Create subtasks automatically
- Work through subtasks sequentially
- Mark parent done only when all subtasks done

---

### Feature 3: Deliverable Links on Card

**What:** Ensure all outputs are persisted on the task card, not just in chat.

This is mostly a behavioral change enforced by Feature 1. Additional requirements:

**Activity log enhancement:**
```javascript
// When task moves to "done", require output
// POST /api/tasks/:id/activity
{
  "action": "completed",
  "user": "Ada",
  "details": "Website deployed",
  "output": "https://example.com",  // NEW: attach output to activity
  "output_type": "url"
}
```

**Validation:**
- Warn (don't block) if task moved to "done" without output
- Show "Missing output" indicator on done tasks without output field

**UI changes:**
- "Outputs" tab in task detail showing all deliverables
- Quick-copy buttons for URLs
- Preview thumbnails for images
- Activity log shows outputs inline

---

### Feature 4: In-Card Conversation

**What:** Chat within a task card. Questions get answered with task context.

**Schema change:**
```sql
CREATE TABLE task_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user VARCHAR(100) NOT NULL,  -- 'Henry', 'Ada', 'Scotty'
  message TEXT NOT NULL,
  is_agent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

**API changes:**
```javascript
// POST /api/tasks/:id/messages
{
  "user": "Henry",
  "message": "What's the conversion rate on this landing page?"
}

// GET /api/tasks/:id/messages
// Returns all messages for a task

// POST /api/tasks/:id/messages/agent
// Triggers agent to respond to latest message
// Agent receives: task details + activity log + previous messages as context
```

**Agent integration:**
```javascript
// When agent responds to task message:
const context = {
  task: await getTask(taskId),
  activity: await getTaskActivity(taskId),
  messages: await getTaskMessages(taskId),
  output: task.output
};

// Agent prompt includes full task context
const response = await agent.respond(userMessage, context);

// Save agent response
await createTaskMessage(taskId, 'Ada', response, true);
```

**UI changes:**
- Chat panel in task detail view
- Real-time message updates
- "@Ada" to trigger agent response
- Show typing indicator when agent is responding

**Notification:**
- When user posts in task chat, notify assigned agent
- Agent can respond asynchronously

---

## Technical Implementation

### Database Migrations

```sql
-- Migration: 001_add_output_fields.sql
ALTER TABLE tasks ADD COLUMN output TEXT;
ALTER TABLE tasks ADD COLUMN output_type VARCHAR(50);

-- Migration: 002_add_subtask_fields.sql
ALTER TABLE tasks ADD COLUMN is_parent BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN subtask_count INTEGER DEFAULT 0;

-- Migration: 003_create_task_messages.sql
CREATE TABLE task_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  is_agent BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
CREATE INDEX idx_task_messages_task_id ON task_messages(task_id);
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /api/tasks/:id | Update task (now includes output, output_type) |
| POST | /api/tasks/:id/breakdown | Auto-breakdown task into subtasks |
| GET | /api/tasks/:id/subtasks | Get subtasks for a parent |
| GET | /api/tasks/:id/messages | Get task chat messages |
| POST | /api/tasks/:id/messages | Post message to task chat |
| POST | /api/tasks/:id/messages/agent | Trigger agent response |

### Frontend Components

1. **OutputDisplay** - Renders output field based on type
2. **SubtaskList** - Collapsible subtask tree with progress
3. **TaskChat** - In-card chat interface
4. **BreakdownButton** - Triggers auto-breakdown

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Tasks with output field populated | >80% of done tasks |
| Subtask usage | >50% of complex tasks broken down |
| Task chat adoption | >10 messages/week |
| Time to find deliverable | <5 seconds (vs. searching chat) |

---

## Rollout Plan

**Phase 1: Output Fields (Day 1-2)**
- Add database columns
- Update API
- Update UI to show/edit output
- Update agent to populate output on completion

**Phase 2: Subtasks (Day 3-4)**
- Add breakdown logic
- Update UI for subtask tree
- Test with complex tasks

**Phase 3: Task Chat (Day 5-7)**
- Create messages table
- Build chat UI
- Integrate agent responses
- Test end-to-end

---

## Open Questions

1. Should subtasks inherit parent's assignee or be assigned individually?
2. Max depth for subtask nesting? (Recommend: 2 levels)
3. Should task chat notify via Telegram/Slack or just in-app?

---

## Appendix: Current MC Schema

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  column TEXT DEFAULT 'backlog',
  recurring INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  assignee TEXT,
  due_date DATE,
  priority TEXT,
  recurring_config TEXT,
  archived INTEGER DEFAULT 0,
  parent_task_id INTEGER,
  roadmap_id INTEGER,
  estimate_hours REAL,
  time_spent REAL DEFAULT 0,
  blocked INTEGER DEFAULT 0,
  blocker_reason TEXT,
  progress_status TEXT,
  model TEXT
);
```

---

**Document ready for Codex execution.** 🚀
