# Data Model

All data is stored locally on the device — no server, no accounts.

---

## TypeScript Interfaces (`src/types/index.ts`)

### `Project`
```typescript
interface Project {
  id: string;                        // crypto.randomUUID()
  name: string;                      // max 30 chars
  color: ProjectColor;
  estimatedDurationMinutes: number;  // 15|30|45|60|90|120|180|999 — per-session target
  projectDurationMinutes: number;    // total planned duration; 0 = no limit (PROJECT_DURATION_NO_LIMIT)
  notes: string;                     // max 500 chars
  isArchived: boolean;
  createdAt: number;                 // Unix ms
  updatedAt: number;                 // Unix ms
}
```

### `ProjectColor` (15 colors)
```typescript
type ProjectColor =
  'indigo' | 'violet' | 'pink' | 'rose' | 'red' | 'orange' |
  'amber' | 'yellow' | 'lime' | 'green' | 'teal' | 'cyan' |
  'sky' | 'slate' | 'stone';
```
Color lookup maps: `COLOR_BG_MAP` (Tailwind bg class), `COLOR_HEX_MAP` (raw hex) — both in `src/lib/constants.ts`.

### `LibrarySort`
```typescript
type LibrarySort = 'date' | 'name' | 'custom';
```

### `TodoItem`
```typescript
interface TodoItem {
  id: string;
  projectId: string;         // FK → Project.id
  text: string;
  isDone: boolean;
  createdAt: number;         // Unix ms
  order?: number;            // custom sort index; absent = sort by createdAt
}
```

### `Session`
```typescript
interface Session {
  id: string;
  projectId: string;                 // FK → Project.id
  projectName: string;               // snapshot of project name at save time
  projectColor: ProjectColor;        // snapshot of project color at save time
  startedAt: number;                 // Unix ms
  endedAt: number;                   // Unix ms
  plannedDurationMinutes: number;
  actualDurationMinutes: number;     // Math.round(actualDurationMs / 60000)
  outcome: SessionOutcome;
  notes: string;                     // max 500 chars
  hasImage?: boolean;                // true = a photo exists in sessionImages IDB store
  wasCombo: boolean;
  comboGroupId: string | null;
}

type SessionOutcome = 'completed' | 'partial' | 'abandoned';
```

### `AppSettings`
```typescript
type AppTheme    = 'system' | 'light' | 'dark';
type AppLanguage = 'en' | 'zh-TW';
type AppStyle    = 'classic' | 'pixel' | 'paper' | 'zen';

interface AppSettings {
  lastVisitedTab: '/library' | '/suggest' | '/dashboard';
  customOrderIds?: string[];         // project ID order for Library custom sort
  theme?: AppTheme;                  // default: 'system'
  language?: AppLanguage;            // default: 'en'
  appStyle?: AppStyle;               // default: 'classic'
}
```

### `TimerState` (ephemeral — NOT persisted, resets on reload)
```typescript
interface TimerState {
  phase: 'idle' | 'running' | 'paused' | 'finished';
  projectIds: string[];
  currentProjectIndex: number;
  plannedDurationMinutes: number;
  remainingSeconds: number;
  startedAt: number | null;
  comboGroupId: string | null;
  skippedProjectIds: string[];
  projectElapsedMs: Record<string, number>;
  projectAllocatedMinutes: Record<string, number>; // per-project duration override for partial combos
}
```

### `TimerDraft` (IDB-persisted — crash recovery)
```typescript
interface TimerDraft {
  key: 'timer_draft';
  phase: 'running' | 'paused';
  projectIds: string[];
  currentProjectIndex: number;
  plannedDurationMinutes: number;
  remainingSeconds: number;
  startedAt: number | null;
  comboGroupId: string | null;
  skippedProjectIds: string[];
  projectElapsedMs: Record<string, number>;
  projectAllocatedMinutes: Record<string, number>;
}
```

### Algorithm Types
```typescript
interface SuggestionContext {
  readonly projects: readonly Project[];
  readonly sessions: readonly Session[];
  readonly availableMinutes: number;
  readonly seed: number;
  readonly excludeId?: string;  // Roll Again: exclude the previously shown project
}

interface ComboSuggestion {
  projects: Project[];
  projectMinutes: number[];    // allocated minutes per project (< estimatedDurationMinutes for partial)
  totalMinutes: number;
  slackMinutes: number;        // availableMinutes - totalMinutes (0 for partial combos)
  score: number;               // avgProjectScore × (1 - slack/available)
}

interface DailyActivity {
  date: string;                // YYYY-MM-DD
  count: number;
  sessions: Session[];
}

interface ProjectTotal {
  projectId: string;
  project: Project;            // deleted projects show tombstone (name: '[DELETED]')
  totalMinutes: number;
  sessionCount: number;
}
```

