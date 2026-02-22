# Test Plan — EverProject

**Version:** 1.0
**Date:** 2026-02-21
**Scope:** All functional features across Phases 1–9
**Test framework:** Vitest (unit/integration) + manual browser/PWA checklist

---

## Table of Contents

1. [Test Strategy](#1-test-strategy)
2. [Coverage Targets](#2-coverage-targets)
3. [Unit Tests — Algorithms](#3-unit-tests--algorithms)
4. [Unit Tests — Store Selectors](#4-unit-tests--store-selectors)
5. [Unit Tests — Utility Functions](#5-unit-tests--utility-functions)
6. [Component Tests — Shared Components](#6-component-tests--shared-components)
7. [Page Tests — Home Screen](#7-page-tests--home-screen)
8. [Page Tests — Project Library](#8-page-tests--project-library)
9. [Page Tests — Daily Suggestion](#9-page-tests--daily-suggestion)
10. [Page Tests — Combo Suggestion](#10-page-tests--combo-suggestion)
11. [Page Tests — Pomodoro Timer](#11-page-tests--pomodoro-timer)
12. [Page Tests — Session Complete](#12-page-tests--session-complete)
13. [Page Tests — Activity Dashboard](#13-page-tests--activity-dashboard)
14. [Hook Tests](#14-hook-tests)
15. [Integration Tests — End-to-End Flows](#15-integration-tests--end-to-end-flows)
16. [PWA & Offline Tests](#16-pwa--offline-tests)
17. [Accessibility Tests](#17-accessibility-tests)
18. [Edge Cases & Boundary Conditions](#18-edge-cases--boundary-conditions)
19. [Manual Regression Checklist](#19-manual-regression-checklist)
20. [Component Tests — Layout Components](#20-component-tests--layout-components)
21. [Unit Tests — Store Actions](#21-unit-tests--store-actions)
22. [Component Tests — ProjectLibrary Sub-components](#22-component-tests--projectlibrary-sub-components)

---

## 1. Test Strategy

### Layers

| Layer | Tool | What it tests |
|---|---|---|
| **Unit** | Vitest | Pure functions: algorithms, selectors, utilities |
| **Component** | Vitest + React Testing Library | Render, interactions, state changes per component |
| **Integration** | Vitest + RTL + MemoryRouter | Full page flows with real Zustand stores (IDB mocked) |
| **Manual** | Browser checklist | PWA install, offline, Wake Lock, haptics, animations |

### Test File Locations

```
src/
├── algorithms/
│   ├── suggestion.test.ts              ← unit
│   └── combo.test.ts                   ← unit
├── store/
│   ├── projectStore.test.ts            ← unit + integration
│   ├── sessionStore.test.ts            ← unit + integration
│   ├── timerStore.test.ts              ← unit (state machine actions)
│   └── settingsStore.test.ts           ← unit (actions + IDB integration)
├── hooks/
│   ├── useTimer.test.ts                ← unit (with fake timers)
│   └── usePWAInstall.test.ts           ← unit
├── lib/
│   └── utils.test.ts                   ← unit
├── components/
│   ├── layout/
│   │   ├── BottomNav.test.tsx          ← component
│   │   ├── PageHeader.test.tsx         ← component
│   │   └── Shell.test.tsx              ← component
│   └── shared/
│       └── PWAInstallBanner.test.tsx   ← component
└── pages/
    ├── Home.test.tsx
    ├── ProjectLibrary.test.tsx
    ├── ProjectLibrary/
    │   └── components/
    │       ├── ProjectCard.test.tsx    ← component
    │       ├── ColorPicker.test.tsx    ← component
    │       └── StartSessionSheet.test.tsx ← component
    ├── DailySuggestion.test.tsx
    ├── ComboSuggestion.test.tsx
    ├── PomodoroTimer.test.tsx
    ├── SessionComplete.test.tsx
    └── ActivityDashboard.test.tsx
```

### Mocking Strategy

- **IndexedDB**: Use `fake-indexeddb` or an in-memory mock in `src/db/__mocks__/index.ts`
- **React Router**: Wrap tests with `MemoryRouter` and pre-seeded `initialEntries`
- **Date/Time**: `vi.useFakeTimers()` for streak, recency, and timer tests
- **`navigator.vibrate`**: `vi.fn()` stub
- **`navigator.wakeLock`**: Stub returning a resolved promise with `{ release: vi.fn() }`
- **`crypto.randomUUID`**: `vi.stubGlobal` with a predictable counter

---

## 2. Coverage Targets

| Area | Line coverage target |
|---|---|
| `src/algorithms/` | **100%** — pure functions, no excuses |
| `src/lib/utils.ts` | **100%** |
| `src/store/` (selectors) | **90%+** |
| `src/hooks/useTimer.ts` | **85%+** |
| `src/pages/` (components) | **75%+** |
| `src/components/shared/` | **80%+** |
| Overall project | **80%+** |

Run coverage with:
```bash
npm run test -- --coverage
```

---

## 3. Unit Tests — Algorithms

### 3.1 `suggestProject` (`src/algorithms/suggestion.ts`)

#### TC-ALG-01: Returns `null` when no projects exist
- Input: empty `projects` array, any `availableMinutes`
- Expected: `null`

#### TC-ALG-02: Returns `null` when no project fits available time
- Input: one project with `estimatedDurationMinutes: 60`, `availableMinutes: 30`
- Expected: `null`

#### TC-ALG-03: Returns the only fitting project
- Input: one project with `estimatedDurationMinutes: 30`, `availableMinutes: 45`, no sessions
- Expected: that project (not `null`)

#### TC-ALG-04: Never-done project scores maximum recency (1.0)
- Input: one project with zero sessions
- Verify: `recencyScore === 1.0` (test via `scoreAllEligible` export)

#### TC-ALG-05: Project worked today scores minimum recency (~0.0)
- Input: project with a session `startedAt: Date.now() - 60_000` (1 min ago)
- Verify: `recencyScore < 0.01`

#### TC-ALG-06: Project not touched in 14+ days scores maximum recency (1.0)
- Input: project with last session 15 days ago (`startedAt: Date.now() - 15 * 86_400_000`)
- Verify: `recencyScore === 1.0`

#### TC-ALG-07: Frequency score saturates at 0 after 20 sessions in 30 days
- Input: project with 20 sessions all within last 30 days
- Verify: `frequencyScore === 0`

#### TC-ALG-08: Project with zero sessions has frequency score 1.0
- Input: project with no sessions
- Verify: `frequencyScore === 1.0`

#### TC-ALG-09: Perfect duration fit scores 1.0 (no slack)
- Input: `estimatedDurationMinutes: 45`, `availableMinutes: 45`
- Verify: `durationFitScore === 1.0`

#### TC-ALG-10: Duration fit score decreases with slack
- Input A: project 30min / available 60min → `durationFitScore = 0.5`
- Input B: project 15min / available 60min → `durationFitScore = 0.75`
- Verify ordering: B > A ✓  *(15/60 uses less slack proportionally — actually 0.75 because 1 - 45/60)*

#### TC-ALG-11: Seed produces different results on same dataset
- Input: same context, `seed: 0` vs `seed: 1` with 5 eligible projects of equal score
- Verify: over 10 seeds, at least 2 different projects are returned (probabilistic — test with 50 seeds, expect ≥ 2 unique)

#### TC-ALG-12: Projects outside time window are never returned
- Input: `availableMinutes: 30`, projects with durations `[15, 30, 45, 60]`
- Verify: returned project always has `estimatedDurationMinutes <= 30`

#### TC-ALG-13: `getDurationFitScore` edge cases
- `projectMinutes > availableMinutes` → returns `0`
- `projectMinutes === availableMinutes` → returns `1.0`
- `projectMinutes === 0` → returns `1.0`

#### TC-ALG-14: `getDaysSinceLastSession` returns `null` for project with no sessions
- Verify: `getDaysSinceLastSession('unknown-id', [])` returns `null`

#### TC-ALG-15: `getDaysSinceLastSession` returns correct days
- Input: session with `startedAt` exactly 3 days ago
- Verify: returns a value close to `3.0` (within ±0.01 due to float arithmetic)

---

### 3.2 `suggestCombos` (`src/algorithms/combo.ts`)

#### TC-COMBO-01: Returns empty array with fewer than 2 projects
- Input: 0 or 1 project
- Expected: `[]`

#### TC-COMBO-02: Returns empty array when no combination fits within tolerance
- Input: projects all with `estimatedDurationMinutes: 60`, `availableMinutes: 30`
- Expected: `[]` (no combo of 2+ 60-min projects fits 30 min)

#### TC-COMBO-03: Returns up to 3 combos, sorted by score descending
- Input: 5 projects with varied durations that allow multiple combos for `availableMinutes: 90`
- Verify: result length ≤ 3; `result[0].score >= result[1].score >= result[2].score`

#### TC-COMBO-04: Strict tolerance filter (default ±10 min)
- Input: `availableMinutes: 60`, projects summing to 72 min (12 min over) and 49 min (11 min under)
- Verify: neither combo appears in results with default tolerance

#### TC-COMBO-05: Relaxed tolerance fallback (±20 min) applied when strict yields nothing
- Input: `availableMinutes: 60`, only combos fitting within ±20 min exist
- Verify: results are non-empty, all have `slackMinutes <= 20` or `totalMinutes <= 80`

#### TC-COMBO-06: Combo score formula correctness
- Given: `avgProjectScore = 0.8`, `availableMinutes = 60`, `slackMinutes = 10`
- Expected score: `0.8 × (1 - 10/60) = 0.8 × 0.8333... ≈ 0.667`

#### TC-COMBO-07: No project appears twice in the same combo
- Verify: each combo's `projects` array has unique IDs
  - `combo.projects.map(p => p.id)` has no duplicates

#### TC-COMBO-08: Combo sizes are 2, 3, or 4 projects only
- Verify: all returned combos have `projects.length` in `[2, 3, 4]`

#### TC-COMBO-09: All eligible projects' scores use the same weights as `suggestProject`
- Verify: `scoreAllEligible` results are identical when called from both `suggestProject`
  context and `suggestCombos` context with the same input

#### TC-COMBO-10: Handles exactly 2 eligible projects
- Input: only 2 projects, each fitting individually, with combined duration ≤ availableMinutes
- Verify: returns 1 combo with both projects

---

## 4. Unit Tests — Store Selectors

### 4.1 `sessionStore` Selectors

#### TC-SEL-01: `getTotalSessionCount` excludes abandoned sessions
- Setup: 3 completed + 2 abandoned sessions
- Expected: `5` total, but `getTotalSessionCount()` returns `3`

#### TC-SEL-02: `getTotalMinutes` excludes abandoned sessions
- Setup: completed 30-min session + abandoned 45-min session
- Expected: `30` (not 75)

#### TC-SEL-03: `getCurrentStreak` — consecutive days
- Setup: sessions on today, yesterday, and 2 days ago; none 3 days ago
- Expected: streak = `3`

#### TC-SEL-04: `getCurrentStreak` — no sessions today but yesterday
- Setup: sessions only yesterday and day before
- Expected: streak = `0` (today has no session; streak only counts backward from today)

#### TC-SEL-05: `getCurrentStreak` — no sessions at all
- Expected: `0`

#### TC-SEL-06: `getCurrentStreak` — abandoned sessions don't count
- Setup: only abandoned sessions today
- Expected: `0`

#### TC-SEL-07: `getDailyActivity` returns exactly N entries
- Call `getDailyActivity(84)` → verify array length = `84`
- Call `getDailyActivity(7)` → verify array length = `7`

#### TC-SEL-08: `getDailyActivity` entries are in ascending date order
- Verify: `result[0].date < result[83].date` (oldest first)

#### TC-SEL-09: `getDailyActivity` correctly counts sessions per day
- Setup: 2 sessions on today, 1 session on yesterday
- Verify: last entry `count = 2`, second-to-last `count = 1`

#### TC-SEL-10: `getProjectTotals` sums minutes correctly
- Setup: 2 sessions of 30 min each for the same project
- Verify: `totalMinutes = 60`

#### TC-SEL-11: `getProjectTotals` sorts by totalMinutes descending
- Setup: project A with 60 min, project B with 120 min
- Verify: B appears first

#### TC-SEL-12: `getProjectTotals` handles deleted projects gracefully
- Setup: session referencing `projectId` not in projects array
- Verify: entry appears with `project.name === '[DELETED]'`, does not throw

#### TC-SEL-13: `getSessionsForHistory` returns all sessions descending by `startedAt`
- Setup: 3 sessions at times T1 < T2 < T3
- Verify: order is `[T3, T2, T1]`

#### TC-SEL-14: `getSessionsForHistory` filters by `filterProjectId`
- Setup: 3 sessions, 2 for project A, 1 for project B
- Call `getSessionsForHistory('project-a-id')` → verify length = `2`

#### TC-SEL-15: `getLastSessionForProject` returns most recent session
- Setup: 3 sessions for same project at T1 < T2 < T3
- Verify: returns the session with `startedAt === T3`

#### TC-SEL-16: `getLastSessionForProject` returns `undefined` for unknown project
- Expected: `undefined` (not a throw)

### 4.2 `projectStore` Selectors

#### TC-SEL-17: `getActiveProjects` excludes archived projects
- Setup: 2 active + 1 archived project
- Expected: array of length `2`

#### TC-SEL-18: `getActiveProjects` sorts by most recent session first
- Setup: project A with session T1, project B with session T2 (T2 > T1)
- Expected: B appears before A

#### TC-SEL-19: `getActiveProjects` falls back to `createdAt` for projects with no sessions
- Setup: project A created first, project B created second, neither has sessions
- Expected: B appears before A (most recent `createdAt` first)

#### TC-SEL-20: `getProjectById` returns `undefined` for missing id
- Expected: `undefined` (not a throw)

---

## 5. Unit Tests — Utility Functions

### 5.1 `formatDuration` (`src/lib/utils.ts`)

#### TC-UTIL-01: Less than 60 minutes → `"Xm"` format
- `formatDuration(0)` → `"0M"`
- `formatDuration(15)` → `"15M"`
- `formatDuration(59)` → `"59M"`

#### TC-UTIL-02: Exactly 60 minutes → `"1H"`
- `formatDuration(60)` → `"1H"`

#### TC-UTIL-03: Hours with remainder minutes
- `formatDuration(90)` → `"1H 30M"`
- `formatDuration(125)` → `"2H 5M"`

#### TC-UTIL-04: Exactly multiples of 60
- `formatDuration(120)` → `"2H"`
- `formatDuration(180)` → `"3H"`

### 5.2 `toDateString` (`src/lib/utils.ts`)

#### TC-UTIL-05: Returns YYYY-MM-DD format
- Input: known timestamp (e.g. `new Date('2026-02-21T12:00:00Z').getTime()`)
- Expected: `"2026-02-21"`

#### TC-UTIL-06: Handles epoch (0)
- `toDateString(0)` → `"1970-01-01"`

### 5.3 `daysBetween` (`src/lib/utils.ts`)

#### TC-UTIL-07: Same calendar day → 0
- Input: two timestamps from the same day
- Expected: `0`

#### TC-UTIL-08: Exactly one day apart → 1
- Input: midnight and the next midnight
- Expected: `1`

#### TC-UTIL-09: Order-independent (absolute value)
- `daysBetween(T2, T1) === daysBetween(T1, T2)`

### 5.4 `cn` (`src/lib/utils.ts`)

#### TC-UTIL-10: Merges conflicting Tailwind classes (last wins)
- `cn('bg-red-500', 'bg-blue-500')` → `"bg-blue-500"`

#### TC-UTIL-11: Filters falsy values
- `cn('base', false, undefined, 'active')` → `"base active"`

---

## 6. Component Tests — Shared Components

### 6.1 `ColorDot`

#### TC-COMP-01: Renders a square with correct background color
- Render `<ColorDot color="indigo" />` → verify inline `backgroundColor === '#6366f1'`
- Verify `width === height === 12` (default size)

#### TC-COMP-02: Custom size prop applied
- Render `<ColorDot color="green" size={20} />` → verify `width === height === 20`

### 6.2 `DurationBadge`

#### TC-COMP-03: Displays formatted duration with tilde prefix
- Render `<DurationBadge minutes={45} />` → text `"~45M"`
- Render `<DurationBadge minutes={90} />` → text `"~1H 30M"`

### 6.3 `EmptyState`

#### TC-COMP-04: Renders title and optional subtitle
- Render with `title="NO PROJECTS."` → text present in DOM
- Render with `subtitle="ADD ONE."` → subtitle present
- Render without `subtitle` → no second text node

### 6.4 `PixelDialog`

#### TC-COMP-05: Hidden when `isOpen = false`
- Render with `isOpen={false}` → dialog element not in DOM (or hidden)

#### TC-COMP-06: Visible when `isOpen = true`
- Render with `isOpen={true}` → message text visible, confirm/cancel buttons rendered

#### TC-COMP-07: Calls `onConfirm` when confirm button clicked
- Render, click confirm button → `onConfirm` spy called once

#### TC-COMP-08: Calls `onCancel` when cancel button clicked
- Render, click cancel button → `onCancel` spy called once

#### TC-COMP-09: Calls `onCancel` when backdrop clicked
- Render, click backdrop overlay → `onCancel` spy called once

#### TC-COMP-10: `isDanger` applies red styling to confirm button
- Render with `isDanger={true}` → confirm button has `border-[#ff3333]` or red color class

### 6.5 `BottomSheet`

#### TC-COMP-11: Sheet hidden when `isOpen = false`
- Verify `translate-y-full` class applied (off-screen)

#### TC-COMP-12: Sheet visible when `isOpen = true`
- Verify `translate-y-0` class applied

#### TC-COMP-13: Calls `onClose` when Escape key pressed
- Simulate `keydown` Escape → `onClose` spy called

#### TC-COMP-14: Calls `onClose` when backdrop clicked
- Click backdrop → `onClose` spy called

#### TC-COMP-15: `document.body.overflow` is `'hidden'` when open, restored when closed
- Verify body style changes appropriately on open/close

### 6.6 `UpdatePrompt`

#### TC-COMP-16: Hidden by default (no event fired)
- Render → prompt not visible

#### TC-COMP-17: Visible after `sw-update-available` event dispatched
- `window.dispatchEvent(new CustomEvent('sw-update-available'))` → banner appears

#### TC-COMP-18: RELOAD button posts SKIP_WAITING message to waiting SW
- Mock `navigator.serviceWorker.getRegistration` → click RELOAD → verify `postMessage` called with `{ type: 'SKIP_WAITING' }`

#### TC-COMP-19: LATER button hides the prompt without posting message
- Dispatch event → click LATER → prompt disappears, `postMessage` not called

### 6.7 `PWAInstallBanner`

#### TC-COMP-20: Hidden when `canInstall` is `false`
- Mock `usePWAInstall` → `{ canInstall: false, isInstalled: false }`
- Render `<PWAInstallBanner />` → no DOM output (renders empty fragment)

#### TC-COMP-21: Hidden when `isInstalled` is `true`
- Mock `usePWAInstall` → `{ canInstall: true, isInstalled: true }`
- Render → no DOM output

#### TC-COMP-22: Visible when `canInstall = true` and `isInstalled = false`
- Mock → `{ canInstall: true, isInstalled: false, promptInstall: vi.fn() }`
- Render → "ADD TO HOME SCREEN" text visible, INSTALL button rendered

#### TC-COMP-23: INSTALL button calls `promptInstall`
- Render with `canInstall: true` → click INSTALL → `promptInstall` spy called once

---

## 7. Page Tests — Home Screen

#### TC-HOME-01: Renders title, three buttons, and pixel sprite
- Mount `<Home />` with `hasSeenHome: false`
- Verify text: `"EVERPROJECT"`, `"LIBRARY"`, `"GET SUGGESTION"`, `"ACTIVITY HISTORY"`

#### TC-HOME-02: Redirects to `lastVisitedTab` when `hasSeenHome = true`
- Mount with `hasSeenHome: true`, `lastVisitedTab: '/suggest'`
- Verify `navigate` called with `'/suggest'`

#### TC-HOME-03: LIBRARY button sets `hasSeenHome = true` and navigates to `/library`
- Click LIBRARY button → `setHasSeenHome(true)` called → navigated to `/library`

#### TC-HOME-04: GET SUGGESTION button navigates to `/suggest`
- Click → navigated to `/suggest`

#### TC-HOME-05: ACTIVITY HISTORY button navigates to `/dashboard?view=history`
- Click → navigated to `/dashboard?view=history`

#### TC-HOME-06: HOME button in Library/Dashboard resets `hasSeenHome` to `false`
- Renders Library with `showHomeButton` prop → click HOME → `setHasSeenHome(false)` called → navigated to `/`

---

## 8. Page Tests — Project Library

#### TC-LIB-01: Shows EmptyState when no projects exist
- Mount with empty store → "NO PROJECTS YET." visible

#### TC-LIB-02: Renders active project cards
- Store has 2 active projects → 2 cards rendered

#### TC-LIB-03: Archived projects hidden by default, revealed by toggle
- Store has 1 archived project → toggle button visible → click → archived card appears

#### TC-LIB-04: `+ ADD` button opens the Add sheet
- Click `+ ADD` → BottomSheet with title "NEW PROJECT" opens

#### TC-LIB-05: Auto-opens add sheet when navigated with `openAddSheet: true` state
- Mount with `location.state = { openAddSheet: true }` → sheet open on mount

#### TC-LIB-06: ProjectForm — name validation (required, max 30 chars)
- Submit with empty name → error message shown
- Submit with 31-char name → error shown
- Submit with 30-char name → accepted

#### TC-LIB-07: ProjectForm — color picker selects a color
- Render form → click "green" color square → green shown as selected → save succeeds

#### TC-LIB-08: ProjectForm — estimated duration selection
- Render form → click "45" button → that option highlighted

#### TC-LIB-09: ProjectForm — notes field accepts up to 500 chars
- Type 501 chars → only 500 stored (or 501st char refused by input logic)

#### TC-LIB-10: Adding a project writes it to the store and closes sheet
- Fill form → click SAVE → project appears in list → sheet closes

#### TC-LIB-11: Editing a project pre-fills the form and updates on save
- Click edit on project → sheet opens with existing values → modify name → save → updated name shown in card

#### TC-LIB-12: Archive project removes it from active list
- Click archive on a project → card disappears from active list → appears in archived count

#### TC-LIB-13: Unarchive project moves it back to active list
- Expand archived → click unarchive → card appears in active list

#### TC-LIB-14: Delete confirmation dialog appears before deleting
- Click delete → PixelDialog appears → click NO → project still in list
- Click delete → click YES → project removed

#### TC-LIB-15: StartSessionSheet opens on card tap, pre-selects project's duration
- Tap project card → sheet opens → selected duration matches `estimatedDurationMinutes`

#### TC-LIB-16: StartSessionSheet — user can change duration and start
- Open sheet → click "60" button → click START → navigate to `/timer` with `totalMinutes: 60`

#### TC-LIB-17: StartSessionSheet for archived project shows ARCHIVED banner
- Tap archived project card → sheet shows `[ARCHIVED]` badge + UNARCHIVE button

#### TC-LIB-18: Active projects sorted correctly (most recent session first)
- Project A: last session 2 days ago; Project B: last session 1 day ago
- Expected order: B, A

---

## 9. Page Tests — Daily Suggestion

#### TC-SUGG-01: Shows EmptyState when no active projects
- Mount with empty store → "NO PROJECTS IN LIBRARY." visible

#### TC-SUGG-02: Shows "NOTHING FITS X MIN" when no project fits selected time
- Store has project with 60-min duration; select 15-min time slot
- Expected: "NOTHING FITS 15 MIN." visible, ROLL AGAIN and START TIMER disabled

#### TC-SUGG-03: SuggestionCard renders with project name, duration, fit bar
- Project "Alpha" fits → card shows "ALPHA", "~30 MIN", progress bar rendered

#### TC-SUGG-04: Fit bar width corresponds to duration fit score
- Available 60 min, project 60 min → bar width ~100%
- Available 60 min, project 30 min → bar width ~50%

#### TC-SUGG-05: Recency label shows correctly
- Never-done project → "NEVER DONE"
- Session today → "TODAY"
- Session yesterday → "YESTERDAY"
- Session 5 days ago → "5 DAYS AGO"

#### TC-SUGG-06: Notes excerpt shows first 80 chars with ellipsis
- Project with 100-char notes → card shows 80 chars + `"…"`
- Project with 60-char notes → full notes shown, no ellipsis

#### TC-SUGG-07: ROLL AGAIN changes the suggestion
- Setup: 5 eligible projects → click ROLL AGAIN → new seed → different project may appear

#### TC-SUGG-08: ROLL AGAIN disabled when only 1 eligible project
- Only 1 project fits → ROLL AGAIN button is disabled (dimmed styling)

#### TC-SUGG-09: Changing time selector re-runs suggestion
- Start with 60-min suggestion → click "30" time button → suggestion updates

#### TC-SUGG-10: START TIMER navigates with correct payload
- Click START TIMER → navigate to `/timer` with `{ projectIds: [id], totalMinutes: selectedMinutes }`

#### TC-SUGG-11: TRY COMBO navigates to `/combo?minutes=N`
- Selected time = 90 → click TRY COMBO → navigate to `/combo?minutes=90`

#### TC-SUGG-12: Slack label shown in suggestion card
- Available 60 min, project 45 min → "15 MIN FREE" shown
- Perfect fit → "PERFECT FIT" shown

---

## 10. Page Tests — Combo Suggestion

#### TC-CMB-01: Redirects to `/suggest` when `minutes` param is missing
- Navigate to `/combo` (no param) → redirect to `/suggest`

#### TC-CMB-02: Redirects for invalid param values
- `/combo?minutes=0` → redirect
- `/combo?minutes=-5` → redirect
- `/combo?minutes=abc` → redirect

#### TC-CMB-03: Shows EmptyState when no combos found
- Mount with projects that don't combine → "NO COMBOS FOR X MIN." shown

#### TC-CMB-04: Renders up to 3 combo cards
- Mock `suggestCombos` to return 3 combos → 3 cards in carousel

#### TC-CMB-05: ComboCard shows project list with names, durations, total, slack
- Combo with 2 projects (30 min + 30 min), available 70 min:
  - Both project names shown
  - "TOTAL: ~60 MIN" shown
  - "10 MIN FREE" shown in correct slack color (yellow, since 10 > 5)

#### TC-CMB-06: Slack label color thresholds
- 0–5 min slack → green `#00ff41`
- 6–15 min slack → yellow `#ffcc00`
- 16+ min slack → gray `#888899`

#### TC-CMB-07: Carousel navigation via arrow buttons
- Click `▶` → next card becomes visible → dot indicator updates
- Click `◀` on first card → button disabled, no change

#### TC-CMB-08: Dot indicators reflect current card
- 3 combos → 3 dots; first dot filled → click second dot → second dot filled

#### TC-CMB-09: Arrow buttons hidden/disabled at carousel boundaries
- First card: `◀` button disabled; last card: `▶` button disabled
- Middle card: both enabled

#### TC-CMB-10: Dots hidden when only 1 combo
- 1 combo → no dot indicators shown

#### TC-CMB-11: START THIS COMBO navigates with correct payload
- Select combo 2 → click START → navigate to `/timer` with:
  - `projectIds: [combo2.project1.id, combo2.project2.id]`
  - `totalMinutes: availableMinutes`
  - `comboGroupId: expect.any(String)` (UUID)

#### TC-CMB-12: Back button returns to `/suggest`
- Click BACK → navigate to `/suggest`

---

## 11. Page Tests — Pomodoro Timer

#### TC-TMR-01: Redirects to `/library` when no router state
- Navigate to `/timer` without state → redirect to `/library`

#### TC-TMR-02: Redirects when `projectIds` is empty array
- State `{ projectIds: [], totalMinutes: 45 }` → redirect

#### TC-TMR-03: Timer starts on mount and `timerStore.phase` becomes `'running'`
- Mount with valid state → `startTimer` called → `phase === 'running'`

#### TC-TMR-04: Countdown display shows correct MM:SS
- `remainingSeconds = 2700` (45 min) → shows `"45:00"`
- `remainingSeconds = 90` → shows `"01:30"`
- `remainingSeconds = 9` → shows `"00:09"`

#### TC-TMR-05: Ring progress increases as timer counts down
- At start: progress = 0%
- Midpoint: progress ≈ 50%
- At end: progress = 100%

#### TC-TMR-06: PAUSE button transitions phase to `'paused'`
- Click PAUSE → `pauseTimer` called → `phase === 'paused'`
- PAUSE button hidden → RESUME + STOP & LOG appear

#### TC-TMR-07: RESUME button transitions phase back to `'running'`
- In paused state → click RESUME → `resumeTimer` called → PAUSE button reappears

#### TC-TMR-08: QUIT button opens confirmation dialog
- Click `✕ QUIT` → PixelDialog appears with "QUIT SESSION?"

#### TC-TMR-09: Quit confirm navigates to `/complete` with `outcome: 'abandoned'`
- Confirm quit → `navigate('/complete', { state: { outcome: 'abandoned', ... } })` called
- Timer store reset

#### TC-TMR-10: Quit cancel closes dialog and resumes if was running
- Running state → quit → cancel → timer still running

#### TC-TMR-11: SKIP button disabled for single-project sessions
- Mount with 1 project → SKIP button rendered but disabled

#### TC-TMR-12: SKIP button disabled on last project of combo
- 3-project combo, on project 3 → SKIP disabled

#### TC-TMR-13: SKIP button enabled for non-last combo projects
- 3-project combo, on project 1 or 2 → SKIP enabled

#### TC-TMR-14: Skip dialog shows project name and time-so-far
- Running combo, project "Alpha" for 2 min → click SKIP → dialog shows "Alpha", "2:00"

#### TC-TMR-15: Skip confirm calls `skipProject` and advances to next project
- Confirm skip → `skipProject()` called → `currentProjectIndex` increments → new project header shown

#### TC-TMR-16: Combo pills render with correct states
- 3-project combo, on project 2:
  - Pill 1: filled (completed)
  - Pill 2: blinking (current)
  - Pill 3: empty (upcoming)

#### TC-TMR-17: Project header shows `"PROJECT N OF M"` subtitle for combos
- 3-project combo on project 2 → shows `"PROJECT 2 OF 3"`

#### TC-TMR-18: Single project — no combo pills, no subtitle
- Mount with 1 project → no pills rendered, no `"PROJECT N OF M"` text

#### TC-TMR-19: STOP & LOG (in paused state) navigates with `outcome: 'partial'`
- Pause → click STOP & LOG → navigate to `/complete` with `{ outcome: 'partial', ... }`

#### TC-TMR-20: Timer ring color matches current project color
- Project with `color: 'green'` → ring `pathColor` is green hex `#22c55e`

---

## 12. Page Tests — Session Complete

#### TC-CMP-01: Redirects to `/library` when no router state
- Navigate to `/complete` without state → redirect

#### TC-CMP-02: Redirects when `projectIds` is empty
- State with empty `projectIds` → redirect

#### TC-CMP-03: Header shows "LEVEL UP!" for `outcome: 'completed'`
- Mount with `outcome: 'completed'` → "LEVEL UP!" in green text

#### TC-CMP-04: Header shows "◷ SESSION LOGGED" for `outcome: 'partial'`
- `outcome: 'partial'` → yellow muted header

#### TC-CMP-05: Header shows "✕ ABANDONED" for `outcome: 'abandoned'`
- `outcome: 'abandoned'` → red muted header

#### TC-CMP-06: Stars visible only for completed outcome
- `completed` → 3 stars rendered; `partial` → no stars

#### TC-CMP-07: Session summary card shows planned and actual duration for single project
- State: `plannedDurationMinutes: 45`, `actualDurationMs: 38 * 60000`
- Card shows: "PLANNED: 45 MIN", "ACTUAL: 38 MIN"

#### TC-CMP-08: Combo summary shows each started project with its own row
- 3-project combo, project 2 skipped:
  - Project 1: `✓` icon (completed)
  - Project 2: `~` icon (skipped)
  - Project 3: `?` icon (last — outcome editable)

#### TC-CMP-09: Outcome toggle pre-selects from router state
- State with `outcome: 'partial'` → `~ PARTIAL` button selected (filled background)

#### TC-CMP-10: Outcome toggle allows changing selection
- Click `✓ DONE` when `~ PARTIAL` pre-selected → DONE becomes selected

#### TC-CMP-11: Notes textarea — character counter updates
- Type 150 chars → counter shows `"150 / 500"`

#### TC-CMP-12: Notes textarea max length enforced
- Type 501 chars → only 500 stored / displayed

#### TC-CMP-13: SAVE button writes session to store
- Fill notes, select outcome, click SAVE → `addSession` called with correct params

#### TC-CMP-14: SAVE button becomes a "✓ SAVED" indicator after save
- Click SAVE → button replaced by "✓ SAVED" static indicator

#### TC-CMP-15: VIEW STATS and GO HOME buttons are disabled before saving
- Before save → buttons have dimmed styling; click has no effect (or shows prompt)

#### TC-CMP-16: VIEW STATS navigates to `/dashboard` after save
- Save → click VIEW STATS → navigate to `/dashboard`

#### TC-CMP-17: GO HOME navigates to `/` after save
- Save → click GO HOME → navigate to `/`

#### TC-CMP-18: Leaving before saving shows "SAVE BEFORE LEAVING?" dialog
- Click GO HOME without saving → PixelDialog appears
- Click SAVE → session saved → navigation proceeds
- Click DISCARD → navigate without saving

#### TC-CMP-19: Combo session — correct per-project `actualDurationMinutes` written
- Combo with project A elapsed 25 min, project B elapsed 15 min
- `addSession` called twice: one with `actualDurationMinutes: 25`, one with `15`

#### TC-CMP-20: Combo session — all records share the same `comboGroupId`
- Both `addSession` calls have identical non-null `comboGroupId`

#### TC-CMP-21: Skipped projects written with `outcome: 'partial'`
- Project B was skipped → `addSession` for B has `outcome: 'partial'`

---

## 13. Page Tests — Activity Dashboard

### 13.1 View Toggle

#### TC-DASH-01: Default view is OVERVIEW
- Mount → OVERVIEW button selected (filled bg), overview content shown

#### TC-DASH-02: Navigated with `?view=history` pre-selects HISTORY
- Mount with URL `/dashboard?view=history` → HISTORY button selected

#### TC-DASH-03: Clicking HISTORY tab switches content
- Click HISTORY → history content replaces overview content

### 13.2 Overview Tab

#### TC-DASH-04: Stats tiles show correct values
- Setup: 5 non-abandoned sessions totalling 150 min, current streak 3
- Tiles show: `"5"`, `"2H 30M"`, `"🔥 3"`

#### TC-DASH-05: Abandoned sessions excluded from total count and minutes
- 3 completed (30 min each) + 2 abandoned (20 min each)
- Count tile: `"3"` — not `5`
- Minutes tile: `"1H 30M"` — not `"2H 30M"`

#### TC-DASH-06: Streak shows `"○ 0"` when no sessions
- No sessions → streak tile shows `"○ 0"` (no flame emoji)

#### TC-DASH-07: Heatmap renders 84 cells (12 weeks × 7)
- Verify the heatmap SVG contains 84 rect elements

#### TC-DASH-08: Heatmap cell color class corresponds to session count
- Day with 0 sessions → `heatmap-empty` class
- Day with 1 session → `heatmap-low`
- Day with 3 sessions → `heatmap-mid`
- Day with 5 sessions → `heatmap-high`

#### TC-DASH-09: Tapping a heatmap cell opens Day Detail sheet with correct sessions
- Setup: 2 sessions on `2026-02-20`
- Click cell for Feb 20 → sheet title includes "2 SESSIONS" → both sessions listed

#### TC-DASH-10: Day Detail sheet shows outcome icon, project name, duration, notes
- Session: completed, "Alpha", 45 min, notes "Good session"
- Row shows: `✓`, "Alpha", `45M`, `"Good session"`

#### TC-DASH-11: Project breakdown lists top projects sorted by total minutes
- 3 projects; A: 60 min, B: 120 min, C: 30 min
- Order: B (120), A (60), C (30)

#### TC-DASH-12: Project breakdown bars are proportional to max project
- B has 120 min (max) → B bar at 100% width; A has 60 min → A bar at 50% width

#### TC-DASH-13: Deleted project shown as `"DELETED"` in breakdown
- Session references deleted project → appears with gray dot and "DELETED" label

#### TC-DASH-14: No sessions → breakdown shows EmptyState
- No sessions → "NO SESSIONS YET." EmptyState shown

### 13.3 History Tab

#### TC-DASH-15: Sessions grouped by date with date headers
- Sessions on Feb 21 and Feb 20 → two groups with headers "FEB 21, 2026" and "FEB 20, 2026"

#### TC-DASH-16: Project filter shows ALL PROJECTS + each active project
- 3 projects → dropdown has 4 options (ALL + 3 projects)

#### TC-DASH-17: Filtering by project shows only that project's sessions
- Filter by project A → only A's sessions shown

#### TC-DASH-18: Filter + no results shows correct empty state
- Filter by project with no sessions → "NO SESSIONS FOR [NAME]."

#### TC-DASH-19: Combo sessions shown as a single combo card
- 3 sessions with same `comboGroupId` → one combo card, not 3 individual cards

#### TC-DASH-20: Combo card shows total minutes and list of projects
- Combo: A (30 min) + B (20 min) → card shows "COMBO SESSION", "50M", "Project A", "Project B"

#### TC-DASH-21: Tapping a session card opens Edit Session sheet
- Click session card → Edit Session sheet opens with session data

### 13.4 Edit Session Sheet

#### TC-DASH-22: Edit sheet pre-fills outcome and notes
- Session with `outcome: 'partial'`, notes "test" → toggle shows `~` selected, textarea shows "test"

#### TC-DASH-23: Saving updates session in store
- Change outcome to `completed`, change notes → click SAVE → `updateSession` called with new values

#### TC-DASH-24: Cancel closes sheet without saving
- Change outcome → click CANCEL → `updateSession` not called, sheet closes

#### TC-DASH-25: Opening a different session resets form state
- Open session A (outcome: completed) → open session B (outcome: partial) → form shows `~`, not `✓`

---

## 14. Hook Tests

### 14.1 `useTimer`

All tests use `vi.useFakeTimers()` to control rAF and time.

#### TC-HOOK-01: rAF loop decrements `remainingSeconds` by 1 per second
- Start timer with 10 seconds → advance fake timer 5 seconds → `remainingSeconds === 5`

#### TC-HOOK-02: Timer phase transitions to `'finished'` at 0 seconds
- Start with 1 second → advance 1 second → `phase === 'finished'`

#### TC-HOOK-03: Timer navigates to `/complete` on finish with `outcome: 'completed'`
- Let timer reach 0 → `navigate` called with `{ outcome: 'completed' }`

#### TC-HOOK-04: `recordProjectElapsed` called every second with 1000ms
- Start timer, advance 3 seconds → `projectElapsedMs[projectId] === 3000`

#### TC-HOOK-05: Combo — advances to next project when current project timer reaches 0
- 2-project combo: project A = 1 min, project B = 2 min
- Advance 60 seconds → `currentProjectIndex === 1` (moved to project B)
- `remainingSeconds` resets to `120` (project B's duration)

#### TC-HOOK-06: Combo — `onProjectComplete` callback fires on natural advancement
- Provide `onProjectComplete` spy → advance to end of project A → spy called once

#### TC-HOOK-07: Page Visibility — single project time reconciled on return
- Start 300-second timer → background for 60 seconds → return
- `remainingSeconds` ≈ 240 (±1 second tolerance)

#### TC-HOOK-08: Page Visibility — finishes timer if elapsed exceeds remaining
- Start 30-second timer → background for 60 seconds → return
- `phase === 'finished'`

#### TC-HOOK-09: Pause stops rAF loop (no decrement while paused)
- Start timer, advance 2 sec → pause → advance 5 more sec → `remainingSeconds` unchanged

#### TC-HOOK-10: Wake Lock requested when phase = running
- `navigator.wakeLock.request` called with `'screen'` on start

#### TC-HOOK-11: Wake Lock released when phase = paused or finished
- Start → pause → `wakeLockSentinel.release` called

### 14.2 `usePWAInstall`

#### TC-HOOK-12: `canInstall` is `false` initially (no prompt event fired)
- Render hook → `canInstall === false`

#### TC-HOOK-13: `canInstall` becomes `true` after `beforeinstallprompt`
- Fire `beforeinstallprompt` event → `canInstall === true`

#### TC-HOOK-14: `promptInstall` calls `.prompt()` on the deferred event
- Fire event → call `promptInstall()` → event's `.prompt()` method called

#### TC-HOOK-15: `isInstalled` set to `true` after `appinstalled` event
- Fire `appinstalled` → `isInstalled === true`, `canInstall === false`

#### TC-HOOK-16: `isInstalled` initialized to `true` when display mode is standalone
- Mock `window.matchMedia` to return `{ matches: true }` → initial `isInstalled === true`

### 14.3 `useHydration`

#### TC-HOOK-17: Returns `false` before stores are hydrated
- Render before hydration → returns `false`

#### TC-HOOK-18: Returns `true` after both project and session stores hydrate
- Trigger hydration of both stores → hook returns `true`

---

## 15. Integration Tests — End-to-End Flows

### Flow A: First-time user adds a project and starts a session

**TC-FLOW-01:**
1. Mount app → Home screen visible (`hasSeenHome: false`)
2. Click LIBRARY → navigate to `/library`
3. `hasSeenHome` now `true`
4. Click `+ ADD` → form sheet opens
5. Fill: name "Reading", color "indigo", duration 30
6. Click SAVE → project appears in list
7. Click project card → StartSessionSheet opens
8. Click START → navigate to `/timer` with `{ projectIds: [id], totalMinutes: 30 }`

### Flow B: Returning user gets a suggestion and completes a session

**TC-FLOW-02:**
1. Mount with `hasSeenHome: true`, `lastVisitedTab: '/suggest'` → redirect to `/suggest`
2. Time selector shows 45 min (default)
3. SuggestionCard rendered for a project
4. Click START TIMER → `/timer` with `{ projectIds: [id], totalMinutes: 45 }`
5. Timer counts down; at 0 → navigate to `/complete` with `{ outcome: 'completed' }`
6. On complete page: select `✓ DONE`, add note, click SAVE
7. `addSession` called with correct data
8. Click GO HOME → navigate to `/`

### Flow C: Combo session with a skip

**TC-FLOW-03:**
1. Navigate to `/combo?minutes=90`
2. 3 combo cards visible; select combo 2
3. Click START THIS COMBO → `/timer` with 3 project IDs + comboGroupId
4. Timer starts for project 1; advance through it
5. Click SKIP on project 2 → confirm → project 2 marked partial, advance to 3
6. Let project 3 run to completion → navigate to `/complete`
7. On complete: project 1 = completed (locked), project 2 = partial (locked), project 3 = editable
8. Save → 3 session records created with shared `comboGroupId`

### Flow D: User quits early and checks dashboard

**TC-FLOW-04:**
1. Start timer → pause → click STOP & LOG
2. `/complete` with `outcome: 'partial'`
3. Save → click VIEW STATS → `/dashboard`
4. Overview tab: total sessions = 1, streak = 1, breakdown shows that project
5. Click HISTORY tab → session card visible with `~` partial icon

### Flow E: Dashboard edit session

**TC-FLOW-05:**
1. Navigate to `/dashboard`, history tab
2. Click a session card → Edit sheet opens
3. Change outcome from `partial` to `completed`, update notes
4. Click SAVE → `updateSession` called
5. Card in history updates to show `✓` icon and new notes

---

## 16. PWA & Offline Tests

These are manual tests run against `npm run preview` (production build).

#### TC-PWA-01: Installability — Chrome/Android
- Open app in Chrome on Android → install prompt appears (or browser shows install icon)
- Install → app opens in standalone mode, no browser chrome visible
- Verify `display: standalone` via `window.matchMedia('(display-mode: standalone)').matches`

#### TC-PWA-02: App icon renders on home screen
- After install: icon visible on Android home screen
- Icon uses pixel-art design (verifiable visually)

#### TC-PWA-03: Offline loading after first visit
- Load app → open DevTools → set Network to Offline → refresh
- Verify app loads fully (fonts may not load if Google Fonts not cached yet on first load)
- After second visit (fonts cached): all content loads offline

#### TC-PWA-04: Offline data persistence
- Add 2 projects offline → reload → projects still present (IDB persisted, no server dependency)

#### TC-PWA-05: Service worker precaches all assets
- In DevTools → Application → Service Workers → verify SW registered
- DevTools → Cache Storage → verify 15+ entries in precache

#### TC-PWA-06: SW update flow (manual test)
- Serve v1 → install SW → increment version → rebuild → open app in background tab
- Foreground tab shows `UPDATE AVAILABLE` banner → click RELOAD → page refreshes with v2

#### TC-PWA-07: Timer survives page backgrounding (Page Visibility)
- Start 5-min timer → switch to another app for 2 minutes → return
- Verify remaining time ≈ 3 minutes (not 5) — reconciliation worked

#### TC-PWA-08: Wake Lock prevents screen sleep during timer (manual)
- Start timer → do not interact → verify screen stays on for > device sleep timeout

#### TC-PWA-09: Viewport safe area on iPhone (notch/Dynamic Island)
- Open in Safari iOS → verify no content behind notch/home indicator
- BottomNav respects `env(safe-area-inset-bottom)`

#### TC-PWA-10: Web App Manifest fields correct
- Inspect `/manifest.webmanifest`:
  - `name: "EverProject"`
  - `display: "standalone"`
  - `start_url: "/"`
  - `background_color: "#0a0a0a"`
  - `theme_color: "#6366f1"`
  - Icons array has 4 entries (192, 512, 192-maskable, 512-maskable)

---

## 17. Accessibility Tests

#### TC-A11Y-01: All interactive elements have accessible labels
- All `<button>` elements have visible text or `aria-label`
- Verify with `axe-core` or browser accessibility tree

#### TC-A11Y-02: Color is not the sole conveyor of information
- Outcome icons use both icon symbol (`✓ ~ ✕`) and color — passes for color-blind users

#### TC-A11Y-03: Minimum touch target size ≥ 44×44px
- All tappable controls check: pixel buttons, combo pills, segmented options

#### TC-A11Y-04: Modals/dialogs have `role="dialog"` and `aria-modal="true"`
- BottomSheet and PixelDialog verify these attributes

#### TC-A11Y-05: Focus management in sheets
- Opening BottomSheet → focus moves to first interactive element inside
- Closing sheet → focus returns to trigger element

#### TC-A11Y-06: Escape key closes sheets and dialogs
- Covered by TC-COMP-13; re-verify in full-page context

---

## 18. Edge Cases & Boundary Conditions

#### TC-EDGE-01: `MAX_PROJECT_NAME_LENGTH = 30` enforced in UI and store
- 30 chars accepted; 31st char rejected

#### TC-EDGE-02: `MAX_NOTES_LENGTH = 500` enforced in both project notes and session notes
- 500 chars accepted; 501st rejected

#### TC-EDGE-03: Timer with `remainingSeconds = 0` immediately after start
- State `{ totalMinutes: 0 }` → timer should finish immediately or redirect back

#### TC-EDGE-04: Zero actual duration session (quit immediately)
- Start timer → quit in < 1 second → `actualDurationMs ≈ 0`
- Session saved with `actualDurationMinutes: 0` — valid

#### TC-EDGE-05: All projects archived — suggestion page shows correct empty state
- All projects archived → `getActiveProjects` returns `[]` → "NO PROJECTS IN LIBRARY." shown

#### TC-EDGE-06: Heatmap with 0 sessions — all cells are `heatmap-empty`
- Verify no colored cells when no sessions exist

#### TC-EDGE-07: Streak boundary — session 25 hours ago (yesterday) counts
- Session at yesterday 23:59 + session today 00:01 → streak = 2

#### TC-EDGE-08: `comboGroupId` uniqueness across sessions
- Run 3 combo sessions → all 3 have unique `comboGroupId` values between them

#### TC-EDGE-09: Navigating directly to `/timer` or `/complete` without state
- Both redirect to `/library` (not crash)

#### TC-EDGE-10: `suggestProject` returns same project with seed 0 deterministically
- Same input + same seed → same project returned (pure function)

#### TC-EDGE-11: Dashboard with 1000+ sessions — no crash/hang
- Seed store with 1000 sessions → dashboard renders, history tab paginates

#### TC-EDGE-12: Project name with special characters
- Name `"C++ / A#"` → stored and displayed without escaping issues

#### TC-EDGE-13: DURATION_OPTIONS boundary values
- 15 min session: start + save → stored correctly
- 180 min session: start + save → stored correctly

---

## 19. Manual Regression Checklist

Run before any release. Check each item on a real mobile device (iOS Safari + Android Chrome).

### General
- [ ] App loads in < 3 seconds on a mid-range device
- [ ] No white flash between page transitions
- [ ] All pixel fonts load (Press Start 2P, VT323)
- [ ] Bottom navigation is always visible on the 3 main tabs
- [ ] HOME button appears in Library and Dashboard headers
- [ ] Back button in Combo page returns to Suggest

### Home
- [ ] First launch shows home screen
- [ ] Subsequent launches skip home and go to last tab
- [ ] Clicking HOME in Library resets and shows home screen

### Project Library
- [ ] Add, edit, archive, delete all work
- [ ] Form validation prevents empty name and over-length
- [ ] Color picker selects and shows the right color
- [ ] Active projects sorted by most recent session
- [ ] Archived section toggles correctly

### Daily Suggestion
- [ ] All 7 time buttons work and re-suggest
- [ ] Suggestion card shows name, fit bar, recency
- [ ] Roll Again produces different results (with > 1 eligible project)
- [ ] START TIMER launches the timer with correct time

### Combo Suggestion
- [ ] Carousel swipes correctly with touch gestures
- [ ] Arrows and dots sync with carousel position
- [ ] START THIS COMBO launches with correct project IDs

### Pomodoro Timer
- [ ] Ring counts down visually in steps
- [ ] Ring color matches project
- [ ] Pause → screen dim allowed (Wake Lock released)
- [ ] Resume → screen stays on
- [ ] Quit dialog appears, navigates to /complete correctly
- [ ] Combo: next project header shown on advancement
- [ ] Combo pills update correctly

### Session Complete
- [ ] Correct header for completed / partial / abandoned
- [ ] Stars animate for completed outcome
- [ ] Outcome toggle interactive and defaults to correct value
- [ ] Notes saved correctly
- [ ] VIEW STATS and GO HOME disabled before save
- [ ] Confirmation if leaving unsaved

### Activity Dashboard
- [ ] Stats match actual session data
- [ ] Heatmap shows colored cells for days with sessions
- [ ] Tapping a cell opens Day Detail with correct sessions
- [ ] Edit session works from both Day Detail and History
- [ ] History filter works
- [ ] Infinite scroll loads more sessions

### PWA
- [ ] Install prompt appears on Android Chrome
- [ ] App launches from home screen in standalone mode
- [ ] App works offline after initial visit
- [ ] SW update banner appears when new version deployed

---

---

## 20. Component Tests — Layout Components

### 20.1 `BottomNav`

#### TC-NAV-01: Renders three tabs — LIBRARY, SUGGEST, STATS
- Mount inside `MemoryRouter` → verify 3 buttons with those labels

#### TC-NAV-02: Active tab has `aria-current="page"` and indigo styling
- Route `/library` → LIBRARY button has `aria-current="page"` and `text-[#6366f1]`
- Other two tabs have no `aria-current`

#### TC-NAV-03: Inactive tabs have no `aria-current`
- Route `/suggest` → only SUGGEST has `aria-current="page"`, others are `undefined`

#### TC-NAV-04: Clicking a tab calls `setLastVisitedTab` with the tab's path
- Mock `useSettingsStore` → click SUGGEST → `setLastVisitedTab('/suggest')` called once

#### TC-NAV-05: Clicking a tab navigates to that path
- Click STATS → `navigate('/dashboard')` called

#### TC-NAV-06: Active tab has indigo border-top highlight
- Active tab button has `border-[#6366f1]` class

---

### 20.2 `PageHeader`

#### TC-HDR-01: Title rendered in `<h1>`
- Render `<PageHeader title="PROJECT LIBRARY" />` → `<h1>` contains "PROJECT LIBRARY"

#### TC-HDR-02: Back button not rendered when `showBack` is `false` (default)
- Render without `showBack` → no `← BACK` button in DOM

#### TC-HDR-03: Back button rendered when `showBack = true`
- Render with `showBack={true}` → `← BACK` button visible

#### TC-HDR-04: Back button navigates to `backPath` when provided
- Render with `showBack={true}` `backPath="/suggest"` → click BACK → `navigate('/suggest')` called

#### TC-HDR-05: Back button calls `navigate(-1)` when `backPath` not provided
- Render with `showBack={true}` (no `backPath`) → click BACK → `navigate(-1)` called

#### TC-HDR-06: HOME button not rendered when `showHomeButton` is `false` (default)
- Render without `showHomeButton` → no HOME button

#### TC-HDR-07: HOME button rendered when `showHomeButton = true`
- Render with `showHomeButton={true}` → HOME button present

#### TC-HDR-08: HOME button calls `setHasSeenHome(false)` then navigates to `/`
- Mock `useSettingsStore` → click HOME → `setHasSeenHome(false)` called, then `navigate('/')` called

#### TC-HDR-09: `rightSlot` content rendered between title and HOME button
- Render with `rightSlot={<button>FILTER</button>}` → FILTER button present in header

#### TC-HDR-10: Custom `className` merged into header element
- Render with `className="extra-class"` → header element has `extra-class` in its class list

---

### 20.3 `Shell`

#### TC-SHELL-01: `BottomNav` and `PWAInstallBanner` rendered on non-fullscreen routes
- Render `<Shell />` with location `/library` → BottomNav present, PWAInstallBanner present

#### TC-SHELL-02: `BottomNav` hidden on `/timer` route
- Render with location `/timer` → BottomNav NOT in DOM

#### TC-SHELL-03: `BottomNav` hidden on `/complete` route
- Render with location `/complete` → BottomNav NOT in DOM

#### TC-SHELL-04: `UpdatePrompt` always rendered regardless of route
- Render with `/timer` → UpdatePrompt component present

#### TC-SHELL-05: Main content has `paddingBottom: 64` on non-fullscreen routes
- Location `/library` → `<main>` element has `paddingBottom: 64`

#### TC-SHELL-06: Main content has `paddingBottom: 0` on fullscreen routes
- Location `/timer` → `<main>` element has `paddingBottom: 0`

#### TC-SHELL-07: `<Outlet />` renders child route content
- Mock Outlet to return a `<div id="child-content" />` → verify it appears inside `<main>`

---

## 21. Unit Tests — Store Actions

### 21.1 `timerStore` Actions

All tests use Vitest directly (no RTL needed — pure Zustand state machine).
Reset store to `INITIAL_STATE` in `beforeEach` using `useTimerStore.setState(INITIAL_STATE)`.

#### TC-TIMER-01: `startTimer` sets phase to `'running'` and initialises fields
- Call `startTimer(['p1'], 45)` → verify:
  - `phase === 'running'`
  - `remainingSeconds === 2700` (45 × 60)
  - `currentProjectIndex === 0`
  - `projectIds === ['p1']`
  - `skippedProjectIds` is empty `[]`
  - `startedAt` is a recent timestamp (within 100ms)
  - `comboGroupId === null`

#### TC-TIMER-02: `startTimer` stores `comboGroupId` when provided
- Call `startTimer(['p1', 'p2'], 60, 'combo-abc')` → `comboGroupId === 'combo-abc'`

#### TC-TIMER-03: `pauseTimer` sets phase to `'paused'` from `'running'`
- `startTimer(...)` → `pauseTimer()` → `phase === 'paused'`

#### TC-TIMER-04: `pauseTimer` is a no-op from non-running phase
- `pauseTimer()` on idle state → `phase` remains `'idle'`

#### TC-TIMER-05: `resumeTimer` sets phase to `'running'` from `'paused'`
- `startTimer` → `pauseTimer` → `resumeTimer` → `phase === 'running'`

#### TC-TIMER-06: `resumeTimer` is a no-op from non-paused phase
- `resumeTimer()` on idle state → `phase` remains `'idle'`

#### TC-TIMER-07: `tickTimer` decrements `remainingSeconds` by 1 when running
- Set up `phase: 'running'`, `remainingSeconds: 10` → `tickTimer()` → `remainingSeconds === 9`

#### TC-TIMER-08: `tickTimer` transitions to `'finished'` at 0 remaining
- `remainingSeconds: 0`, `phase: 'running'` → `tickTimer()` → `phase === 'finished'`

#### TC-TIMER-09: `tickTimer` is a no-op when not running
- `phase: 'paused'`, `remainingSeconds: 30` → `tickTimer()` → `remainingSeconds` unchanged

#### TC-TIMER-10: `advanceCombo` increments `currentProjectIndex`
- Start combo `['p1', 'p2', 'p3']` → `advanceCombo()` → `currentProjectIndex === 1`

#### TC-TIMER-11: `advanceCombo` sets phase to `'finished'` on last project
- Set `currentProjectIndex: 2`, `projectIds: ['p1', 'p2', 'p3']` → `advanceCombo()` → `phase === 'finished'`

#### TC-TIMER-12: `skipProject` appends current project to `skippedProjectIds`
- Start `['p1', 'p2']` → `skipProject()` → `skippedProjectIds === ['p1']`

#### TC-TIMER-13: `skipProject` advances to next project (increments index)
- Start `['p1', 'p2']` → `skipProject()` → `currentProjectIndex === 1`

#### TC-TIMER-14: `skipProject` on last project sets phase to `'finished'`
- Start `['p1']` → `skipProject()` → `phase === 'finished'`

#### TC-TIMER-15: `finishTimer` always sets phase to `'finished'`
- `startTimer(...)` → `finishTimer()` → `phase === 'finished'`

#### TC-TIMER-16: `resetTimer` returns all fields to `INITIAL_STATE`
- After `startTimer` + several ticks → `resetTimer()` → state equals `INITIAL_STATE`
- Verify: `phase === 'idle'`, `remainingSeconds === 0`, `projectIds === []`, `skippedProjectIds === []`, `projectElapsedMs === {}`

#### TC-TIMER-17: `recordProjectElapsed` accumulates ms per project
- `recordProjectElapsed('p1', 1000)` → `projectElapsedMs['p1'] === 1000`
- `recordProjectElapsed('p1', 500)` again → `projectElapsedMs['p1'] === 1500`

#### TC-TIMER-18: `recordProjectElapsed` tracks multiple projects independently
- `recordProjectElapsed('p1', 2000)`, `recordProjectElapsed('p2', 3000)` →
  `projectElapsedMs['p1'] === 2000`, `projectElapsedMs['p2'] === 3000`

---

### 21.2 `settingsStore` Actions

Use `fake-indexeddb` to back the IDB calls. Reset the store state in `beforeEach`.

#### TC-SET-01: `hydrate` — loads default settings when IDB is empty
- Call `hydrate()` with empty DB → `settings === DEFAULT_SETTINGS`, `isHydrated === true`

#### TC-SET-02: `hydrate` — loads stored settings from IDB
- Pre-populate DB with `{ hasSeenHome: true, lastVisitedTab: '/library' }` → `hydrate()` →
  `settings.hasSeenHome === true`, `settings.lastVisitedTab === '/library'`

#### TC-SET-03: `hydrate` sets `isHydrated` to `true` regardless of DB state
- Empty DB → `hydrate()` → `isHydrated === true`

#### TC-SET-04: `setHasSeenHome(true)` updates Zustand state and persists to IDB
- Call `setHasSeenHome(true)` → `settings.hasSeenHome === true`
- Read DB directly → stored value is `true`

#### TC-SET-05: `setHasSeenHome(false)` updates Zustand state and persists to IDB
- Start with `hasSeenHome: true` → `setHasSeenHome(false)` → state and DB both `false`

#### TC-SET-06: `setLastVisitedTab('/library')` updates state and persists
- `setLastVisitedTab('/library')` → `settings.lastVisitedTab === '/library'`
- DB record reflects the new value

#### TC-SET-07: `setLastVisitedTab` does not clobber other settings fields
- Set `hasSeenHome: true` → `setLastVisitedTab('/suggest')` →
  `settings.hasSeenHome` still `true`

#### TC-SET-08: Repeated `hydrate` calls are idempotent
- Hydrate twice with the same data → `isHydrated` stays `true`, no error thrown

---

## 22. Component Tests — ProjectLibrary Sub-components

### 22.1 `ColorPicker`

#### TC-CLR-01: Renders all 15 color buttons (COLOR_PALETTE length)
- Render `<ColorPicker value="indigo" onChange={vi.fn()} />` → 15 buttons in DOM

#### TC-CLR-02: Selected color has `aria-pressed="true"`
- Render with `value="green"` → the `green` button has `aria-pressed={true}`, others have `aria-pressed={false}`

#### TC-CLR-03: Selected color shows checkmark `✓`
- Render with `value="red"` → `✓` text visible inside the `red` button; no `✓` in other buttons

#### TC-CLR-04: Clicking a color button calls `onChange` with that color
- Click the `blue` button → `onChange` spy called with `'blue'`

#### TC-CLR-05: Selected color button has white border highlight
- Render with `value="indigo"` → `indigo` button has `border-[#e8e8e8]` class

#### TC-CLR-06: Unselected buttons have `border-transparent`
- All buttons except the selected one have `border-transparent` class

#### TC-CLR-07: Button background color matches `COLOR_HEX_MAP[color]`
- Render → each button's `style.backgroundColor` matches the hex value for that color

---

### 22.2 `ProjectCard`

#### TC-CARD-01: Renders project name, duration badge, and play button
- Render a card with `project.name = "READING"`, `estimatedDurationMinutes: 45` →
  "READING" text present, `~45M` badge present, `▶` button present

#### TC-CARD-02: Tapping the card body calls `onStart` with the project
- Click the card body button → `onStart` spy called with the full project object

#### TC-CARD-03: Menu is hidden initially; opens on `···` button click
- Menu popup not in DOM → click `···` → menu items (EDIT, ARCHIVE, DELETE) visible

#### TC-CARD-04: Clicking backdrop overlay closes the menu
- Open menu → click the fixed inset overlay → menu disappears

#### TC-CARD-05: Menu `EDIT` action closes menu and calls `onEdit`
- Open menu → click `✎ EDIT` → menu closed, `onEdit` called with project

#### TC-CARD-06: Menu shows `ARCHIVE` for active projects
- `project.isArchived = false` → menu has `⊳ ARCHIVE`, not `UNARCHIVE`

#### TC-CARD-07: Menu shows `UNARCHIVE` for archived projects
- `project.isArchived = true` → menu has `⊳ UNARCHIVE`, not `ARCHIVE`

#### TC-CARD-08: `ARCHIVE` action closes menu and calls `onArchive` with project id
- Open menu → click `⊳ ARCHIVE` → menu closed, `onArchive('project-id')` called

#### TC-CARD-09: `UNARCHIVE` action closes menu and calls `onUnarchive` with project id
- `isArchived: true` → open menu → click `⊳ UNARCHIVE` → `onUnarchive('project-id')` called

#### TC-CARD-10: `DELETE` action opens the PixelDialog (does NOT call `onDelete` immediately)
- Open menu → click `✕ DELETE` → delete confirmation dialog visible, `onDelete` not yet called

#### TC-CARD-11: Delete dialog — clicking YES calls `onDelete` and closes dialog
- Confirm delete dialog → click YES → `onDelete('project-id')` called, dialog closed

#### TC-CARD-12: Delete dialog — clicking NO closes dialog without calling `onDelete`
- Confirm delete dialog → click NO → `onDelete` not called, dialog dismissed

#### TC-CARD-13: Delete dialog message includes project name uppercased
- `project.name = "Reading"` → dialog message contains `"DELETE \"READING\""` or `DELETE "READING"`

#### TC-CARD-14: Archived project name shown in muted `#888899` color
- `isArchived: true` → project name element has `text-[#888899]` class

#### TC-CARD-15: Archived project shows `[ARCHIVED]` tag next to duration badge
- `isArchived: true` → `[ARCHIVED]` span visible in card

---

### 22.3 `StartSessionSheet`

#### TC-SSS-01: Sheet is closed (`isOpen = false`) when `project` is `null`
- Render with `project={null}` → BottomSheet `isOpen={false}`, no content visible

#### TC-SSS-02: Sheet is open (`isOpen = true`) when project is provided
- Render with a valid project → BottomSheet `isOpen={true}`

#### TC-SSS-03: Shows project name and color dot when open
- Project `name: "Alpha"`, `color: "green"` → "Alpha" text visible, ColorDot with `color="green"` rendered

#### TC-SSS-04: Default selected duration matches project's `estimatedDurationMinutes`
- Project with `estimatedDurationMinutes: 60` → 60-minute button is highlighted (has indigo bg class)

#### TC-SSS-05: Clicking a different duration button highlights it and deselects the previous
- Default 60 → click "30" → 30 button highlighted, 60 button no longer highlighted

#### TC-SSS-06: START button navigates to `/timer` with correct payload
- Select 45 min → click `▶ START` → `navigate('/timer', { state: { projectIds: ['id'], totalMinutes: 45 } })` called

#### TC-SSS-07: START button calls `onClose` after navigating
- Click START → `onClose` spy called

#### TC-SSS-08: CANCEL button calls `onClose` without navigating
- Click CANCEL → `onClose` called, `navigate` not called

#### TC-SSS-09: Archived project shows `[ARCHIVED]` banner with yellow border
- `project.isArchived = true` → banner with `border-[#ffcc00]` and `[ARCHIVED]` text visible

#### TC-SSS-10: UNARCHIVE button in archived banner calls `onUnarchive` and `onClose`
- Archived project, `onUnarchive` provided → click UNARCHIVE → `onUnarchive('id')` called, `onClose` called

#### TC-SSS-11: UNARCHIVE button not shown when `onUnarchive` prop is not provided
- Archived project, `onUnarchive={undefined}` → UNARCHIVE button absent (only banner text shown)

#### TC-SSS-12: Active project shows no archived banner
- `project.isArchived = false` → no `[ARCHIVED]` banner visible

---

*End of Test Plan*
