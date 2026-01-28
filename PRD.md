# Mission Control v2 - Product Requirements Document

**Author:** Ada 👩‍🚀  
**Date:** 2026-01-28  
**Status:** Active Development  
**Builder:** Scotty (via `codex --yolo` on Mac)

---

## Vision

Mission Control becomes the **single source of truth** for all work across agents. Not just a task board - a complete work tracking system where Henry can:
- See everything that was worked on
- Review agent activity (high-level and technical)
- Manage strategic roadmaps
- Continue or spawn new work from any task
- Track sessions tied to tasks

**Current problem:** "Added to roadmap" everywhere but no way to pick things up or track what actually got done.

**Solution:** A unified workspace that tracks ALL agent work with full history and activity logs.

---

## Core Views - Two Main Boards

The app has **two main tabs/boards** at the top level:

```
┌─────────────────────────────────────────────────────────────┐
│  [ Ops ]    [ Strategic ]                                   │
└─────────────────────────────────────────────────────────────┘
```

### Board 1: Ops (Default)
**Day-to-day operational work.**

Standard Kanban: **This Week → In Progress → Review → Done**
- Click any card → opens detail panel
- Filter by agent, status, date
- Where daily tasks live
- Quick add for immediate todos

### Board 2: Strategic
**Big-picture planning and recurring work.**

Contains:
- **Recurring Tasks** - All recurring tasks in one place
- **Roadmaps** - Multiple themed roadmaps:
  - Technical Roadmap
  - Product Roadmap  
  - BD/Sales Roadmap
  - Personal Roadmap
  - (User can create custom roadmaps)
- **Anything else Henry adds** - Flexible space for strategic initiatives

**Roadmap Features:**
- Create multiple roadmaps by theme
- Each roadmap has its own items
- Can move roadmap items → Ops backlog (promote to active work)
- Timeline/priority view for each roadmap
- **Pick from Roadmap** - Drag items from Strategic → Ops

---

## Task Detail Panel (Click on Card)

When clicking any card, a **2/3 width detail panel slides in from the right** (Asana-style):

- Takes up 66% of screen width
- Full height
- Slides in with animation
- Close button (×) in top-right

### Header
- Task title (editable)
- Status badge
- Mark complete button
- "Continue Work" button (triggers agent)
- "Create Follow-up Task" button

### Tabs in Detail Panel

#### Tab 1: Overview

**Task Detail Fields (like Asana screenshot):**

| Field | Description |
|-------|-------------|
| **Assignee** | Dropdown: Ada, Spock, Scotty, Henry, Unassigned |
| **Due date** | Date picker with calendar |
| **Projects** | Multi-select tags/themes (can belong to multiple) |
| **Attachments** | Link files (local paths or URLs) |
| **Description** | Markdown text area |

**Projects/Themes Examples:**
- Soteria AI
- Curacel Operations  
- BD/Sales
- Technical Debt
- Personal
- (User can create custom projects)

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ✓ Mark complete                    📎 🔗 ↗️ ⋯ ✕   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Research competitor pricing models                 │
│                                                     │
│  Assignee     👤 Ada                         ▾     │
│  Due date     📅 Jan 30, 2026                ▾     │
│  Projects     🏷️ Soteria AI  ✕  BD/Sales  ✕       │
│               + Add to projects                     │
│  Attachments  📎 Add file or link                  │
│                                                     │
│  Description                                        │
│  ┌───────────────────────────────────────────────┐ │
│  │ What is this task about?                      │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

- Created by / Created at (shown at bottom)
- Session link (which session worked on this)

#### Tab 2: Comments
- Add notes/discussion (like Asana)
- Threaded if needed
- Mentions support (@Ada, @Henry)

#### Tab 3: Activity Summary
**Human-readable summary of what the agent did:**
```
✓ Logged into Gmail
✓ Found 3 relevant emails  
✓ Drafted response to investor
✓ Sent email to Fraser Edwards
✓ Updated CRM with notes
```
- Collapsible sections by date/session
- Shows WHAT was done, not HOW
- Easy to scan and understand

#### Tab 4: Activity Detail
**Full technical log:**
```
[14:02:31] exec: gog gmail search "from:fraser" --limit 5
[14:02:33] result: Found 3 emails
[14:02:35] exec: gog gmail read <id>
[14:02:40] exec: gog gmail send --to fraser@cheqd.io --subject "Re: ..."
[14:02:45] slack: Posted to #partnerships
```
- Every command/tool execution
- Full timestamps
- Expandable entries for full output
- For debugging/understanding exactly what agent did

