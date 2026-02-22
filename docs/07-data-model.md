# Data Model

All data lives locally on the device — no server, no accounts.

---

## TypeScript Interfaces

### `Project`

Stored in IndexedDB `projects` object store.

```typescript
interface Project {
  id: string                         // crypto.randomUUID()
  name: string                       // max 30 chars
  color: ProjectColor                // see ProjectColor below
  estimatedDurationMinutes: number   // 15 | 30 | 45 | 60 | 90 | 120 | 180
  notes: string                      // project-level notes, max 500 chars
  isArchived: boolean                // hidden from active lists when true
  createdAt: number                  // Unix timestamp ms
  updatedAt: number                  // Unix timestamp ms
}
```

**Notes**: `Project.notes` is set when creating/editing a project in the Library. It appears as a faded excerpt on the SuggestionCard (Page 2).

---

### `Session`

Stored in IndexedDB `sessions` object store. Append-only — never edited or deleted.

```typescript
interface Session {
  id: string                         // crypto.randomUUID()
  projectId: string                  // FK → Project.id
  startedAt: number                  // Unix timestamp ms
  endedAt: number                    // Unix timestamp ms
  plannedDurationMinutes: number     // what the user originally set
  actualDurationMinutes: number      // Math.round(actualDurationMs / 60000), written at session save time
  outcome: SessionOutcome            // see SessionOutcome below
  notes: string                      // session-level notes, max 500 chars (written on /complete)
  wasCombo: boolean                  // true if part of a multi-project combo
  comboGroupId: string | null        // shared UUID across all sessions in one combo run
}
```

**Where session notes appear**: Written on the `/complete` page after a session. Surfaced on the Dashboard — tapping a heatmap day cell opens a Day Detail panel listing all sessions for that day with their outcomes and notes. Sessions can also be edited (outcome + notes only) from this panel.

---

### `SessionOutcome`

```typescript
type SessionOutcome = 'completed' | 'partial' | 'abandoned'
```

| Value | Meaning | Set by |
|---|---|---|
| `completed` | Timer ran to zero naturally | Auto-set; user can change on /complete |
| `partial` | User stopped early intentionally | Set when user taps "Stop & Log" |
| `abandoned` | User quit without meaningful work | Set when user taps "Quit" |

---

### `ProjectColor`

15-color fixed palette. Colors are stored as string keys; resolved to CSS values at render time via a lookup map (not dynamic Tailwind strings).

```typescript
type ProjectColor =
  | 'indigo'   // #6366f1
  | 'violet'   // #8b5cf6
  | 'pink'     // #ec4899
  | 'rose'     // #f43f5e
  | 'red'      // #ef4444
  | 'orange'   // #f97316
  | 'amber'    // #f59e0b
  | 'yellow'   // #eab308
  | 'lime'     // #84cc16
  | 'green'    // #22c55e
  | 'teal'     // #14b8a6
  | 'cyan'     // #06b6d4
  | 'sky'      // #0ea5e9
  | 'slate'    // #64748b
  | 'stone'    // #78716c
```

---

### `AppSettings`

Stored in IndexedDB `settings` object store (single record, key `"settings"`).

```typescript
interface AppSettings {
  hasSeenHome: boolean                              // false = show home on next open; set true on first button tap, reset to false when user taps [ HOME ]
  lastVisitedTab: '/library' | '/suggest' | '/dashboard'
}
```

---

### `TimerState`

Zustand store only — **not persisted to IndexedDB**. Resets to `idle` on page refresh.

```typescript
interface TimerState {
  phase: 'idle' | 'running' | 'paused' | 'finished'
  projectIds: string[]               // [id] for single; [id, id, ...] for combo
  currentProjectIndex: number        // index into projectIds (combo advancement)
  plannedDurationMinutes: number     // total session time
  remainingSeconds: number           // counts down to 0
  startedAt: number | null           // Unix ms, set when timer starts
  comboGroupId: string | null        // shared across combo session records
  skippedProjectIds: string[]        // project IDs skipped mid-combo (logged as 'partial')
  projectElapsedMs: Record<string, number>  // actual ms spent per project ID
}
```

---

## IndexedDB Schema

Database name: `ever-project-db`, version `1`.

| Object Store | Key Path | Indexes | Notes |
|---|---|---|---|
| `projects` | `id` | `isArchived`, `createdAt` | CRUD |
| `sessions` | `id` | `projectId`, `startedAt` | Append-only |
| `settings` | `key` | — | Single record (`"settings"`) |

---

## Zustand Store API

### `projectStore`

