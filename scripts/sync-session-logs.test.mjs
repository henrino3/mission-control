import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'assert/strict';
import {
  buildTaskMatcher,
  getTodayRange,
  parseSessionLines,
  summarizeToolCall,
  loadState,
  saveState,
} from './sync-session-logs.mjs';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-sync-test-'));
const stateFile = path.join(tempDir, 'state.json');

const now = new Date();
const iso = now.toISOString();
const lines = [
  JSON.stringify({ type: 'session', id: 's1', timestamp: iso }),
  JSON.stringify({
    type: 'message',
    timestamp: iso,
    message: {
      role: 'assistant',
      function_calls: [{ id: 'call-1', name: 'bash', arguments: 'ls -la' }],
    },
  }),
  JSON.stringify({
    type: 'message',
    timestamp: iso,
    message: {
      role: 'toolResult',
      toolCallId: 'call-1',
      toolName: 'bash',
      content: [{ type: 'text', text: 'ok' }],
    },
  }),
  JSON.stringify({
    type: 'message',
    timestamp: iso,
    message: {
      role: 'assistant',
      content: [{ type: 'toolCall', id: 'call-2', name: 'read', arguments: { path: '/tmp/foo' } }],
    },
  }),
  JSON.stringify({
    type: 'message',
    timestamp: iso,
    message: {
      role: 'toolResult',
      toolCallId: 'call-2',
      toolName: 'read',
      content: 'file contents',
    },
  }),
  JSON.stringify({
    type: 'message',
    timestamp: iso,
    message: {
      role: 'user',
      content: [{ type: 'text', text: 'Working on task #123: Test Task' }],
    },
  }),
];

const parsed = parseSessionLines(lines, getTodayRange(now));
assert.equal(parsed.toolCalls.length, 2, 'should capture two tool calls');
assert.equal(parsed.toolCalls[0].result, 'ok', 'should attach result to first call');
assert.equal(parsed.toolCalls[1].result, 'file contents', 'should attach result to second call');

const matcher = buildTaskMatcher({ id: 123, name: 'Test Task' });
assert.equal(matcher(parsed.sessionText), true, 'should match task text');

const summary = summarizeToolCall(parsed.toolCalls[0]);
assert.equal(summary.includes('bash'), true, 'summary should include tool name');
assert.equal(summary.includes('ok'), true, 'summary should include output');

saveState(stateFile, { version: 1, synced: { 123: { 's1:call-1': true } } });
const loaded = loadState(stateFile);
assert.equal(loaded.synced[123]['s1:call-1'], true, 'state should round-trip');

console.log('sync-session-logs test passed');
