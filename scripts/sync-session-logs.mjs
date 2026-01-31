import fs from 'fs';
import path from 'path';
import os from 'os';

const DEFAULT_API_BASE = 'http://100.106.69.9:3000';
const DEFAULT_STATE_FILE = path.join(process.cwd(), 'scripts', '.sync-session-logs.state.json');
const DEFAULT_AGENTS_DIR = path.join(os.homedir(), '.clawdbot', 'agents');
const DEFAULT_USER = 'Ada';

export function getTodayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function parseTimestamp(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildTaskMatcher(task) {
  const id = String(task.id);
  const name = task.name ? task.name.trim() : '';
  const idPattern = new RegExp(`\\b(?:task\\s*#?${id}|#${id}|tasks/${id})\\b`, 'i');
  const namePattern = name ? new RegExp(escapeRegExp(name), 'i') : null;
  return (text) => {
    if (!text) return false;
    if (idPattern.test(text)) return true;
    if (namePattern && namePattern.test(text)) return true;
    return false;
  };
}

function extractTextPartsFromMessage(message) {
  const parts = [];
  if (!message) return parts;
  if (typeof message.content === 'string') {
    parts.push(message.content);
  } else if (Array.isArray(message.content)) {
    for (const block of message.content) {
      if (!block || typeof block !== 'object') continue;
      if (typeof block.text === 'string') parts.push(block.text);
      if (typeof block.thinking === 'string') parts.push(block.thinking);
      if (typeof block.content === 'string') parts.push(block.content);
    }
  }
  return parts;
}

function normalizeArgs(args) {
  if (args == null) return '';
  if (typeof args === 'string') return args;
  try {
    return JSON.stringify(args);
  } catch (err) {
    return String(args);
  }
}

function normalizeToolContent(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts = [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      if (typeof block.text === 'string') parts.push(block.text);
      else if (typeof block.content === 'string') parts.push(block.content);
      else {
        try {
          parts.push(JSON.stringify(block));
        } catch (err) {
          parts.push(String(block));
        }
      }
    }
    return parts.join('');
  }
  try {
    return JSON.stringify(content);
  } catch (err) {
    return String(content);
  }
}

function extractToolCallsFromMessage(message) {
  const calls = [];
  if (!message) return calls;

  if (message.function_call) {
    calls.push({
      id: message.function_call.id,
      tool: message.function_call.name,
      args: message.function_call.arguments,
    });
  }

  if (Array.isArray(message.function_calls)) {
    for (const call of message.function_calls) {
      if (!call) continue;
      calls.push({
        id: call.id || call.tool_call_id,
        tool: call.name,
        args: call.arguments,
      });
    }
  }

  if (Array.isArray(message.tool_calls)) {
    for (const call of message.tool_calls) {
      if (!call) continue;
      const fn = call.function || {};
      calls.push({
        id: call.id || call.tool_call_id,
        tool: fn.name || call.name,
        args: fn.arguments || call.arguments,
      });
    }
  }

  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      if (!block || typeof block !== 'object') continue;
      if (block.type === 'toolCall' || block.type === 'tool_call') {
        calls.push({
          id: block.id || block.toolCallId || block.tool_call_id,
          tool: block.name,
          args: block.arguments,
        });
      }
    }
  }

  return calls.filter((call) => call.tool);
}

function extractToolResultsFromMessage(message) {
  const results = [];
  if (!message) return results;

  const role = message.role;
  if (role === 'toolResult' || role === 'tool') {
    results.push({
      toolCallId: message.toolCallId || message.tool_call_id || message.id,
      toolName: message.toolName || message.name,
      content: message.content,
    });
  }

  if (Array.isArray(message.content)) {
    for (const block of message.content) {
      if (!block || typeof block !== 'object') continue;
      if (block.type === 'toolResult' || block.type === 'tool_result') {
        results.push({
          toolCallId: block.toolCallId || block.tool_call_id || block.id,
          toolName: block.toolName || block.name,
          content: block.content,
        });
      }
    }
  }

  return results;
}

export function parseSessionLines(lines, range) {
  const { start, end } = range;
  const toolCalls = [];
  const toolCallById = new Map();
  const sessionTextParts = [];
  let callIndex = 0;

  for (const line of lines) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (err) {
      continue;
    }

    const entryTimestamp = parseTimestamp(entry.timestamp) || parseTimestamp(entry.message?.timestamp);
    if (!entryTimestamp || entryTimestamp < start || entryTimestamp >= end) {
      continue;
    }

    if (entry.type === 'message' || entry.message) {
      const message = entry.message || {};
      sessionTextParts.push(...extractTextPartsFromMessage(message));

      if (message.role === 'assistant') {
        const calls = extractToolCallsFromMessage(message);
        for (const call of calls) {
          const toolCall = {
            id: call.id,
            tool: call.tool,
            args: call.args,
            timestamp: entryTimestamp.toISOString(),
            index: callIndex,
            result: null,
          };
          callIndex += 1;
          toolCalls.push(toolCall);
          if (toolCall.id) toolCallById.set(toolCall.id, toolCall);
        }
      }

      const results = extractToolResultsFromMessage(message);
      for (const result of results) {
        const normalized = normalizeToolContent(result.content);
        let target = null;
        if (result.toolCallId && toolCallById.has(result.toolCallId)) {
          target = toolCallById.get(result.toolCallId);
        } else {
          for (let i = toolCalls.length - 1; i >= 0; i -= 1) {
            if (!toolCalls[i].result) {
              target = toolCalls[i];
              break;
            }
          }
        }
        if (target && !target.result) {
          target.result = normalized;
        }
      }
    }
  }

  return {
    sessionText: sessionTextParts.join(' '),
    toolCalls,
  };
}

