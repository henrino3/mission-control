# Mission Control Auto-Tracker PRD

**Version:** 1.0  
**Date:** 2026-01-28  
**Author:** Ada  
**Status:** Built, pending testing

---

## Problem Statement

Agents (especially non-Opus models) forget to create Mission Control cards when doing substantial work. This leads to:
- Lost visibility into what agents are doing
- No audit trail of work performed
- Tasks not properly tracked through review workflow
- Henry has to manually check what got done

## Solution

A Clawdbot workspace hook that **automatically** creates and manages MC cards based on agent behavior - no agent memory required.

---

## How It Works

### Detection Logic
```
User sends message → Hook captures it
       ↓
Agent makes tool calls → Hook counts them
       ↓
Tool count hits 5 → "Substantial task" detected
       ↓
Check: Does MC card exist for this session?
   YES → Log activity to existing card
   NO  → Create new card with extracted fields
       ↓
Agent finishes → Move card to Review
```

### Threshold
- **5+ tool calls** = substantial task
- Simple questions (1-4 tools) = no card noise

---

## Auto-Extracted Fields

| Field | Extraction Method | Example |
|-------|-------------------|---------|
| **name** | First sentence of user message (max 100 chars) | "Build webhook integration for MC" |
| **description** | Full user message + session link | "Henry requested: [full text]..." |
| **priority** | Keyword detection | "urgent" → P1, "eventually" → P3 |
| **due_date** | Date parsing | "by Friday" → 2026-01-31 |
| **assignee** | Keyword matching | "research" → Spock, "build" → Scotty |
| **projectIds** | Project keyword matching | "mission control" → MC project |
| **estimate_hours** | Complexity heuristics | Long message → 2h, "quick" → 0.5h |
| **session_id** | Clawdbot session key | Links back to full transcript |

### Priority Keywords
- **P0:** critical, emergency, asap, immediately
- **P1:** urgent, important, priority, today
- **P2:** soon, this week (default)
- **P3:** eventually, low priority, nice to have

### Deadline Patterns
- "by today/tonight" → same day
- "by tomorrow" → +1 day
- "by Monday/Tuesday/etc" → next occurrence
- "in 3 days/weeks" → relative calculation

### Assignee Keywords
- **Spock:** research, find out, look up
- **Scotty:** build, fix, code, implement
- **Ada:** default (orchestration)

---

## Deduplication

If an agent manually creates an MC card (following SOUL.md rules), the hook:
1. Finds the existing card by `session_id`
2. Logs tool activity to it instead of creating duplicate
3. Still moves to Review on completion

**Result:** Smart agents work normally, dumb agents get backup coverage.

---

## Activity Logging

Every tool call after card creation gets logged:
```json
{
  "action": "exec",
  "user": "System",
  "details": "command: grep -r 'hook'...",
  "type": "technical",
  "session_id": "abc-123"
}
```

Henry can click any card and see exactly what tools the agent used.

---

## Implementation

**Location:** `~/clawd/hooks/mission-control/`

**Files:**
- `HOOK.md` - Metadata and event registration
- `handler.js` - Full implementation (~300 lines)

**Events Used:**
- `after_tool_call` - Count tools, trigger card creation
- `agent_end` - Move card to Review

**Config:**
```json
{
  "hooks": {
    "internal": {
      "entries": {
        "mission-control-auto": { "enabled": true }
      }
    }
  }
}
```

---

## Testing Plan

1. **Basic flow:** Send task requiring 5+ tool calls → verify card created
2. **Deduplication:** Manually create card first → verify no duplicate
3. **Field extraction:** Include deadline/priority in message → verify parsed
4. **Completion:** Verify card moves to Review when agent finishes
5. **Activity log:** Verify tool calls appear in card activity

---

## Success Metrics

- **Coverage:** 100% of substantial tasks have MC cards
- **Accuracy:** >90% of extracted fields are correct
- **No duplicates:** Zero duplicate cards for same session
- **Completion:** All auto-created cards reach Review column

---

## Future Enhancements

1. **LLM extraction:** Use Sonnet/Haiku for smarter title/field extraction
2. **Time tracking:** Track actual time spent (first tool → agent_end)
3. **Subtask detection:** Detect when task spawns subtasks
4. **Cross-agent:** Track when Ada delegates to Scotty/Spock
5. **Notifications:** Alert Henry when substantial task starts

---

## Links

- **Hook code:** `~/clawd/hooks/mission-control/handler.js`
- **Mission Control:** http://100.106.69.9:3000
- **API docs:** `~/clawd/projects/mission-control/USAGE.md`
