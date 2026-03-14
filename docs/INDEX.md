# EverProject Docs Index

> Read this file first. It tells you which doc to load for any given task — no need to read everything.

## Task → File Map

| Task | File |
|------|------|
| TypeScript types / IDB schema / Store API / Router payload | `02-data-model.md` |
| UI styling / color tokens / buttons / cards / animations | `03-design-system.md` |
| Understanding a page's purpose or behavior | `01-pages.md` |
| Suggestion or combo algorithm details | `05-algorithms.md` |
| Naming / TypeScript / Tailwind code style | `04-coding-style.md` |
| Routing / architecture / state management / PWA | `00-architecture.md` |
| Writing tests / test strategy | `06-test-plan.md` |

## File Summaries

| File | Contents |
|------|----------|
| `00-architecture.md` | Tech stack, project structure, routing, store hydration, PWA |
| `01-pages.md` | All 9 routes: purpose, behaviors, nav rules, router state payloads |
| `02-data-model.md` | All TS interfaces, IDB schema v6, Zustand store APIs |
| `03-design-system.md` | MD3 tokens (4 app styles), typography, component patterns |
| `04-coding-style.md` | Naming, TS, React, Zustand, Tailwind rules with examples |
| `05-algorithms.md` | Suggestion scoring (62.5%/37.5%), combo generation, partial combos |
| `06-test-plan.md` | Test strategy, layers, file locations, coverage targets |

---

## Always-Apply Critical Rules

### Color classes — never interpolate
```typescript
// ✓ Use static lookup map (COLOR_BG_MAP in src/lib/constants.ts)
<div className={COLOR_BG_MAP[project.color]} />
// ✗ NEVER — Tailwind purge cannot detect this
<div className={`bg-${project.color}-500`} />
```

### Zustand — subscribe to slices, not the whole store
```typescript
const projects = useProjectStore(s => s.projects); // ✓
const store = useProjectStore(); // ✗ re-renders on every store change
```

### `as` assertions — only at system boundaries
```typescript
const project = (await db.get('projects', id)) as Project; // ✓ IDB boundary
const state = location.state as TimerRouterState;          // ✓ router boundary
const score = calc() as number;                            // ✗ business logic
```

### MD3 button variants (copy-paste these)
```typescript
const btnFilled   = 'bg-primary text-on-primary rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
const btnTonal    = 'bg-primary-container text-on-primary-container rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
const btnOutlined = 'border border-outline text-primary bg-transparent rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
```

### getActiveProjects — requires sessions argument
```typescript
const sessions = useSessionStore(s => s.sessions);
const projects = useProjectStore(s => s.getActiveProjects(sessions));
```

### Session append-only rule
- `addSession` only — never edit time fields
- `updateSession` only allows `outcome`, `notes`, `hasImage`
- `deleteSession` is the only explicit delete (also removes the corresponding image)