**Tab UI (like Asana screenshot):**
```
[ Comments ]  [ Activity Summary ]  [ Activity Detail ]     ↑↓ Oldest
─────────────────────────────────────────────────────────────────────
Ada created this task · Jan 27, 2026
Ada moved to in-progress · Jan 27, 2026
Ada: "Researching competitor pricing..." · Jan 27, 2026
```

### Actions from Detail Panel
- **Continue Work** - Send task back to assigned agent to keep working
- **Create Follow-up** - Create a new linked task
- **Reassign** - Change agent
- **Archive** - Remove from board but keep history

---

## Agent Activity Logging

### How It Works

When an agent works on a task, they log activity:

```javascript
// High-level activity (human readable)
POST /api/tasks/:id/activity
{
    "type": "high-level",
    "summary": "Sent investor update email",
    "session_id": "abc-123"
}

// Technical activity (detailed)
POST /api/tasks/:id/activity  
{
    "type": "technical",
    "action": "exec",
    "command": "gog gmail send ...",
    "result": "Email sent successfully",
    "timestamp": "2026-01-27T14:02:45Z",
    "session_id": "abc-123"
}
```

### Session Linking

Each task tracks which sessions worked on it:
- Session ID stored with activity
- Can click session ID to see full session context (if available)
- Multiple sessions can work on same task over time

### Activity Sources
- Manual agent logging (agents call API)
- Automatic from Clawdbot (if we can hook into tool execution)
- Comments (also logged as activity)

---

## Recurring Tasks

### Types
- Daily
- Weekly (pick day)
- Monthly (pick date)
- Custom (every N days)

### Behavior
When completed:
1. Current instance archived with completion timestamp
2. New instance created in configured column (default: backlog)
3. All activity preserved on archived instance
4. New instance is fresh but linked to recurring parent

### Strategic View
- See all recurring tasks in one list
- Toggle active/paused
- See completion history
- Adjust frequency

---

## Roadmap Management

### Create Roadmap
- Name (e.g., "Technical Roadmap Q1 2026")
- Theme/Category
- Color coding

### Roadmap Items
- Title
- Description
- Priority (P0/P1/P2/P3)
- Target quarter/month
- Status: Planned / In Progress / Done / Dropped

### Actions
- **Promote to Backlog** - Move item to Kanban backlog
- **Create Task** - Generate task from roadmap item
- When task completes, roadmap item auto-updates

---

## Multi-Agent Access

All agents (Ada, Spock, Scotty) can:
- Create tasks
- Update tasks
- Log activity
- Complete tasks
- Access from their respective gateways

| Agent | Location | MC_URL |
|-------|----------|--------|
| Ada | ada-gateway | localhost:3000 |
| Spock | ada-gateway | localhost:3000 |
| Scotty | Pi | http://100.106.69.9:3000 |

---

## Database Schema

```sql
-- Tasks (enhanced)
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    column TEXT DEFAULT 'backlog',
    assignee TEXT,
    due_date TEXT,
    recurring TEXT,
    recurring_config TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT,
    archived INTEGER DEFAULT 0,
    parent_task_id INTEGER,  -- For follow-ups
    roadmap_id INTEGER       -- Link to roadmap item
);

-- Activity Log (NEW - the big one)
CREATE TABLE activity (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL,
    type TEXT NOT NULL,        -- 'high-level' or 'technical'
    summary TEXT,              -- Human readable (high-level)
    action TEXT,               -- Tool/command type (technical)
    command TEXT,              -- Actual command (technical)
    result TEXT,               -- Output/result
    session_id TEXT,           -- Which session
    user TEXT,                 -- Which agent
    timestamp TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Comments
CREATE TABLE comments (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Roadmaps (NEW)
CREATE TABLE roadmaps (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    theme TEXT,
    color TEXT,
    created_at TEXT
);

-- Roadmap Items (NEW)
CREATE TABLE roadmap_items (
    id INTEGER PRIMARY KEY,
    roadmap_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT,             -- P0, P1, P2, P3
    target_period TEXT,        -- Q1 2026, Feb 2026, etc.
    status TEXT DEFAULT 'planned',
    linked_task_id INTEGER,    -- When promoted to task
    created_at TEXT,
    FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)
);

-- Task History (audit trail)
CREATE TABLE task_history (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL,
    field TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_by TEXT,
    changed_at TEXT
);

-- Projects/Themes (NEW)
CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,              -- For visual distinction
    created_at TEXT
);

-- Task-Project relationship (many-to-many)
CREATE TABLE task_projects (
    task_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    PRIMARY KEY (task_id, project_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Attachments (NEW)
CREATE TABLE attachments (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL,
    name TEXT,
    path TEXT,               -- Local path or URL
    type TEXT,               -- 'file', 'link', 'drive'
    created_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

---

## API Endpoints

### Tasks
```
GET    /api/tasks                    - List all tasks
GET    /api/tasks/:id                - Get task with all details
POST   /api/tasks                    - Create task
PATCH  /api/tasks/:id                - Update task
DELETE /api/tasks/:id                - Archive task

