# Mission Control 🚀

**The single source of truth for all agent work.**

A task management system designed for AI agents (and humans). Track tasks, log activity, manage roadmaps, and see exactly what your agents are doing.

![Mission Control](https://img.shields.io/badge/status-active-green) ![Node.js](https://img.shields.io/badge/node-%3E%3D18-blue) ![SQLite](https://img.shields.io/badge/database-SQLite-lightgrey)

## Features

### ✅ Kanban Board
- **Ops Board** - Day-to-day tasks (Backlog → Todo → Doing → Review → Done)
- **Strategic Board** - Roadmaps and long-term planning
- Drag & drop between columns
- Filter by agent (Ada, Spock, Scotty, etc.)

### ✅ Task Detail Panel
- Slide-in panel (Asana-style)
- Editable title, assignee, due date
- Comments with threading
- Activity logging (human-readable + technical)

### ✅ Global Search
- Search across task names, descriptions, activity logs
- Keyboard shortcut: `Cmd/Ctrl + K`
- Highlighted match results

### ✅ Activity Logging
- Two types: **human** (summaries) and **technical** (commands/outputs)
- Session tracking - link tasks to agent sessions
- Full audit trail of what agents did

### ✅ Auto-Tracker Hook (Clawdbot)
- Automatically creates tasks for substantial work (5+ tool calls)
- Extracts title, priority, deadline, assignee from context
- Moves tasks to Review when agent completes work
- No manual tracking needed

## Quick Start

```bash
# Clone
git clone https://github.com/henrino3/mission-control.git
cd mission-control

# Install
npm install

# Run
node server.js

# Open
open http://localhost:3000
```

## API

### Tasks

```bash
# List all tasks
GET /api/tasks

# Create task
POST /api/tasks
{
  "name": "Research competitor pricing",
  "description": "Details here",
  "assignee": "Spock",
  "due_date": "2026-02-01",
  "priority": "P1"
}

# Update task
PATCH /api/tasks/:id
{ "column": "doing" }

# Log activity
POST /api/tasks/:id/activity
{
  "action": "searched",
  "user": "Ada",
  "details": "Found 3 competitor pricing pages",
  "type": "human"
}
```

### Search

```bash
GET /api/search?q=investor
# Returns tasks matching "investor" in name, description, or activity
```

See [USAGE.md](USAGE.md) for full API documentation.

## Architecture

```
mission-control/
├── server.js          # Express API server
├── public/
│   └── index.html     # Frontend (vanilla JS + Tailwind)
├── tasks.db           # SQLite database
├── PRD.md             # Product requirements
└── docs/
    ├── search-feature-spec.md
    └── auto-tracker-prd.md
```

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Frontend:** Vanilla JS + CSS (dark theme)
- **No build step** - just run and go

## Clawdbot Integration

Mission Control includes a workspace hook for [Clawdbot](https://github.com/clawdbot/clawdbot) that automatically tracks agent work:

```
~/clawd/hooks/mission-control/
├── HOOK.md      # Hook metadata
└── handler.js   # Auto-tracking logic
```

The hook:
1. Counts tool calls per session
2. Creates task card when threshold (5+) is reached
3. Logs tool activity to the card
4. Moves card to Review when agent finishes

## Roadmap

See [PRD.md](PRD.md) for full implementation phases.

**Done:**
- ✅ Phase 1: Task detail panel
- ✅ Phase 1.5: Two main boards (Ops/Strategic)
- ✅ Phase 1.6: Settings
- ✅ Phase 2: Activity logging
- ✅ Phase 2.1: Global search
- ✅ Phase 2.2: Auto-tracker hook

**Next:**
- ⬜ Phase 3: Core task management (priorities, due dates)
- ⬜ Phase 4: Dependencies & blockers
- ⬜ Phase 5: Time tracking & assignment rules

## License

MIT

---

Built by [Ada](https://x.com/SuperAda___) 👩‍🚀 + Scotty 🔧
