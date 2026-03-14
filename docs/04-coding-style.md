# Coding Style Guide

Based on the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html), adapted for this stack.

---

## Quick Reference Cheatsheet

```
Variables / functions       camelCase
Booleans                    isX / hasX / canX / shouldX
Module-level constants      UPPER_SNAKE_CASE
Local constants in fns      camelCase
Types / Interfaces          PascalCase
Components                  PascalCase (matches filename)
Props interface             ComponentNameProps
Event handler prop          onX
Event handler method        handleX

No any                      use unknown + narrow, or as (system boundaries only)
No var                      prefer const; use let only when mutable
No dynamic Tailwind         use lookup maps (COLOR_BG_MAP)
No inline object props      define outside JSX
Import order                external → internal(@/) → relative → type-only
```

---

## 1. Naming

```typescript
// ✓ Variables / functions — camelCase, descriptive
const availableMinutes = 45;
function calculateDurationFitScore(slack: number, available: number): number {}

// ✓ Booleans — prefix
const isArchived = project.isArchived;
const hasActiveSessions = sessions.length > 0;

// ✓ Module-level constants — UPPER_SNAKE_CASE
export const DB_NAME = 'ever-project-db';

// ✓ Event handlers
interface ProjectCardProps { onStart: (id: string) => void; }
function handleStartClick() { onStart(project.id); }
```

---

## 2. TypeScript

```typescript
// ✓ interface for object shapes; type for unions/aliases
interface Project { id: string; name: string; }
type SessionOutcome = 'completed' | 'partial' | 'abandoned';

// ✓ readonly on props and pure data inputs
interface SuggestionContext {
  readonly projects: readonly Project[];
  readonly availableMinutes: number;
}

// ✓ as assertions only at system boundaries
const project = (await db.get('projects', id)) as Project; // ✓ IDB
const state = location.state as TimerRouterState;          // ✓ router
const score = calc() as number;                            // ✗ business logic

// ✓ Explicit return types on all exported functions
export function suggestProject(context: SuggestionContext): Project | null {}

// ✓ Optional chaining + nullish coalescing
const name = project?.name ?? 'DELETED PROJECT';
```

---

## 3. React Components

```typescript
// ✓ One exported component per file; structure order:
// 1. external imports → 2. internal imports → 3. type imports → 4. Props interface → 5. Component

export function ProjectCard({ project, onStart }: ProjectCardProps) {
  // hooks first
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // derived values
  const label = `~${project.estimatedDurationMinutes} MIN`;

  // handlers
  function handleStartClick() { onStart(project.id); }

  // render
  return <div>...</div>;
}

// ✓ No inline object/array props (creates new references every render)
const OPTIONS = [15, 30, 45, 60];
<TimeInput options={OPTIONS} />  // ✓
<TimeInput options={[15, 30, 45, 60]} />  // ✗
```

---

## 4. Hooks

```typescript
// ✓ use prefix, single responsibility
export function useTimer(): UseTimerReturn {}

// ✓ Return an object for multiple values (not a tuple with 4+ items)
return { phase, remainingSeconds, pause, resume };

// ✓ Side effects go in useEffect
useEffect(() => {
  navigator.wakeLock.request('screen');
  return () => { /* cleanup */ };
}, [phase]);
```

---

## 5. Zustand Stores

```typescript
// ✓ Subscribe to slices, not the whole store
const projects = useProjectStore(s => s.projects); // ✓
const store = useProjectStore(); // ✗

// ✓ Mutate state only inside actions with Immer
set(state => { state.projects.push(project); }); // ✓
store.projects.push(newProject); // ✗ bypasses Immer
```

Store file structure order: imports → State interface → Actions interface → Selectors interface → `create()`.

---

## 6. CSS / Tailwind

```typescript
// ✓ Color classes via static lookup map
import { COLOR_BG_MAP } from '@/lib/constants';
<div className={COLOR_BG_MAP[project.color]} />

// ✗ Dynamic interpolation — Tailwind purge cannot detect this
<div className={`bg-${project.color}-500`} />

// ✓ Conditional classes via cn()
import { cn } from '@/lib/utils'; // cn = clsx + tailwind-merge
<button className={cn('border px-4', isSelected && 'bg-primary', isDisabled && 'opacity-40')} />
```

---

## 7. Import Order

```typescript
// 1. External packages
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal aliases (@/)
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';

// 3. Relative imports
import { ProjectCard } from './ProjectCard';

// 4. Type-only imports (last)
import type { Project } from '@/types';
```

---

## 8. Formatting (Prettier)

```json
{ "semi": true, "singleQuote": true, "trailingComma": "all",
  "printWidth": 100, "tabWidth": 2, "arrowParens": "avoid" }
```

Key rules: single quotes, semicolons, 100-char line width, trailing commas, single-param arrow functions omit parens (`n => n * 2`).

---

## 9. Key ESLint Rules

| Rule | Level | Note |
|------|-------|------|
| `@typescript-eslint/no-explicit-any` | error | No `any` |
| `@typescript-eslint/explicit-module-boundary-types` | error | Explicit return types on exports |
| `react-hooks/rules-of-hooks` | error | Hooks at top level only |
| `react-hooks/exhaustive-deps` | warn | Complete useEffect deps |
| `import/order` | error | Enforce 4-group import order |
| `no-var` / `prefer-const` | error | const by default |
| `eqeqeq` | error | Always `===` |
| `no-console` | warn | Remove debug logs |

---

## 10. Comments

```typescript
// ✓ JSDoc on exported store actions and algorithm functions
/**
 * Suggests a single project for the user's available time block.
 * @param context - Projects, sessions, available time, and random seed
 * @returns The suggested Project, or null if no projects exist
 */

// ✓ Inline comments explain the WHY, not the obvious WHAT
// Cap at 1.0: projects never done score maximum on recency

// ✗ Do not leave commented-out code — use git instead
```
