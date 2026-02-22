# Coding Style Guide

Based on the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), adapted for this project's stack.

---

## 1. General Principles

- **Clarity over cleverness** — write code that is obvious to a reader, not impressive to the author
- **Single responsibility** — one function does one thing; one file exports one component
- **Pure functions preferred** — especially in `src/algorithms/`; no side effects, same input → same output
- **Explicit over implicit** — prefer being verbose and clear over short and ambiguous
- **No premature abstraction** — don't create helpers until the pattern repeats 3+ times

---

## 2. File & Folder Naming

| Thing | Convention | Example |
|---|---|---|
| Component folder | `PascalCase/` | `ProjectCard/` |
| Component file | `index.tsx` inside folder, or `PascalCase.tsx` | `ProjectCard/index.tsx` |
| Hook file | `camelCase.ts` prefixed with `use` | `useTimer.ts` |
| Store file | `camelCase.ts` suffixed with `Store` | `projectStore.ts` |
| Utility file | `camelCase.ts` | `formatDuration.ts` |
| Algorithm file | `camelCase.ts` | `suggestion.ts`, `combo.ts` |
| Type file | `camelCase.ts` or `index.ts` | `src/types/index.ts` |
| Page folder | `PascalCase/` | `ProjectLibrary/`, `PomodoroTimer/` |
| CSS/style file | same name as component | `ProjectCard.css` (only if not using Tailwind) |

```
// ✓ Good
src/components/shared/ProjectCard/index.tsx
src/hooks/useTimer.ts
src/store/projectStore.ts
src/algorithms/suggestion.ts
src/pages/ProjectLibrary/index.tsx

// ✗ Bad
src/components/project_card.tsx
src/hooks/Timer.ts
src/store/Projects.ts
```

---

## 3. Naming Conventions

### Variables & Functions
`camelCase`. Descriptive — avoid single letters except loop counters (`i`, `j`).

```typescript
// ✓ Good
const availableMinutes = 45;
const lastSessionDate = getLastSessionForProject(projectId);
function calculateDurationFitScore(slack: number, available: number): number {}

// ✗ Bad
const am = 45;
const d = getLastSession(id);
function calc(s: number, a: number): number {}
```

### Boolean Variables
Prefix with `is`, `has`, `can`, `should`.

```typescript
// ✓ Good
const isArchived = project.isArchived;
const hasActiveSessions = sessions.length > 0;
const canSkip = projectIds.length > 1 && currentIndex < projectIds.length - 1;

// ✗ Bad
const archived = project.isArchived;
const activeSessions = sessions.length > 0;
```

### Constants
`UPPER_SNAKE_CASE` for module-level constants. `camelCase` for local constants inside functions.

```typescript
// ✓ Good — module-level
export const DB_NAME = 'ever-project-db';
export const MAX_PROJECT_NAME_LENGTH = 30;
export const COLOR_PALETTE: ProjectColor[] = ['indigo', 'violet', ...];

// ✓ Good — local constant inside function
function suggestProject(context: SuggestionContext): Project | null {
  const recencyWeight = 0.5;
  const frequencyWeight = 0.3;
}

// ✗ Bad
export const dbName = 'ever-project-db';
const RECENCY_WEIGHT = 0.5; // inside function — too heavy
```

### Types, Interfaces, Enums
`PascalCase`.

```typescript
// ✓ Good
interface Project {}
interface SuggestionContext {}
type ProjectColor = 'indigo' | 'violet';
type SessionOutcome = 'completed' | 'partial' | 'abandoned';

// ✗ Bad
interface project {}
type projectColor = 'indigo' | 'violet';
```

### React Components
`PascalCase`. Match the file/folder name exactly.

```typescript
// ✓ Good — file: ProjectCard/index.tsx
export function ProjectCard({ project }: ProjectCardProps) {}

// ✗ Bad — file: ProjectCard/index.tsx
export function projectCard({ project }: ProjectCardProps) {}
export function Card({ project }: ProjectCardProps) {} // name doesn't match file
```

### Event Handlers
Prefix with `handle` in the component, `on` in props.

