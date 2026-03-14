# Pages

## Routes Overview

| Route | Tab | Full-screen | Purpose |
|-------|-----|-------------|---------|
| `/` | — | — | Redirect to lastVisitedTab |
| `/library` | 1 | — | Browse/manage projects; tap to start timer |
| `/suggest` | 2 | — | Time-aware project suggestion |
| `/combo` | — | — | Multi-project combo (URL param `?minutes=N`) |
| `/timer` | — | ✓ | Countdown timer |
| `/complete` | — | ✓ | Save session outcome + notes + photo |
| `/dashboard` | 3 | — | Overview stats + session history |
| `/settings` | — | ✓ | Theme, language, style, backup |

BottomNav (tabs 1–3) is hidden on `/timer`, `/complete`, `/settings`.

---

## Navigation Rules

- Hash router — URL format is `/#/library`
- `/combo` uses URL param `?minutes=N` (not router state) — survives back navigation
- All other cross-route data is passed via `useNavigate(path, { state: payload })`
- BottomNav tab changes call `settingsStore.setLastVisitedTab()`

---

## Router State Payloads

### Received by `/timer` (`TimerRouterState`)
```typescript
interface TimerRouterState {
  projectIds: string[];
  totalMinutes: number;
  comboGroupId?: string;
  projectAllocatedMinutes?: Record<string, number>; // per-project override for partial combos
  origin?: string; // page to return to on Quit (e.g. '/library', '/suggest')
}
```

### Received by `/complete` (`CompleteRouterState`)
```typescript
interface CompleteRouterState {
  actualDurationMs: number;
  projectIds: string[];
  comboGroupId: string | null;
  plannedDurationMinutes: number;
  outcome: SessionOutcome;
  skippedProjectIds: string[];
  projectElapsedMs: Record<string, number>;
}
```

### Other state transfers
| From | To | State |
|------|----|-------|
| `/library` | `/timer` | `TimerRouterState` (single project, no comboGroupId) |
| `/suggest` | `/timer` | `TimerRouterState` |
| `/suggest` | `/combo` | URL param `?minutes=N` |
| `/combo` | `/timer` | `TimerRouterState` (with comboGroupId) |
| `/timer` | `/complete` | `CompleteRouterState` |

---

## Page Details

### `/` — Home
- Reads `settings.lastVisitedTab`, redirects immediately (no visible UI)
- First-time users default to `/library`

---

### `/library` — Project Library

**Behavior:**
- Lists active projects; order determined by `getActiveProjects(sessions)`
- Sort modes: `date` (most recent session DESC) | `name` (alphabetical) | `custom` (dnd-kit drag-and-drop)
- Color filter dropdown (ColorFilterDropdown)
- Header `+` button or FAB opens AddProjectSheet
- Tap project card → `StartSessionSheet` (choose duration) → navigate to `/timer`
- Long-press or swipe: edit / archive / delete
- Archived projects shown in a collapsible section (can unarchive)

**Sub-components:**
- `ProjectCard` — shows color dot, name, estimated duration
- `SortableProjectCard` — dnd-kit integration
- `ProjectForm` — add/edit with React Hook Form + Zod
- `StartSessionSheet` — duration selection bottom sheet
- `ColorPicker` — color selection
- `ColorFilterDropdown` — color filter

---

### `/suggest` — Daily Suggestion

**Behavior:**
- DrumPicker (scroll wheel) to choose available time
- Calls `suggestProject()` for a weighted random suggestion
- "Roll Again": seed +1, excludes previous result (`excludeId`), picks a different project
- "Try Combo": navigate to `/combo?minutes=N`
- "Start": navigate to `/timer` with `TimerRouterState`
- SuggestionCard shows: color strip, name, estimated duration, duration fit score health bar, project notes

---

### `/combo` — Combo Suggestion

**Behavior:**
- Reads `?minutes=N` from URL
- Calls `suggestCombos()` for up to 3 sets (2–4 projects each)
- Carousel display with prev/next buttons or swipe
- Each set shows: project list, per-project duration, total duration, slack time
- "Start Combo": navigate to `/timer` with `TimerRouterState` (including comboGroupId)

---

### `/timer` — Pomodoro Timer

**Behavior:**
- Receives `TimerRouterState` via router state (**except** crash recovery)
- **Crash recovery gate**: on mount, checks `timerDraft` IDB store; shows `TimerDraftRecovery` dialog if a draft exists (restore or discard)
- Driven by `useTimer` hook (rAF ticks every second)
- FlipClock countdown + circular progress ring
- Controls: Pause/Resume, Skip (combo only, disabled on last project), Quit
- Natural finish → navigate to `/complete` with `CompleteRouterState`
- Page Visibility API: reconciles elapsed time on tab return
- Wake Lock: keeps screen on while running
- Saves `timerDraft` to IDB every second for crash recovery
- Combo: advances through projects sequentially; skipped projects logged as `partial`

---

### `/complete` — Session Complete

**Behavior:**
- Receives `CompleteRouterState` via router state
- Shows session summary (planned vs actual duration)
- Outcome toggle: Completed / Partial / Abandoned
- Notes textarea (combo: one per project)
- Photo attachment: compressed to 1024×1024 JPEG 65%, stored in `sessionImages` IDB store
- SAVE → writes `Session` records → navigate to `/dashboard` or `/library`
- Combo: one card per project with individual notes + photo

---

### `/dashboard` — Activity Dashboard

**Behavior:**
- Two tabs: Overview | History
- **Overview tab:**
  - StatsPanel: streak count, total sessions, total time
  - 90-day heatmap; tap a day cell → day detail panel listing all sessions (editable)
  - Project time breakdown
- **History tab:**
  - All sessions in reverse-chronological order, filterable by project
  - Tap session → edit outcome + notes
  - Swipe session → delete (with confirmation)
- Session photos shown as thumbnails; tap to enlarge (ImageLightbox)

---

### `/settings` — Settings

**Behavior:**
- Theme: System / Light / Dark (`settingsStore.setTheme`)
- Language: English / 繁體中文 (`settingsStore.setLanguage`)
- App Style: Classic / Pixel / Paper / Zen (`settingsStore.setAppStyle`)
- Export data: JSON backup, optionally include photos (`backup.exportData()`)
- Import data: restore from JSON, **replaces** all local data (with confirmation dialog) (`backup.importData()`)
