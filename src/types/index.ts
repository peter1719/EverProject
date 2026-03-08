// ── Project ────────────────────────────────────────────────────────────────

export type ProjectColor =
  | 'indigo'
  | 'violet'
  | 'pink'
  | 'rose'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'slate'
  | 'stone';

export type LibrarySort = 'date' | 'name' | 'custom';

export interface Project {
  id: string;
  name: string; // max 30 chars
  color: ProjectColor;
  estimatedDurationMinutes: number; // 15 | 30 | 45 | 60 | 90 | 120 | 180
  notes: string; // max 500 chars
  isArchived: boolean;
  createdAt: number; // Unix timestamp ms
  updatedAt: number; // Unix timestamp ms
}

// ── TodoItem ───────────────────────────────────────────────────────────────

export interface TodoItem {
  id: string;
  projectId: string;
  text: string;
  isDone: boolean;
  createdAt: number; // Unix ms
  order?: number;   // custom sort index (0, 1, 2 …); absent = sort by createdAt
}

// ── Session ────────────────────────────────────────────────────────────────

export type SessionOutcome = 'completed' | 'partial' | 'abandoned';

export interface Session {
  id: string;
  projectId: string; // FK → Project.id
  projectName: string; // snapshot of project name at session save time
  projectColor: ProjectColor; // snapshot of project color at session save time
  startedAt: number; // Unix timestamp ms
  endedAt: number; // Unix timestamp ms
  plannedDurationMinutes: number;
  actualDurationMinutes: number; // Math.round(actualDurationMs / 60000)
  outcome: SessionOutcome;
  notes: string; // max 500 chars
  hasImage?: boolean; // true if a photo is stored in sessionImages IDB store
  wasCombo: boolean;
  comboGroupId: string | null;
}

// ── Settings ───────────────────────────────────────────────────────────────

export type AppTheme = 'system' | 'light' | 'dark';
export type AppLanguage = 'en' | 'zh-TW';

export interface AppSettings {
  lastVisitedTab: '/library' | '/suggest' | '/dashboard';
  customOrderIds?: string[];
  theme?: AppTheme;
  language?: AppLanguage;
}

// ── Timer (ephemeral — NOT persisted) ─────────────────────────────────────

export interface TimerState {
  phase: 'idle' | 'running' | 'paused' | 'finished';
  projectIds: string[]; // [id] for single; [id, id, ...] for combo
  currentProjectIndex: number; // index into projectIds
  plannedDurationMinutes: number; // total session time
  remainingSeconds: number; // counts down to 0
  startedAt: number | null; // Unix ms, set when timer starts
  comboGroupId: string | null;
  skippedProjectIds: string[]; // project IDs skipped mid-combo (logged as 'partial')
  projectElapsedMs: Record<string, number>; // actual ms spent per project ID
  projectAllocatedMinutes: Record<string, number>; // override duration per project (for partial combos)
}

// ── Timer Draft (persisted to IDB for crash recovery) ─────────────────────

export interface TimerDraft {
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

// ── Algorithms ────────────────────────────────────────────────────────────

export interface SuggestionContext {
  readonly projects: readonly Project[];
  readonly sessions: readonly Session[];
  readonly availableMinutes: number;
  readonly seed: number;
  /** Project ID to exclude from the pick (Roll Again — avoid repeating the same result). */
  readonly excludeId?: string;
}

export interface ComboSuggestion {
  projects: Project[];
  projectMinutes: number[]; // allocated minutes per project (< estimatedDurationMinutes for partial)
  totalMinutes: number; // sum of projectMinutes
  slackMinutes: number; // availableMinutes - totalMinutes (0 for partial combos)
  score: number; // avgProjectScore × (1 - slack/available)
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  count: number; // number of sessions that day
  sessions: Session[];
}

export interface ProjectTotal {
  projectId: string;
  project: Project; // resolved reference
  totalMinutes: number;
  sessionCount: number;
}

// ── Router State Payloads ─────────────────────────────────────────────────

export interface TimerRouterState {
  projectIds: string[];
  totalMinutes: number;
  comboGroupId?: string;
  projectAllocatedMinutes?: Record<string, number>; // per-project override (partial combos)
  origin?: string; // page to return to on quit (e.g. '/library', '/suggest')
}

export interface CompleteRouterState {
  actualDurationMs: number;
  projectIds: string[];
  comboGroupId: string | null;
  plannedDurationMinutes: number;
  outcome: SessionOutcome;
  skippedProjectIds: string[];
  projectElapsedMs: Record<string, number>;
}