```typescript
// ✓ Good
interface ProjectCardProps {
  onStart: (projectId: string) => void;
  onArchive: (projectId: string) => void;
}

function ProjectCard({ onStart, onArchive }: ProjectCardProps) {
  function handleStartClick() {
    onStart(project.id);
  }
}

// ✗ Bad
interface ProjectCardProps {
  startProject: (id: string) => void;
}
function ProjectCard({ startProject }: ProjectCardProps) {
  function clickStart() { startProject(project.id); }
}
```

---

## 4. TypeScript

### No `any`
Use `unknown` if the type is genuinely unknown. Use proper types or generics otherwise.

```typescript
// ✓ Good
function parseRouterState(state: unknown): TimerRouterState {
  if (!state || typeof state !== 'object') throw new Error('Invalid state');
  return state as TimerRouterState; // one assertion, at the boundary
}

// ✗ Bad
function parseRouterState(state: any): any {
  return state;
}
```

### `interface` for Object Shapes, `type` for Unions/Aliases

```typescript
// ✓ Good
interface Project {
  id: string;
  name: string;
}

type SessionOutcome = 'completed' | 'partial' | 'abandoned';
type ProjectColor = 'indigo' | 'violet' | 'pink'; // union

// ✗ Bad
type Project = {         // use interface for object shapes
  id: string;
  name: string;
};

interface SessionOutcome {} // don't use interface for a union
```

### Explicit Return Types on Public Functions
Required on exported functions. Optional on local/inline ones.

```typescript
// ✓ Good — exported algorithm function
export function suggestProject(context: SuggestionContext): Project | null {}

// ✓ Good — exported store action
export function addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {}

// ✓ Fine — local arrow function, type is obvious
const doubled = numbers.map(n => n * 2);

// ✗ Bad — exported function missing return type
export function suggestProject(context: SuggestionContext) {}
```

### `readonly` on Props and Pure Data

```typescript
// ✓ Good
interface ProjectCardProps {
  readonly project: Project;
  readonly onStart: (id: string) => void;
}

// ✓ Good — algorithm input
interface SuggestionContext {
  readonly projects: readonly Project[];
  readonly sessions: readonly Session[];
  readonly availableMinutes: number;
  readonly seed: number;
}
```

### Avoid `as` Assertions Except at System Boundaries
Type assertions hide bugs. Only use them when reading external data (IndexedDB, router state).

```typescript
// ✓ Good — at IDB read boundary
const project = (await db.get('projects', id)) as Project;

// ✗ Bad — in business logic
const score = calculateScore(project) as number; // just type it correctly
```

### Prefer `const` — Never `var`

```typescript
// ✓ Good
const projects = useProjectStore(s => s.projects);
let remainingSeconds = totalMinutes * 60; // mutable — use let

// ✗ Bad
var projects = useProjectStore(s => s.projects);
```

### Optional Chaining & Nullish Coalescing

```typescript
// ✓ Good
const lastDate = lastSession?.startedAt ?? null;
const name = project?.name ?? 'DELETED PROJECT';

// ✗ Bad
const lastDate = lastSession && lastSession.startedAt ? lastSession.startedAt : null;
```

---

## 5. React Components

### File Structure
Every component file follows this order:

```typescript
// 1. External imports
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal imports (stores, hooks, utils)
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';

// 3. Type imports
import type { Project } from '@/types';

// 4. Props interface
interface ProjectCardProps {
  readonly project: Project;
  readonly onStart: (id: string) => void;
}

// 5. Component
export function ProjectCard({ project, onStart }: ProjectCardProps) {
  // hooks first
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // derived values
  const durationLabel = `~${project.estimatedDurationMinutes} MIN`;

  // handlers
  function handleStartClick() {
    onStart(project.id);
  }

  // render
  return (
    <div>...</div>
  );
}
```

### One Component Per File
Do not define multiple exported components in the same file.

```typescript
// ✓ Good — separate files
// ProjectCard/index.tsx   → exports ProjectCard
// ProjectForm/index.tsx   → exports ProjectForm

// ✗ Bad — same file
export function ProjectCard() {}
export function ProjectForm() {} // move to its own file
```

### No Inline Object/Array Props
Inline objects create new references every render.

