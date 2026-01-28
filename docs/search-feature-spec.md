# Mission Control Search Feature Spec

**Date:** 2026-01-28  
**Priority:** P1  
**Builder:** Codex on Mac

---

## Overview

Add global search to Mission Control. Users can search across all tasks, activities, and comments from a single search box in the header.

---

## UI Specification

### Header Layout (Current → New)

**Before:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Mission Control    [Ops] [Strategic]              ⚙️    │
└─────────────────────────────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Mission Control    [Ops] [Strategic]         🔍    ⚙️   │
└─────────────────────────────────────────────────────────────┘
```

### Search Icon Behavior

1. **Collapsed state:** Just 🔍 icon (clickable)
2. **Click icon:** Expands into search input
3. **Expanded state:** Input field with placeholder "Search tasks..."
4. **Click outside or press Escape:** Collapses back to icon
5. **Click ✕ button:** Clears search and collapses

### Expanded Search UI

```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Mission Control    [Ops] [Strategic]                     │
│                                                             │
│                    ┌────────────────────────────┐           │
│                    │ 🔍 investor email       ✕ │           │
│                    └────────────────────────────┘           │
│                    ┌────────────────────────────┐           │
│                    │ 📋 Send investor update    │           │
│                    │    "...sent investor       │           │
│                    │    email to Fraser..."     │           │
│                    ├────────────────────────────┤           │
│                    │ 📋 Research competitor     │           │
│                    │    pricing                 │           │
│                    │    "...investor deck..."   │           │
│                    ├────────────────────────────┤           │
│                    │ 📋 Prepare board deck      │           │
│                    │    Activity: "Drafted      │           │
│                    │    investor slides"        │           │
│                    └────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Results Dropdown

- Appears below search input as user types
- Max height: 400px (scrollable)
- Shows up to 10 results
- Each result shows:
  - Task name (bold)
  - Snippet with highlighted match (gray, truncated)
  - Source indicator if match is in activity/comment
- Click result → Opens task detail panel
- "No results found" message if empty

### Keyboard Support

- `Cmd/Ctrl + K` → Opens search (global shortcut)
- `Escape` → Closes search
- `Enter` on result → Opens that task
- `Arrow Up/Down` → Navigate results
- Typing → Live search (debounced 300ms)

---

## Backend API

### Endpoint

```
GET /api/search?q=<query>&limit=10
```

### Response

```json
{
  "results": [
    {
      "task_id": 42,
      "task_name": "Send investor update",
      "match_source": "activity",
      "snippet": "...sent <mark>investor</mark> email to Fraser Edwards...",
      "column": "done",
      "assignee": "Ada"
    },
    {
      "task_id": 15,
      "task_name": "Research competitor pricing",
      "match_source": "description",
      "snippet": "...compare <mark>investor</mark> deck with competitors...",
      "column": "review",
      "assignee": "Spock"
    }
  ],
  "total": 2,
  "query": "investor"
}
```

### Search Logic

Search across these fields (in order of priority):
1. `tasks.name` - Task title
2. `tasks.description` - Task description
3. `activity.details` - Activity log entries
4. `comments.content` - Comments on tasks (if table exists)
5. `tasks.assignee` - Assignee name

**SQL Pattern:**
```sql
SELECT DISTINCT t.id, t.name, t.column, t.assignee,
       CASE 
         WHEN t.name LIKE '%query%' THEN 'name'
         WHEN t.description LIKE '%query%' THEN 'description'
         WHEN a.details LIKE '%query%' THEN 'activity'
       END as match_source,
       COALESCE(
         CASE WHEN t.name LIKE '%query%' THEN t.name END,
         CASE WHEN t.description LIKE '%query%' THEN SUBSTR(t.description, ...) END,
         CASE WHEN a.details LIKE '%query%' THEN SUBSTR(a.details, ...) END
       ) as snippet
FROM tasks t
LEFT JOIN activity a ON t.id = a.task_id
WHERE t.name LIKE '%query%'
   OR t.description LIKE '%query%'
   OR a.details LIKE '%query%'
   OR t.assignee LIKE '%query%'
ORDER BY t.updated_at DESC
LIMIT 10
```

### Snippet Generation

- Extract ~100 chars around the match
- Wrap matched text in `<mark>` tags for highlighting
- Handle case-insensitive matching

---

## Frontend Implementation

### Files to Modify

1. **`public/index.html`**
   - Add search icon button in header
   - Add search input (hidden by default)
   - Add results dropdown container

2. **`public/index.html` (JavaScript section)**
   - `toggleSearch()` - Show/hide search UI
   - `handleSearch(query)` - Debounced API call
   - `renderSearchResults(results)` - Display results
   - `handleResultClick(taskId)` - Open task detail
   - Keyboard event listeners

### CSS Classes Needed

```css
.search-container { /* wrapper */ }
.search-icon { /* 🔍 button */ }
.search-input { /* text input */ }
.search-input.expanded { /* visible state */ }
.search-results { /* dropdown */ }
.search-result { /* single result */ }
.search-result:hover { /* highlight */ }
.search-result mark { /* highlighted match */ }
.search-no-results { /* empty state */ }
```

---

## Implementation Steps

1. **Backend first:**
   - Add `GET /api/search` endpoint in `server.js`
   - Test with curl

2. **Frontend UI:**
   - Add search icon to header
   - Add hidden search input
   - Add results dropdown container

3. **Frontend JS:**
   - Wire up toggle behavior
   - Add debounced search function
   - Render results
   - Handle click → open task

4. **Polish:**
   - Keyboard shortcuts
   - Loading state
   - Empty state
   - Animations

---

## Testing

```bash
# Test API
curl "http://100.106.69.9:3000/api/search?q=investor"
curl "http://100.106.69.9:3000/api/search?q=Ada"
curl "http://100.106.69.9:3000/api/search?q=codex"

# Test UI
1. Click 🔍 icon → should expand
2. Type "test" → should show results
3. Click result → should open detail panel
4. Press Escape → should close search
5. Cmd+K → should open search
```

---

## Files

- **Server:** `~/clawd/projects/mission-control/server.js`
- **Frontend:** `~/clawd/projects/mission-control/public/index.html`
- **This spec:** `~/clawd/projects/mission-control/docs/search-feature-spec.md`

---

## Notes

- Keep it simple - SQLite LIKE is fast enough for this scale
- Don't over-engineer - no need for full-text search engine
- Match existing UI style (Tailwind classes)
- Test on http://100.106.69.9:3000 after deploy