```typescript
// State
projects: Project[]

// Actions
addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>
updateProject(id: string, patch: Partial<Project>): Promise<void>
archiveProject(id: string): Promise<void>
deleteProject(id: string): Promise<void>   // hard delete (rare)

// Selectors
getActiveProjects(): Project[]             // isArchived = false, sorted by most recent session startedAt DESC (fallback: createdAt DESC)
getProjectById(id: string): Project | undefined
```

### `sessionStore`

```typescript
// State
sessions: Session[]

// Actions
addSession(data: Omit<Session, 'id'>): Promise<void>
updateSession(id: string, patch: Pick<Session, 'outcome' | 'notes'>): Promise<void>  // outcome + notes only

// Selectors
getTotalSessionCount(): number             // non-abandoned sessions
getTotalMinutes(): number                  // sum of actualDurationMinutes
getCurrentStreak(): number                 // consecutive days with ≥ 1 session
getDailyActivity(days: number): DailyActivity[]   // [{ date: string, count: number }]
getProjectTotals(): ProjectTotal[]         // [{ projectId, totalMinutes, sessionCount }]
getSessionsForDay(date: string): Session[] // YYYY-MM-DD → sessions that day (for notes display)
getSessionsForHistory(filterProjectId?: string): Session[]  // all sessions DESC, optionally filtered by project
getLastSessionForProject(projectId: string): Session | undefined
```

### `timerStore`

```typescript
// State (TimerState, see above)

// Actions
startTimer(projectIds: string[], totalMinutes: number, comboGroupId?: string): void
pauseTimer(): void
resumeTimer(): void
tickTimer(): void                          // called every second by useTimer hook
advanceCombo(): void                       // move to next project in combo (natural finish)
skipProject(): void                        // skip current project mid-combo (logs as 'partial')
finishTimer(): void
resetTimer(): void
```

---

## Algorithm Types

### `SuggestionContext`

Input to `suggestProject()` and `suggestCombos()`.

```typescript
interface SuggestionContext {
  projects: Project[]        // active (non-archived) projects
  sessions: Session[]        // all sessions (for recency/frequency scoring)
  availableMinutes: number   // user's chosen time block
  seed: number               // incremented on "Roll Again" for different random picks
}
```

### `ComboSuggestion`

Returned by `suggestCombos()`.

```typescript
interface ComboSuggestion {
  projects: Project[]        // 2–4 projects in order
  totalMinutes: number       // sum of estimatedDurationMinutes
  slackMinutes: number       // availableMinutes - totalMinutes
  score: number              // avgProjectScore × (1 - slack/available)
}
```

### `DailyActivity` / `ProjectTotal`

Used by the Dashboard.

```typescript
interface DailyActivity {
  date: string               // YYYY-MM-DD
  count: number              // number of sessions that day
  sessions: Session[]        // full session records (for notes display on tap)
}

interface ProjectTotal {
  projectId: string
  project: Project           // resolved reference (or tombstone if deleted)
  totalMinutes: number
  sessionCount: number
}
```

---

## Router State Payloads

State passed between routes via React Router `state` prop (not URL params — avoids leaking in history).

| From | To | State Shape |
|---|---|---|
| `/library` | `/timer` | `{ projectIds: [string], totalMinutes: number }` |
| `/suggest` | `/timer` | `{ projectIds: [string], totalMinutes: number }` |
| `/suggest` | `/combo` | URL param: `/combo?minutes=N` (not router state — survives back navigation) |
| `/combo` | `/timer` | `{ projectIds: string[], totalMinutes: number, comboGroupId: string }` |
| `/timer` | `/complete` | `{ actualDurationMs: number, projectIds: string[], comboGroupId: string \| null, plannedDurationMinutes: number, outcome: SessionOutcome, skippedProjectIds: string[], projectElapsedMs: Record<string, number> }` |
| Home (`/`) | `/library` | `{ openAddSheet: true }` — auto-opens add-project sheet |

---

## Computed / Derived Values

These are never stored — always computed from raw `sessions` data:

| Value | Source | Used On |
|---|---|---|
| `actualDurationMinutes` | `Math.round(actualDurationMs / 60000)` | Session record write |
| `daysSinceLastSession` | `today - lastSession.startedAt` in days | Suggestion scoring |
| `sessionsLast30Days` | filter sessions by projectId + date range | Suggestion scoring |
| `currentStreak` | count consecutive days backward from today | Dashboard StatsPanel |
| `totalTime` formatted | `getTotalMinutes()` → `"Xh Ym"` via `formatDuration()` | Dashboard StatsPanel |
| `durationFitScore` | `1 - (slack / availableMinutes)` | SuggestionCard health bar |
