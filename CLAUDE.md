# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

EverProject — a mobile-first PWA for managing personal projects and staying productive via time-aware suggestions, a Pomodoro timer, and activity tracking. Clean Material Design 3 aesthetic throughout.

**How to use docs:** Read `docs/INDEX.md` first — it maps task types to the specific file you need. You rarely need to read more than one doc per task.

- `docs/INDEX.md` — **Always read first**: task → file map + critical rules quick reference
- `docs/00-architecture.md` — tech stack, routing, stores, PWA
- `docs/01-pages.md` — all 9 pages: behaviors and router state payloads
- `docs/02-data-model.md` — TypeScript interfaces, IDB schema v6, Zustand store APIs *(most frequently needed)*
- `docs/03-design-system.md` — MD3 color tokens, typography, component patterns
- `docs/04-coding-style.md` — naming, TypeScript, React, Tailwind rules
- `docs/05-algorithms.md` — suggestion scoring (62.5%/37.5%), combo algorithm
- `docs/06-test-plan.md` — test strategy (read only when writing tests)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Routing | React Router DOM v7 (`createHashRouter`) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| State | Zustand v5 + Immer |
| Persistence | IndexedDB via `idb` v8 (DB version: 6, 6 stores) |
| PWA | vite-plugin-pwa + Workbox v7 (`injectManifest` strategy) |
| Forms | React Hook Form v7 + Zod v4 |
| i18n | Custom useTranslation hook (en / zh-TW) |

---

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Serve production build (for PWA/offline testing)
npm run lint      # ESLint check
npm run test      # Vitest (unit tests for algorithms)
```

---

## Key Architecture Decisions

### Navigation & State Passing
- Bottom nav: 3 tabs only — `/library`, `/suggest`, `/dashboard`
- `/timer`, `/complete`, `/settings` are full-screen (no BottomNav)
- Router `state` carries inter-route payloads; **exception**: `/combo` uses URL param `?minutes=N` (router state doesn't survive back navigation)
- Hash router (`/#/library`) — PWA offline navigation requires no server routing

### Data Layer
- Database: `ever-project-db` **v6**; 6 object stores
- `timerStore` is intentionally NOT persisted; crash recovery uses the `timerDraft` IDB store
- `sessions` store is append-only; `deleteSession` is the only exception; `updateSession` only allows `outcome` / `notes` / `hasImage`
- `getActiveProjects(sessions)` requires a sessions argument for recency-based sorting

### Suggestion Algorithms
- **Single** (`suggestion.ts`): recency **62.5%** + frequency **37.5%** (no duration filter — all projects are eligible)
- **Combo** (`combo.ts`): top 8 projects → C(8,2)+C(8,3)+C(8,4) → partial combo support → ±10 min filter → top 3; relaxes to ±20 min if no results

### Timer
- rAF loop → `timerStore.tickTimer()` every second
- Page Visibility API: reconciles elapsed time when tab returns to foreground
- Wake Lock: keeps screen on while timer runs
- Saves `timerDraft` to IDB every second for crash recovery

---

## Critical Patterns

### Color classes — never interpolate
```typescript
// ✓ Use static lookup map (src/lib/constants.ts)
<div className={COLOR_BG_MAP[project.color]} />
// ✗ Tailwind purge cannot detect dynamic strings
<div className={`bg-${project.color}-500`} />
```

### Zustand — subscribe to slices
```typescript
const projects = useProjectStore(s => s.projects); // ✓
const store = useProjectStore(); // ✗
```

### `as` assertions — only at system boundaries
```typescript
const project = (await db.get('projects', id)) as Project; // ✓
const score = calc(project) as number; // ✗
```

### MD3 button variants
```typescript
const btnFilled   = 'bg-primary text-on-primary rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
const btnTonal    = 'bg-primary-container text-on-primary-container rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
const btnOutlined = 'border border-outline text-primary bg-transparent rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100';
```

---

## Color Tokens (Classic Style, `src/index.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#FDFAF4` | `#1A1208` | Page background |
| `surface-variant` | `#FFFFFF` | `#261C0F` | Card background |
| `on-surface` | `#1A1208` | `#F4EDE0` | Primary text |
| `on-surface-variant` | `#7A6651` | `#A89070` | Secondary text |
| `primary` | `#C75B21` | `#E07840` | Primary accent (warm orange) |
| `on-primary` | `#FFFFFF` | `#1A1208` | Text on primary |
| `primary-container` | `#FEECD8` | `#5C1E00` | Tonal button bg |
| `on-primary-container` | `#5C1E00` | `#FEECD8` | Text on tonal |
| `error` | `#C0392B` | `#EF5350` | Error states |
| `success` | `#2D6A2D` | `#66BB6A` | Success / Done |
| `warning` | `#A0600A` | `#FFA726` | Warning / Partial |
| `outline` | `#B0A090` | `#5C4A35` | Borders, dividers |

Fonts: **DM Sans** / system-ui fallback (pixel style uses DM Mono). Sentence case everywhere. Animations `ease-out` 250ms.