---

## IndexedDB Schema (`ever-project-db` v6)

| Object Store | Key | Indexes | Notes |
|---|---|---|---|
| `projects` | `id` | `isArchived`, `createdAt` | CRUD |
| `sessions` | `id` | `projectId`, `startedAt` | Append-only (`deleteSession` is the exception) |
| `settings` | `key` | — | Single record (key = `"settings"`) |
| `sessionImages` | `sessionId` | — | JPEG dataUrl; corresponds to session `hasImage` flag |
| `todos` | `id` | `projectId` | Per-project todo items |
| `timerDraft` | `key` | — | Single record (key = `"timer_draft"`), crash recovery |

---

## Zustand Store APIs

### `projectStore` (`src/store/projectStore.ts`)
```typescript
// State
projects: Project[]
isHydrated: boolean

// Actions
hydrate(): Promise<void>
addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>
updateProject(id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void>
archiveProject(id: string): Promise<void>
unarchiveProject(id: string): Promise<void>
deleteProject(id: string): Promise<void>

// Selectors
getActiveProjects(sessions: Session[]): Project[]  // requires sessions to sort by recency
getProjectById(id: string): Project | undefined
```

### `sessionStore` (`src/store/sessionStore.ts`)
```typescript
// State
sessions: Session[]
isHydrated: boolean
imageVersions: Record<string, number>  // bumped on image write/delete to trigger re-fetch

// Actions
hydrate(): Promise<void>
addSession(data: Omit<Session, 'id'>): Promise<string>  // returns session id
updateSession(id: string, patch: Pick<Session, 'outcome' | 'notes'> & { hasImage?: boolean }): Promise<void>
putSessionImage(sessionId: string, dataUrl: string): Promise<void>
removeSessionImage(sessionId: string): Promise<void>
deleteSession(id: string): Promise<void>  // also deletes sessionImages entry

// Selectors
getTotalSessionCount(): number                          // non-abandoned sessions
getTotalMinutes(): number                               // sum of actualDurationMinutes (non-abandoned)
getCurrentStreak(): number                              // consecutive days with ≥1 session, from today back
getDailyActivity(days: number): DailyActivity[]         // heatmap data
getProjectTotals(projects: Project[]): ProjectTotal[]   // sorted by totalMinutes DESC
getSessionsForDay(date: string): Session[]              // YYYY-MM-DD
getSessionsForHistory(filterProjectId?: string): Session[]  // all sessions DESC, optional project filter
getLastSessionForProject(projectId: string): Session | undefined
```

### `timerStore` (`src/store/timerStore.ts`)
```typescript
// State: TimerState (see interface above)

// Actions
startTimer(projectIds, totalMinutes, comboGroupId?, projectAllocatedMinutes?): void
pauseTimer(): void
resumeTimer(): void
tickTimer(): void                          // called every second by useTimer hook
advanceCombo(): void                       // move to next project on natural finish
skipProject(): void                        // skip current project (logged as partial)
finishTimer(): void
resetTimer(): void
recordProjectElapsed(projectId, elapsedMs): void
restoreTimer(draft: TimerDraft): void      // crash recovery
```

### `settingsStore` (`src/store/settingsStore.ts`)
```typescript
// State
settings: AppSettings
customOrderIds: string[]
isHydrated: boolean

// Actions
hydrate(): Promise<void>
setLastVisitedTab(tab): Promise<void>
setCustomOrder(ids: string[]): Promise<void>
setTheme(theme: AppTheme): Promise<void>
setLanguage(lang: AppLanguage): Promise<void>
setAppStyle(style: AppStyle): Promise<void>
```

### `todoStore` (`src/store/todoStore.ts`)
```typescript
// State
todos: TodoItem[]

// Actions (all ops write to IDB synchronously)
loadTodos(projectId: string): Promise<void>  // on-demand load, not global hydrate
addTodo(projectId, text): Promise<void>
updateTodo(id, text): Promise<void>
toggleTodo(id): Promise<void>
deleteTodo(id): Promise<void>
reorderTodos(orderedIds: string[]): Promise<void>
hydrate(): Promise<void>                     // clears in-memory state after import
```

---

## Constants (`src/lib/constants.ts`)

```typescript
DB_NAME = 'ever-project-db'
DB_VERSION = 6
PROJECT_DURATION_NO_LIMIT = 0      // sentinel for "no total duration limit"
PROJECT_DURATION_DEFAULT_MINUTES = 180  // migration default for legacy projects
MAX_PROJECT_NAME_LENGTH = 30
MAX_NOTES_LENGTH = 500
DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 999]  // 999 = OPEN_DURATION (open-ended)
```
