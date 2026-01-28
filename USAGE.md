# Mission Control - Usage Guide

**URL:** http://100.106.69.9:3000

## What Goes on the Board?

### ✅ Add to Board
- **Multi-step projects** (>2 hours work)
- **Cross-agent coordination** (Ada + Spock + Scotty working together)
- **Strategic decisions** (BD deals, product direction, hiring)
- **Deliverables with deadlines** (presentations, reports, launches)
- **Recurring workflows** (weekly reviews, monthly reports)
- **Anything Henry explicitly asks to track**

### ❌ Don't Add
- **Quick fixes** (<30 min, just do it)
- **Routine maintenance** (unless it's recurring)
- **Research questions** (unless it's a major research project)
- **One-off messages** (send email, post tweet - not tracked)

### 🟣 Recurring Tasks
Mark as recurring if it:
- Happens weekly/monthly
- Is a repeating workflow
- Should reset to backlog when complete

## Features

### Card View
- **Drag & drop** between columns
- **Click card** to open full detail view
- **Activity preview** (last 3 actions)
- **Purple dot** = recurring task

### Detail View
- Full activity log (all actions)
- Add notes/updates
- See complete task history
- Press ESC to close

### Filters
- **Ada** - tasks created by Ada
- **Henry** - tasks created by Henry
- **All** - everything
- **Recurring** - click purple indicator to filter recurring only

### API

```bash
# Add task
curl -X POST http://100.106.69.9:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name": "Task name", "description": "Details", "created_by": "Ada", "recurring": false}'

# Add note to task
curl -X POST http://100.106.69.9:3000/api/tasks/1/note \
  -H "Content-Type: application/json" \
  -d '{"note": "Progress update", "user": "Ada"}'

# Move task
curl -X PATCH http://100.106.69.9:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"column": "in-progress"}'

# Webhook (simple add)
curl -X POST http://100.106.69.9:3000/hook/task \
  -H "Content-Type: application/json" \
  -d '{"message": "Task name\nOptional description"}'
```

## Agent Integration

When agents start multi-step work, they should:
1. Create card in Mission Control
2. Update status as they progress
3. Add notes for context
4. Move to Review when ready for Henry

Example:
```bash
# Ada creates research task
curl -X POST http://100.106.69.9:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name": "Research competitor pricing models", "created_by": "Ada"}'

# Ada moves to in-progress
curl -X PATCH http://100.106.69.9:3000/api/tasks/5 \
  -H "Content-Type: application/json" \
  -d '{"column": "in-progress"}'

# Ada adds progress note
curl -X POST http://100.106.69.9:3000/api/tasks/5/note \
  -H "Content-Type: application/json" \
  -d '{"note": "Found 3 competitors, analyzing pricing tiers", "user": "Ada"}'

# Ada moves to review
curl -X PATCH http://100.106.69.9:3000/api/tasks/5 \
  -H "Content-Type: application/json" \
  -d '{"column": "review"}'
```

## Future Ideas
- Pull active sessions from Spock + Scotty automatically
- Gantt chart view for timelines
- Task dependencies
- Time tracking
- Notifications when tasks move to Review

---

Built by Ada 👩‍🚀 2026-01-25
