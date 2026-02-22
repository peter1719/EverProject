# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

EverProject — a mobile-first PWA for managing personal projects and staying productive via time-aware suggestions, a Pomodoro timer, and activity tracking. Clean Material Design 3 aesthetic throughout.

All docs live in `docs/`. Read them before changing anything they describe:
- `docs/00-overview.md` — pages, user flow, navigation, data architecture
- `docs/00a-home-screen.md` — home screen + **full Material Design 3 design system** (colors, typography, cards, buttons, animations)
- `docs/07-data-model.md` — TypeScript interfaces, IDB schema, Zustand store APIs, router state payloads
- `docs/09-coding-style.md` — naming conventions, TypeScript rules, Tailwind patterns, Prettier/ESLint config

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Routing | React Router DOM v7 (`createBrowserRouter`) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| State | Zustand v5 + Immer |
| Persistence | IndexedDB via `idb` v8 |
| PWA | vite-plugin-pwa + Workbox v7 (`injectManifest` strategy) |
| Forms | React Hook Form v7 + Zod v4 |

---

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Serve production build (for PWA/offline testing)
npm run lint      # ESLint check
npm run test      # Vitest (unit tests for algorithms)
```

For Lighthouse PWA audit:
```bash
npm run build && npx lighthouse http://localhost:4173 --only-categories=pwa
```

---

## Project Structure

```
src/
├── types/index.ts          # All TS interfaces (Project, Session, TimerState, etc.)
├── db/
│   ├── schema.ts           # idb schema (3 stores: projects, sessions, settings)
│   └── index.ts            # openDB (cached), typed exports
├── store/
│   ├── projectStore.ts     # Project CRUD; persisted to IDB
│   ├── sessionStore.ts     # Session append + computed selectors
│   ├── timerStore.ts       # Ephemeral timer state machine (NOT persisted)
│   └── idbStorage.ts       # Custom Zustand persist adapter for IDB
├── algorithms/
│   ├── suggestion.ts       # Weighted random single suggestion
│   └── combo.ts            # Knapsack combo suggestions (top 3)
├── hooks/
│   ├── useTimer.ts         # rAF countdown + Page Visibility reconciliation + Wake Lock
│   ├── useHydration.ts     # Wait for IDB hydration before rendering
│   └── usePWAInstall.ts    # BeforeInstallPromptEvent handler
├── pages/
│   ├── ProjectLibrary/     # /library (Tab 1)
│   ├── DailySuggestion/    # /suggest (Tab 2)
│   ├── ComboSuggestion/    # /combo?minutes=N (no tab)
│   ├── PomodoroTimer/      # /timer (full-screen, no BottomNav)
│   ├── SessionComplete/    # /complete (full-screen, no BottomNav)
│   └── ActivityDashboard/  # /dashboard (Tab 3) — OVERVIEW + HISTORY tabs
├── components/
│   ├── ui/                 # shadcn/ui copies (Button, Dialog, Sheet, Input, Badge)
│   ├── layout/             # Shell, BottomNav (3 tabs), PageHeader
│   └── shared/             # ColorDot, DurationBadge, EmptyState
└── lib/
    ├── utils.ts            # cn() (clsx + tailwind-merge), formatDuration
    └── constants.ts        # COLOR_PALETTE (15 colors), DB_NAME, APP_NAME
```

---

## Key Architecture Decisions

### Navigation & State Passing
- Bottom nav has 3 tabs only: `/library`, `/suggest`, `/dashboard`
- `/timer` and `/complete` are full-screen (no BottomNav)
- Router `state` prop carries most inter-route payloads; **exception**: `/combo` uses URL param `?minutes=N` because router state doesn't survive back navigation
- After any session, `/complete` shows SAVE button + two destinations: VIEW STATS (`/dashboard`) or GO HOME (`/`)
- `AppSettings.hasSeenHome` controls whether home screen shows on launch; the HOME button in Library/Dashboard header resets this to `false`

### Data Layer
- Database: `ever-project-db` v1; 3 object stores: `projects` (key: `id`), `sessions` (key: `id`), `settings` (key: `key`)
- `timerStore` is **intentionally not persisted** — timer resets on page refresh
- `sessions` store is **append-only** — never delete; only `outcome` + `notes` can be updated
- `getActiveProjects()` sorts by most recent session `startedAt` DESC (fallback: `createdAt` DESC) — not `updatedAt`

### Suggestion Algorithms (pure functions, no side effects)
- **Single** (`suggestion.ts`): filter by duration fit → score (recency 50%, frequency 30%, duration fit 20%) → weighted random pick
- **Combo** (`combo.ts`): score top 8 → generate all C(8,2)+C(8,3)+C(8,4) → filter by `available-10 ≤ total ≤ available` → score by `avgScore × (1 - slack/available)` → top 3; relax to ±20 min if empty

### Timer (`useTimer` hook)
- `requestAnimationFrame` loop calling `timerStore.tickTimer()` every second
- `Page Visibility API`: on tab return, reconcile elapsed time. For combos, walk through projects proportionally using `projectElapsedMs`
- Wake Lock: `navigator.wakeLock.request('screen')` while running
- Skip button: disabled for single-project sessions and when on the last project of a combo; skipped projects logged as `partial`

### PWA
- `injectManifest` strategy (manual SW control) — prevents auto-swapping SW mid-timer session
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` handles iPhone notch

---

## Critical Patterns

### ProjectColor → CSS class lookup (never interpolate)
```typescript
// ✓ Correct — Tailwind can purge lookup maps
const COLOR_CLASS_MAP: Record<ProjectColor, string> = { indigo: 'bg-indigo-500', ... };

// ✗ Wrong — Tailwind cannot purge dynamic strings
<div className={`bg-${project.color}-500`} />
```

### Zustand: subscribe to slices
```typescript
const projects = useProjectStore(s => s.projects); // ✓
const store = useProjectStore(); // ✗ re-renders on any change
```

### `as` assertions only at system boundaries (IDB reads, router state)
```typescript
const project = (await db.get('projects', id)) as Project; // ✓ boundary
const score = calc(project) as number; // ✗ in business logic
```

### MD3 button variants
```typescript
// Filled — primary CTA
const btnFilled = 'bg-primary text-on-primary rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
// Tonal — secondary action
const btnTonal = 'bg-primary-container text-on-primary-container rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
// Outlined — ghost/cancel
const btnOutlined = 'border border-outline text-primary bg-transparent rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
```

---

## Color Tokens (MD3)

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#FAFAFA` | `#1C1B1F` | Page background |
| `surface-variant` | `#F3F0FA` | `#2B2A33` | Card background |
| `on-surface` | `#1C1B1F` | `#E6E1E5` | Primary text |
| `on-surface-variant` | `#49454E` | `#CAC4D0` | Secondary text |
| `primary` | `#6366F1` | `#C5C1FF` | Primary accent |
| `on-primary` | `#FFFFFF` | `#1A1065` | Text on primary |
| `primary-container` | `#E8E7FF` | `#4942C9` | Tonal button bg |
| `on-primary-container` | `#1A1065` | `#E5E0FF` | Text on tonal |
| `error` | `#B3261E` | `#F2B8B5` | Error states |
| `success` | `#386A20` | `#8FD67A` | Success / Done |
| `warning` | `#7B5800` | `#EFBF00` | Warning / Partial |
| `outline` | `#79757F` | `#938F99` | Borders, dividers |

Fonts: **Roboto** / system-ui fallback. Sentence case everywhere; badges/tags may use ALL CAPS. All animations use `ease-out` at 250ms — no `steps()` easing.