export function summarizeToolCall(toolCall) {
  const argsSummary = normalizeArgs(toolCall.args).slice(0, 250);
  const resultSummary = toolCall.result ? toolCall.result.slice(0, 500) : '';
  const base = argsSummary ? `${toolCall.tool}: ${argsSummary}` : `${toolCall.tool}`;
  return resultSummary ? `${base}\n-> ${resultSummary}` : base;
}

export function loadState(stateFile) {
  if (!fs.existsSync(stateFile)) {
    return { version: 1, synced: {} };
  }
  try {
    const raw = fs.readFileSync(stateFile, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { version: 1, synced: {} };
  } catch (err) {
    return { version: 1, synced: {} };
  }
}

export function saveState(stateFile, state) {
  const dir = path.dirname(stateFile);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function listSessionFiles(agentsDir, start) {
  if (!fs.existsSync(agentsDir)) return [];
  const agentNames = fs.readdirSync(agentsDir).filter((name) => !name.startsWith('.'));
  const files = [];
  for (const agentName of agentNames) {
    const sessionsDir = path.join(agentsDir, agentName, 'sessions');
    if (!fs.existsSync(sessionsDir)) continue;
    const entries = fs.readdirSync(sessionsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.jsonl')) continue;
      if (entry.includes('.deleted.')) continue;
      const filePath = path.join(sessionsDir, entry);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (err) {
        continue;
      }
      if (stat.mtime < start) continue;
      files.push({
        agent: agentName,
        sessionId: entry.replace(/\.jsonl$/, ''),
        path: filePath,
      });
    }
  }
  return files;
}

async function fetchTasks(apiBase) {
  const res = await fetch(`${apiBase}/api/tasks`);
  if (!res.ok) {
    throw new Error(`Failed to load tasks: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function postActivity(apiBase, taskId, payload) {
  const res = await fetch(`${apiBase}/api/tasks/${taskId}/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to post activity for task ${taskId}: ${res.status} ${res.statusText} ${text}`);
  }
}

export async function syncSessionLogs({
  apiBase = DEFAULT_API_BASE,
  agentsDir = DEFAULT_AGENTS_DIR,
  stateFile = DEFAULT_STATE_FILE,
  user = DEFAULT_USER,
  dryRun = false,
  now = new Date(),
} = {}) {
  const { start, end } = getTodayRange(now);
  const tasks = await fetchTasks(apiBase);
  const doingTasks = tasks.filter((task) => String(task.column || '').toLowerCase() === 'doing');
  const state = loadState(stateFile);
  if (!state.synced) state.synced = {};

  const sessionFiles = listSessionFiles(agentsDir, start);
  const sessions = [];
  for (const file of sessionFiles) {
    const lines = fs.readFileSync(file.path, 'utf8').split('\n').filter(Boolean);
    const parsed = parseSessionLines(lines, { start, end });
    if (!parsed.sessionText && parsed.toolCalls.length === 0) continue;
    sessions.push({
      sessionId: file.sessionId,
      sessionText: parsed.sessionText,
      toolCalls: parsed.toolCalls,
    });
  }

  let posted = 0;
  let skipped = 0;

  for (const task of doingTasks) {
    const matcher = buildTaskMatcher(task);
    if (!state.synced[task.id]) state.synced[task.id] = {};
    for (const session of sessions) {
      if (!matcher(session.sessionText)) continue;
      for (const toolCall of session.toolCalls) {
        const callKey = `${session.sessionId}:${toolCall.id || `i${toolCall.index}`}`;
        if (state.synced[task.id][callKey]) {
          skipped += 1;
          continue;
        }
        const details = summarizeToolCall(toolCall);
        if (!dryRun) {
          await postActivity(apiBase, task.id, {
            action: 'tool_call',
            user,
            details,
            type: 'technical',
          });
          state.synced[task.id][callKey] = true;
        }
        posted += 1;
      }
    }
  }

  if (!dryRun) saveState(stateFile, state);

  return { posted, skipped, taskCount: doingTasks.length, sessionCount: sessions.length };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  try {
    const result = await syncSessionLogs({ dryRun });
    const mode = dryRun ? 'DRY RUN' : 'SYNCED';
    console.log(`${mode}: ${result.posted} tool calls (${result.skipped} skipped) across ${result.taskCount} tasks / ${result.sessionCount} sessions.`);
  } catch (err) {
    console.error(`sync-session-logs failed: ${err.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