POST   /api/tasks/:id/activity       - Log activity (high-level or technical)
GET    /api/tasks/:id/activity       - Get activity log
GET    /api/tasks/:id/activity?type=high-level  - Filter by type

POST   /api/tasks/:id/comments       - Add comment
GET    /api/tasks/:id/comments       - List comments

POST   /api/tasks/:id/continue       - Trigger agent to continue work
POST   /api/tasks/:id/followup       - Create follow-up task
```

### Roadmaps
```
GET    /api/roadmaps                 - List all roadmaps
POST   /api/roadmaps                 - Create roadmap
GET    /api/roadmaps/:id             - Get roadmap with items
POST   /api/roadmaps/:id/items       - Add item to roadmap
PATCH  /api/roadmap-items/:id        - Update item
POST   /api/roadmap-items/:id/promote - Promote to task
```

### Views
```
GET    /api/recurring                - All recurring tasks
GET    /api/activity/recent          - Recent activity across all tasks
GET    /api/sessions/:id/tasks       - Tasks worked on in a session
```

---

## Frontend Structure

**Two main tabs (always visible at top):**
```
/                     - Ops board (default) - day-to-day Kanban
/strategic            - Strategic board (roadmaps, recurring, big picture)
/roadmap/:id          - Single roadmap view (within Strategic)
/task/:id             - Task detail (slide-in panel on any view)
```

**Tab UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ Mission Control                                         │
│                                                             │
│  ┌──────┐  ┌────────────┐                                  │
│  │ Ops  │  │ Strategic  │                    + New task    │
│  └──────┘  └────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### Components
- `<BoardTabs>` - Main Ops/Strategic tab switcher
- `<OpsBoard>` - Day-to-day Kanban (current board, enhanced)
- `<StrategicBoard>` - Roadmaps, recurring, big-picture planning
- `<TaskCard>` - Card on Kanban
- `<TaskDetail>` - Slide-in panel (2/3 width, Asana-style)
- `<ActivityFeed>` - High-level activity list
- `<TechnicalLog>` - Technical activity viewer
- `<CommentSection>` - Comments UI
- `<RoadmapBoard>` - Roadmap item management
- `<RecurringList>` - Recurring tasks list

### Card Display Rules

**On Kanban card (compact view):**
- Task name
- Assignee avatar
- Due date (if set)
- Recurring indicator (if applicable)

**NOT on card:**
- Activity (goes in detail view only)
- Description (goes in detail view)
- Comments (goes in detail view)

```
┌──────────────────────────────────┐
│ Research competitor pricing      │
│                                  │
│ 👤 Ada    📅 Jan 30    🔄       │
└──────────────────────────────────┘
```

**Clean, minimal cards.** Click card → opens detail panel with FULL activity log, comments, description, etc.

---

## Security & Access

### Current State
- Runs on `http://100.106.69.9:3000` (Tailscale IP)
- Only accessible to Tailnet members
- No authentication

### TODO: Add Authentication
- Simple login system (username/password or magic link)
- Users: Henry, Ada, Spock, Scotty (+ future team members)
- Session-based auth
- API keys for agent access
- Audit log of who accessed/changed what

### Deployment
- **Server:** ada-gateway (stays same)
- **URL:** http://100.106.69.9:3000
- **Dev access:** Scotty SSHs to ada-gateway or syncs via git

---

## Implementation Phases

### Phase 1: Enhanced Task Detail ✅ DONE
- [x] Task detail slide-in panel (2/3 width, Asana-style)
- [x] Editable title (inline)
- [x] Assignee dropdown
- [x] Due date picker
- [x] Comments section with threading
- [x] Activity log view