```typescript
// ✓ Good
const SEGMENT_OPTIONS = [15, 30, 45, 60, 90, 120, 180];
<TimeInput options={SEGMENT_OPTIONS} />

// ✗ Bad
<TimeInput options={[15, 30, 45, 60, 90, 120, 180]} />
```

### Fragment Shorthand

```typescript
// ✓ Good
return (
  <>
    <Header />
    <Content />
  </>
);

// ✗ Bad
return (
  <React.Fragment>
    <Header />
    <Content />
  </React.Fragment>
);
```

---

## 6. Hooks

### `use` Prefix, Single Responsibility

```typescript
// ✓ Good — focused hook
export function useTimer(): UseTimerReturn {}
export function useHydration(): boolean {}
export function usePWAInstall(): UsePWAInstallReturn {}

// ✗ Bad — too broad
export function useApp() {} // does everything
```

### Return an Object (Not a Tuple) When Returning Multiple Values

```typescript
// ✓ Good
export function useTimer() {
  return { phase, remainingSeconds, pause, resume, skip };
}

// ✓ OK for simple two-value pairs (mirrors useState convention)
export function useToggle(initial: boolean): [boolean, () => void] {}

// ✗ Bad — tuple with 4+ items is unreadable
return [phase, remainingSeconds, pause, resume, skip];
```

### No Side Effects Directly in Hook Body
Use `useEffect` for side effects.

```typescript
// ✓ Good
export function useTimer() {
  useEffect(() => {
    navigator.wakeLock.request('screen');
    return () => { /* cleanup */ };
  }, [phase]);
}

// ✗ Bad
export function useTimer() {
  navigator.wakeLock.request('screen'); // runs every render
}
```

---

## 7. Zustand Stores

### Store File Structure

```typescript
// 1. Imports
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Project } from '@/types';

// 2. State interface
interface ProjectState {
  projects: Project[];
}

// 3. Actions interface
interface ProjectActions {
  addProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<void>;
  updateProject(id: string, patch: Partial<Project>): Promise<void>;
  archiveProject(id: string): Promise<void>;
}

// 4. Selectors interface
interface ProjectSelectors {
  getActiveProjects(): Project[];
  getProjectById(id: string): Project | undefined;
}

// 5. Store
export const useProjectStore = create<ProjectState & ProjectActions & ProjectSelectors>()(
  immer((set, get) => ({
    // state
    projects: [],

    // actions
    async addProject(data) {
      // ...
    },

    // selectors
    getActiveProjects() {
      return get().projects.filter(p => !p.isArchived);
    },
  }))
);
```

### Never Mutate State Outside of Actions

```typescript
// ✓ Good — mutation inside action, using Immer
async addProject(data) {
  const project: Project = { id: crypto.randomUUID(), ...data, createdAt: Date.now(), updatedAt: Date.now() };
  set(state => { state.projects.push(project); });
  await db.put('projects', project);
}

// ✗ Bad — mutating from a component
const store = useProjectStore.getState();
store.projects.push(newProject); // bypasses Immer, breaks reactivity
```

### Subscribe to Slices, Not Whole Store

```typescript
// ✓ Good — only re-renders when projects change
const projects = useProjectStore(s => s.projects);

// ✗ Bad — re-renders on any store change
const store = useProjectStore();
```

---

## 8. Import Order

Enforce with ESLint `import/order`. Four groups, each separated by a blank line:

```typescript
// 1. External libraries
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';

// 2. Internal aliases (@/)
import { useProjectStore } from '@/store/projectStore';
import { useTimer } from '@/hooks/useTimer';
import { cn, formatDuration } from '@/lib/utils';

// 3. Relative imports
import { ProjectCard } from './ProjectCard';
import { EmptyState } from '../shared/EmptyState';

// 4. Type-only imports (last)
import type { Project, Session } from '@/types';
```

---

## 9. CSS / Tailwind

### No Dynamic Class String Interpolation
Tailwind's purge cannot detect dynamically constructed strings.

```typescript
// ✓ Good — use a lookup map
const COLOR_CLASS_MAP: Record<ProjectColor, string> = {
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  green:  'bg-green-500',
  // ...
};
<div className={COLOR_CLASS_MAP[project.color]} />

// ✗ Bad — Tailwind cannot purge this
<div className={`bg-${project.color}-500`} />
```

