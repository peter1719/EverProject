# Architecture

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Routing | React Router DOM v7 (`createHashRouter`) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| State | Zustand v5 + Immer |
| Persistence | IndexedDB via `idb` v8 |
| PWA | vite-plugin-pwa + Workbox v7 (`injectManifest` strategy) |
| Forms | React Hook Form v7 + Zod v4 |
| i18n | Custom `useTranslation` hook + `src/i18n/translations.ts` |
| Drag & Drop | dnd-kit (Library custom sort) |

---

## Project Structure

```
src/
├── types/index.ts          # All TS interfaces
├── db/
│   ├── schema.ts           # idb DBSchema (6 object stores)
│   ├── index.ts            # getDB() cached connection, upgrade logic v1→v6
│   └── timerDraft.ts       # saveTimerDraft / loadTimerDraft / clearTimerDraft
├── store/
│   ├── projectStore.ts     # Project CRUD + IDB persistence
│   ├── sessionStore.ts     # Session append + selectors + image management
│   ├── timerStore.ts       # Ephemeral timer state machine (NOT persisted)
│   ├── settingsStore.ts    # Theme / language / style / tab / custom order
│   └── todoStore.ts        # Todo CRUD per project
├── algorithms/
│   ├── suggestion.ts       # Single suggestion (62.5% recency + 37.5% frequency)
│   └── combo.ts            # Combo suggestions (top 3 multi-project sets)
├── hooks/
│   ├── useTimer.ts         # rAF countdown + Page Visibility compensation + Wake Lock + draft save
│   ├── useHydration.ts     # Wait for all 3 stores to hydrate
│   ├── usePWAInstall.ts    # BeforeInstallPromptEvent handler
│   ├── useTheme.ts         # Theme switch (system/light/dark) via html[data-theme]
│   ├── useAppStyle.ts      # App style selector
│   ├── useIsLandscapeUI.ts # Landscape detection (debounced 150ms, width≥480 && width>height)
│   ├── useSessionImage.ts  # Lazy-load session image, version-tracked re-fetch
│   └── useTranslation.ts   # i18n hook with string interpolation
├── pages/
│   ├── Home/               # / — redirects to lastVisitedTab immediately
│   ├── ProjectLibrary/     # /library (Tab 1)
│   ├── DailySuggestion/    # /suggest (Tab 2)
│   ├── ComboSuggestion/    # /combo?minutes=N
│   ├── PomodoroTimer/      # /timer (full-screen)
│   ├── SessionComplete/    # /complete (full-screen)
│   ├── ActivityDashboard/  # /dashboard (Tab 3)
│   └── Settings/           # /settings (full-screen)
├── components/
│   ├── layout/             # Shell, BottomNav, PageHeader
│   └── shared/             # Button, Card, ColorDot, EmptyState, FlipClock, etc.
├── landscape/              # Landscape UI (LandscapeApp + mirrored pages)
└── lib/
    ├── constants.ts        # DB_NAME, COLOR_PALETTE, COLOR_BG_MAP, DURATION_OPTIONS
    ├── utils.ts            # cn(), formatDuration(), toDateString(), daysBetween()
    ├── imageUtils.ts       # compressImage() — resize to 1024×1024, JPEG 65%
    └── backup.ts           # exportData() / importData()
```

---

## Routing

Uses **Hash Router** (`createHashRouter`) — URL format is `/#/library`, avoiding PWA server-side routing issues.

| Route | Component | Tab | Notes |
|-------|-----------|-----|-------|
| `/` | Home | — | Redirects to lastVisitedTab |
| `/library` | ProjectLibrary | 1 | |
| `/suggest` | DailySuggestion | 2 | |
| `/combo` | ComboSuggestion | — | URL param `?minutes=N` (not router state — survives back nav) |
| `/timer` | PomodoroTimer | — | Full-screen, no BottomNav |
| `/complete` | SessionComplete | — | Full-screen, no BottomNav |
| `/dashboard` | ActivityDashboard | 3 | |
| `/settings` | Settings | — | Full-screen, no BottomNav |

BottomNav is shown only on `/library`, `/suggest`, `/dashboard`.

---

## State Management

| Store | IDB Persisted | Purpose |
|-------|--------------|---------|
| `projectStore` | ✓ `projects` store | Project CRUD |
| `sessionStore` | ✓ `sessions` + `sessionImages` | Session records + photos |
| `timerStore` | ✗ ephemeral, resets on reload | Timer state machine; crash recovery via `timerDraft` |
| `settingsStore` | ✓ `settings` store | Theme / language / style / tab / custom order |
| `todoStore` | ✓ `todos` store | Per-project todo items |

### Hydration Sequence

`useHydration` waits for `projectStore`, `sessionStore`, and `settingsStore` to hydrate before rendering. `todoStore` hydrates on-demand via `loadTodos(projectId)`. `timerStore` intentionally never hydrates, but crash recovery reads from the `timerDraft` IDB store on timer page mount.

---

## IndexedDB

Database name: `ever-project-db`, version: **6**

| Version | Change |
|---------|--------|
| v1 | Create `projects`, `sessions`, `settings` |
| v2 | Add `sessionImages` |
| v3 | Add `todos` |
| v4 | Add `timerDraft` |
| v5 | Defensive timerDraft (dev-env patch) |
| v6 | Migration: backfill `projectDurationMinutes` on existing projects |

---

## PWA Strategy

- `injectManifest` strategy — manual SW control prevents mid-timer auto-update
- Hash routing prevents 404 on PWA navigation
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` for iPhone notch
- Wake Lock API (`navigator.wakeLock.request('screen')`) keeps screen on while timer runs

---

## App Styles

4 visual themes applied via `html[data-style="..."]` (separate from light/dark theme):

| Style | Characteristics |
|-------|----------------|
| `classic` (default) | Warm amber/orange, DM Sans font |
| `pixel` | Pixel art, DM Mono font, `border-radius: 0 !important` |
| `paper` | Blue ink on paper, dotted background on main, ruled lines on timer page |
| `zen` | Green on neutral tones |