### Phase 1.5: Two Main Boards ✅ DONE
- [x] Ops/Strategic tab UI at top
- [x] Ops board = current Kanban (day-to-day)
- [x] Strategic board shell (basic structure)
- [x] Hash routing (#ops, #strategic)

### Phase 1.6: Settings ✅ DONE
- [x] Settings gear (⚙️) in header → opens settings modal
- [x] Archive toggle: on/off (hides Archive column completely)
- [x] Persist settings in localStorage

### Phase 1.7: UI Polish ⬜ TODO
- [ ] Move Ops/Strategic tabs to same row as "Mission Control" title
- [ ] Align tabs to the right, near settings gear icon
- [ ] Clean up header layout for better visual hierarchy
- [ ] Fix cards to show assignee (not created_by) - cards currently show who created the task instead of who should do it
- [ ] Remove activity from Kanban cards (keep cards minimal)

### Phase 1.8: Enhanced New Task Modal ⬜ PRIORITY
**Current state:** Only has task name, description, recurring checkbox
**Needed:** Full task creation with all key fields upfront

**Add to New Task modal:**
- [ ] **Assignee dropdown** - Ada / Spock / Scotty / Henry / Unassigned (default: Unassigned)
- [ ] **Due date picker** - Calendar widget (optional)
- [ ] **Priority dropdown** - P0 / P1 / P2 / P3 (optional, default: P2)
- [ ] **Projects multi-select** - Tag with multiple projects (optional)
- [ ] **Column dropdown** - Where to create it: Backlog (default) / Todo / Doing
- [ ] Keep existing: Task name (required), Description (optional), Recurring checkbox

**Layout:**
```
┌─────────────────────────────────────────┐
│ New Task                          [×]   │
├─────────────────────────────────────────┤
│                                         │
│ Task name *                             │
│ ┌─────────────────────────────────────┐ │
│ │ [task name input]                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Description                             │
│ ┌─────────────────────────────────────┐ │
│ │ [textarea]                          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Assignee                Due Date        │
│ [Dropdown ▼]           [📅 Picker]      │
│                                         │
│ Priority                Column          │
│ [P0/P1/P2/P3 ▼]        [Backlog ▼]     │
│                                         │
│ Projects                                │
│ [Multi-select chips]                    │
│                                         │
│ ☐ Recurring task                        │
│                                         │
│              [Cancel]  [Add Task]       │
└─────────────────────────────────────────┘
```

**Smart defaults:**
- Assignee: Unassigned (user picks)
- Column: Backlog
- Priority: P2
- Due date: None
- Projects: None

### Phase 2: Activity Logging ✅ DONE
- [x] Two-type activity system (human / technical)
- [x] Activity API for agents (POST /api/tasks/:id/activity)
- [x] Activity view in detail panel
- [x] Session ID tracking

### Phase 2.1: Global Search ✅ DONE
- [x] Search icon in header (🔍) next to settings
- [x] Click to expand search input
- [x] `/api/search?q=term` endpoint
- [x] Searches: task name, description, activity details, assignee
- [x] Results dropdown with highlighted matches (`<mark>` tags)
- [x] Click result → opens task detail panel
- [x] Keyboard support (Cmd/Ctrl+K to open, Escape to close, arrows to navigate)
- [x] Spec: `docs/search-feature-spec.md`

### Phase 2.2: Auto-Tracker Hook ✅ DONE
- [x] Clawdbot workspace hook at `~/clawd/hooks/mission-control/`
- [x] Detects substantial tasks (5+ tool calls)
- [x] Auto-creates MC card with extracted fields:
  - Title (from user message)
  - Priority (urgency keyword detection)
  - Deadline (date parsing: "by Friday", "tomorrow")
  - Assignee (keyword matching: research→Spock, build→Scotty)
  - Project (keyword matching)
  - Session ID link
- [x] Deduplication (skips if agent already created card)
- [x] Auto-moves card to Review on agent_end
- [x] PRD: `docs/auto-tracker-prd.md`

### Phase 3: Core Task Management ⬜ NEXT (Priority)
- [ ] Mandatory due dates on all tasks
- [ ] Priority levels (P0/P1/P2/P3)
- [ ] Agent wake-up check (heartbeat polls board for assigned tasks)
- [ ] Daily view (what's due today)

### Phase 4: Dependencies & Blockers ⬜ TODO
- [ ] Task dependencies (Task B blocked by Task A)
- [ ] Blockers flag (agent marks "stuck, need Henry" - escalates automatically)
- [ ] Progress indicator on task cards
  - In progress: blue
  - Blocked: red
  - Backlog: gray
  - Review: yellow
  - Done: green

### Phase 5: Time & Assignment ⬜ TODO
- [ ] Time estimates on tasks ("~2 hours")
- [ ] Auto-assignment rules ("Research tasks → Spock")
- [ ] Capacity limits ("Scotty has 3 tasks max in progress")

### Phase 6: Visibility & Tracking ⬜ TODO
- [ ] Weekly/Monthly calendar view
- [ ] Real-time activity feed ("Ada completed X")
- [ ] Metrics dashboard (tasks completed this week, by agent, avg time)
- [ ] Cost tracking (tokens/API calls per task)
- [ ] Time tracking (actual vs estimated)
- [ ] Pattern detection ("This type of task takes 3x longer")

### Phase 7: Context Linking ⬜ TODO
- [ ] Auto-link related tasks
- [ ] Link to conversations/Slack threads
- [ ] Link to relevant docs
- [ ] Previous task history

### Phase 8: Recurring Tasks ⬜ TODO
- [ ] Recurring task configuration
- [ ] Auto-recreation on completion
- [ ] Recurring task list view

### Phase 9: Strategic View & Roadmaps ⬜ TODO
- [ ] Strategic view content (currently shell only)
- [ ] Roadmap CRUD
- [ ] Roadmap items management
- [ ] Promote to backlog

### Phase 10: Projects/Tags ⬜ TODO
- [ ] Projects table
- [ ] Multi-tag tasks
- [ ] Filter by project

**Implementation Details:**

1. **Create Projects API**
   ```bash
   POST /api/projects
   {
     "name": "Soteria AI",
     "color": "#FF5733"
   }
   ```

2. **Tag Task with Projects**
   ```bash
   POST /api/tasks/:id/projects
   {
     "projectIds": [1, 2, 3]
   }
   ```

3. **UI Changes**
   - Add "Projects" dropdown in detail panel (multi-select)
   - Show project tags as colored chips on task cards
   - Add project filter in header
   - Create "Manage Projects" in settings

4. **Database** (already in schema)
   - `projects` table with name, color
   - `task_projects` junction table

### Phase 11: Agent Integration ⬜ TODO
- [ ] Continue work button
- [ ] Create follow-up button
- [ ] Agent notifications
- [ ] Cross-gateway webhooks

### Phase 12: Authentication & Security ⬜ TODO
- [ ] Simple login system
- [ ] User accounts (Henry, agents, team)
- [ ] API keys for agent access
- [ ] Access audit log

---

## Success Criteria

1. ✅ Click any task → see full detail with activity
2. ✅ Two activity views: human-readable summary + technical log
3. ✅ Can continue/spawn work from any task
4. ✅ All agent work tracked with session links
5. ✅ Strategic view with roadmaps
6. ✅ Pick items from roadmap → backlog
7. ✅ Recurring tasks auto-reset
8. ✅ All three agents can use it

---

## Tech Stack

Keep it simple:
- **Backend:** Node.js + Express
- **Database:** SQLite
- **Frontend:** Vanilla JS + Tailwind (or upgrade to Vue/React if needed)
- **Location:** `~/clawd/projects/mission-control/`

---

## Agent Protocol (MANDATORY FOR ALL AGENTS)

### The Rule
**Any task that takes >5 minutes → Create MC card BEFORE starting.**

This applies to ALL agents: Ada, Spock, Scotty.

### Why This Matters
Henry needs to see what agents are doing. Not just "task complete" but the actual work:
- What searches were done
- What emails were sent
- What code was written
- What decisions were made

**When Henry clicks a card, he should see everything the agent did.**

### Workflow (All Agents)

```
1. Receive task from Henry
         ↓
2. Estimate: Will this take >5 minutes?
         ↓
   YES → Create MC card immediately
         ↓
3. Move card to "doing"
         ↓
4. Work on task, logging activities as you go
         ↓
5. Move card to "review" when done
         ↓
6. Henry reviews and moves to "done"
```

### Activity Logging

As you work, log what you're doing:

```bash
curl -X POST http://100.106.69.9:3000/api/tasks/{id}/activity \
  -H "Content-Type: application/json" \
  -d '{
    "action": "searched",
    "user": "Ada",
    "details": "Checked Gmail for investor emails, found 3 threads from Fraser",
    "type": "human"
  }'
```

**What to log:**
| Agent | Log These Activities |
|-------|---------------------|
| **Ada** | Emails sent, meetings scheduled, decisions made, delegations |
| **Spock** | Research sources, data gathered, analysis performed |
| **Scotty** | Code changes, commands run, deployments, bugs fixed |

**Activity Types:**
- `human` - High-level summary (default - what Henry sees in Activity tab)
- `technical` - Detailed logs (commands, outputs - for debugging)

### Quick Reference

```bash
# Create task
curl -X POST http://100.106.69.9:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"name": "Task name", "description": "Details", "created_by": "Ada", "assignee": "Ada"}'

# Log activity (DO THIS AS YOU WORK)
curl -X POST http://100.106.69.9:3000/api/tasks/{id}/activity \
  -H "Content-Type: application/json" \
  -d '{"action": "sent", "user": "Ada", "details": "Sent follow-up email to Fraser", "type": "human"}'

# Move task
curl -X PATCH http://100.106.69.9:3000/api/tasks/{id} \
  -H "Content-Type: application/json" \
  -d '{"column": "doing"}'
```

### Self-Check (On Every Heartbeat)
Each agent should ask themselves:
> "Am I working on something that's taken >5 minutes without an MC card?"

If yes → Create card immediately and log what you've done so far.

### Review Workflow
- **Henry → Agent:** Agent works → moves to Review → Henry moves to Done
- **Ada → Scotty/Spock:** They work → move to Review → Ada tests → moves to Done

**Nothing goes to Done without review.**

---

## Building Mission Control

**How we build MC itself (and other features):**

1. **Ada updates PRD** with features/specs
2. **Ada breaks PRD into MC tasks** → adds to board
3. **Scotty picks up tasks** from backlog
4. **Scotty builds with Codex** → logs activities → moves to review
5. **Henry/Ada reviews** → moves to done
6. **Repeat**

---

## Notes for Scotty 🔧

**Build with:** `codex --yolo` on Mac (SSH from Pi)

**Your workflow:**
1. Check board: http://100.106.69.9:3000
2. Pick task from backlog → move to doing
3. SSH to Mac, run Codex
4. Log activities to the task as you build
5. Move to review when done
6. Wait for approval

**Key insight:** Activity logging is the most valuable part. Every command you run, every file you change - log it.

**Test at:** http://100.106.69.9:3000

**Don't break existing functionality** - it must keep working throughout.

---

*PRD by Ada 👩‍🚀 | Expanded per Henry's vision | 2026-01-27*

---

## Future Ideas & Enhancements

Ideas for making Mission Control more powerful. Not prioritized yet, but worth considering.

### 🎯 Advanced Task Management

| Feature | Description |
|---------|-------------|
| **Bulk operations** | Move 5 tasks to next week at once |
| **Task templates** | "Research task" / "Build task" / "Outreach task" with preset fields |

### 🤖 Agent Intelligence

| Feature | Description |
|---------|-------------|
| **Agent status board** | See who's online, what they're working on right now |
| **Handoff notes** | When Ada passes to Scotty, context transfers cleanly |
| **Workload balancing** | Suggest reassigning tasks when agent is overloaded |

### 🔗 Integrations

| Feature | Description |
|---------|-------------|
| **Email → Task** | Important email arrives → auto-creates task |
| **Slack mention → Task** | @Henry in Slack → becomes a task |
| **Meeting → Tasks** | Fireflies action items → auto-added to backlog |
| **Calendar sync** | See tasks alongside meetings |

### 📋 Planning & Organization

| Feature | Description |
|---------|-------------|
| **Sprint/Week buckets** | Group tasks into "This Week" vs "Next Week" |
| **Goals/OKRs** | Link tasks to bigger objectives (Soteria launch, fundraise, etc.) |
| **Search & Filter** | Find tasks by keyword, date range, agent, status |
| **Saved views** | "My urgent tasks" / "Scotty's backlog" / "Overdue items" |
| **Auto-prioritize** | Suggest priority based on due date + dependencies |

---

## File Linking Protocol

When agents create tasks that reference files (PRDs, briefs, specs, etc.), they should include clickable links in the description.

**Ada's Webserver:** `http://100.106.69.9:8788`

**Example task description:**
```
Implement the enhanced New Task modal per spec.

📄 PRD: http://100.106.69.9:8788/#/projects/mission-control/PRD.md
📋 Spec: Phase 1.8 - Enhanced New Task Modal

Requirements:
- Assignee dropdown
- Due date picker
- Priority dropdown
```

**Agents should:**
1. Always link relevant docs in task descriptions
2. Use the webserver URL format: `http://100.106.69.9:8788/#/path/to/file`
3. Include brief context, not just the link