### Use `cn()` for Conditional Classes

```typescript
// ✓ Good
import { cn } from '@/lib/utils'; // cn = clsx + tailwind-merge

<button
  className={cn(
    'border-2 border-black px-4 py-2',
    isSelected && 'bg-indigo-500 text-white',
    isDisabled && 'opacity-40 cursor-not-allowed',
  )}
/>

// ✗ Bad
<button className={`border-2 border-black px-4 py-2 ${isSelected ? 'bg-indigo-500 text-white' : ''}`} />
```

### Button Variants
Use MD3 button variants consistently via `cn()`. Never mix variant styles.

```typescript
// ✓ Good — named variant constants, compose with cn()
const btnFilled   = 'bg-primary text-on-primary rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
const btnTonal    = 'bg-primary-container text-on-primary-container rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
const btnOutlined = 'border border-outline text-primary bg-transparent rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';

<button className={cn(btnFilled, isDisabled && 'opacity-38 pointer-events-none')} />

// ✗ Wrong — never hard-code pixel offset shadows on buttons
const pixelButton = 'shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1';
```

---

## 10. Comments

### JSDoc for Public Store APIs and Algorithm Functions

```typescript
/**
 * Suggests a single project for the user's available time block.
 * Uses weighted scoring: recency (50%), frequency (30%), duration fit (20%).
 *
 * @param context - Projects, sessions, available time, and random seed
 * @returns The suggested Project, or null if no project fits the available time
 */
export function suggestProject(context: SuggestionContext): Project | null {}
```

### Inline Comments for Non-Obvious Logic Only

```typescript
// ✓ Good — explains the why
// Cap at 1.0: projects never done should score maximum on recency
const recencyScore = Math.min(daysSince / 14, 1.0);

// Weighted random pick: walk cumulative distribution to avoid sorting
let cursor = Math.random() * totalWeight;
for (const { project, weight } of scored) {
  cursor -= weight;
  if (cursor <= 0) return project;
}

// ✗ Bad — states the obvious
// Add project to array
state.projects.push(project);

// ✗ Bad — commented-out code (delete it, use git)
// const oldScore = daysSince / 7;
```

### TODO Format

```typescript
// TODO(username): replace with proper error boundary once React 19 stable
// TODO: handle case where all projects are archived
```

---

## 11. Formatting (Prettier)

Config file: `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

Key rules:
- **2 spaces** — no tabs
- **Single quotes** for strings (`'hello'` not `"hello"`)
- **Semicolons** required
- **100 character** line width (wider than Google's 80 — accommodates JSX and TypeScript generics)
- **Trailing commas** in multi-line structures (cleaner git diffs)
- **Arrow function parens omitted** for single params: `n => n * 2` not `(n) => n * 2`

---

## 12. Linting (ESLint)

Config file: `eslint.config.js`

Key rules enforced:

| Rule | Setting | Reason |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | `error` | No `any` |
| `@typescript-eslint/explicit-module-boundary-types` | `error` | Explicit return types on exports |
| `@typescript-eslint/no-non-null-assertion` | `warn` | Avoid `!` assertions |
| `react-hooks/rules-of-hooks` | `error` | Hooks only at top level |
| `react-hooks/exhaustive-deps` | `warn` | Correct `useEffect` deps |
| `import/order` | `error` | Enforces the 4-group import order |
| `no-var` | `error` | No `var` |
| `prefer-const` | `error` | `const` by default |
| `no-console` | `warn` | No leftover `console.log` |
| `eqeqeq` | `error` | Always `===` not `==` |

---

## Quick Reference Cheatsheet

```
Variables/functions     camelCase
Booleans                isX / hasX / canX / shouldX
Constants (module)      UPPER_SNAKE_CASE
Types / Interfaces      PascalCase
Components              PascalCase
Files                   kebab-case (utils) or PascalCase (components/pages)
Props interface         ComponentNameProps
Event handler prop      onX
Event handler method    handleX

No any                  use unknown at boundaries, then narrow
No var                  const by default, let when mutable
No dynamic Tailwind     use lookup maps
No inline object props  define outside JSX
Imports order           external → internal (@/) → relative → types
```
