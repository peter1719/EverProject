# EverProject PWA — Overview

A mobile-first Progressive Web App (installable on iPhone + Android) for managing personal projects and staying productive via time-aware suggestions, a Pomodoro timer, and activity tracking.

---

## Visual Style: Material Design 3

The entire app uses a clean Material Design 3 aesthetic:

- **Font**: Roboto / system-ui fallback. Sentence case everywhere; badges and tags may use ALL CAPS.
- **Borders**: Subtle 1px dividers (`outline` color token) — no hard offset shadows.
- **Corners**: 12–16px border-radius on cards; 12px on buttons; `rounded-full` for pills and dots.
- **Colors**: MD3 semantic tokens — `surface`, `on-surface`, `primary`, `error`, `success`, `warning`. Supports both light and dark mode via system preference. Project colors use an indigo-based palette.
- **Icons**: Lucide (already used) — standard stroke style, 24px.
- **Animations**: `ease-out` 250–300ms for transitions; 100ms for instant feedback. Respect `prefers-reduced-motion`.
- **Empty states**: Simple Lucide icon (48px) + title + body text.
- **Buttons**: Three variants — filled (`bg-primary`), tonal (`bg-primary-container`), outlined (`border-outline`). Press: `active:opacity-80` at 100ms.

---

## Pages Summary

| # | Route | Tab | Title | Purpose |
|---|---|---|---|---|
| 0 | `/` | — (home) | EverProject | Landing screen: Library or Get Suggestion |
| 1 | `/library` | Tab 1 (Library) | My Library | Browse + manage projects; tap one to start directly |
| 2 | `/suggest` | Tab 2 (Suggest) | What's Next? | Get a smart suggestion for your available time |
| 3 | `/combo` | — (from /suggest) | Combo Mode | Multi-project combos for a larger time block |
| 4 | `/timer` | — (full-screen) | [Project Name] | Countdown timer |
| 5 | `/complete` | — (full-screen) | Session Saved | Log outcome after a session |
| 6 | `/dashboard` | Tab 3 (Stats) | Activity | Overview tab (heatmap, stats, breakdown) + History tab (full session log) |

---

## User Flow

```
         ┌─────────────────────────────────┐
         │          HOME  (/)              │
         │  [Library] [▶Suggest] [History] │
         └──────────┬──────────────────────┘
                    │
          ┌────────┬───────────┬─────────┐
          │        │           │         │
          ▼        ▼           ▼         ▼
      Library   Suggest──→Combo      History
      (tap project)            |           |
          |                    └─────┬─────┘
          |                          |
          └──────────────────────────┘
                          |
                          ▼
                       Timer
                          |
                          ▼
                   Session Complete
                     |         |
                     ▼         ▼
                 Dashboard    Home
```

**Path A — Direct pick:**
1. User opens app → Home screen
2. Taps "Library" → goes to Library
3. Next visit: taps a project card → Timer starts immediately

**Path B — Suggestion:**
1. User opens app → Home screen
2. Taps "Get Suggestion" → Suggest page
3. Selects available time → app suggests a project → Start Timer
4. (Optional) Tries Combo mode instead

---

## Navigation

```
Bottom Nav (persistent, 3 tabs):
  [Library]  [Suggest]  [Dashboard]

Home (/): shown only on first open or via app icon re-launch
Full-screen pages (no BottomNav):
  /timer     /complete
No-tab pages (back button only):
  /combo
```

After first use, the app opens directly to `/suggest` (or last visited tab) instead of the home screen.

---

## Data Architecture

```
IndexedDB (via idb library)
├── projects store     ← Project records (CRUD)
├── sessions store     ← Session records (append-only)
└── settings store     ← App settings (e.g. hasSeenHome flag)

Zustand stores (in-memory, synced to IDB)
├── projectStore       ← Project CRUD + IDB persistence
├── sessionStore       ← Session append + computed selectors
└── timerStore         ← Ephemeral timer state (NOT persisted)
```

---

## Key Design Principles

1. **Clean & simple**: All UI elements follow Material Design 3 — clear hierarchy, readable typography, semantic colors
2. **Two entry points**: Home screen gives users a clear fork: manage projects OR get a suggestion
3. **Direct launch**: Tapping a project in Library can go straight to the Timer (no forced suggestion step)
4. **Mobile-first**: 44px minimum touch targets, safe-area padding, bottom sheets over modals
5. **Offline-first**: All data in IndexedDB; Service Worker precaches all assets
6. **Privacy**: All data stored locally — no server, no accounts, no cloud sync

---

## Document Index

- [00 - Overview (this file)](./00-overview.md)
- [00a - Home Screen](./00a-home-screen.md)
- [01 - Project Library](./01-project-library.md)
- [02 - Daily Suggestion](./02-daily-suggestion.md)
- [03 - Combo Suggestion](./03-combo-suggestion.md)
- [04 - Pomodoro Timer](./04-pomodoro-timer.md)
- [05 - Session Complete](./05-session-complete.md)
- [06 - Activity Dashboard](./06-activity-dashboard.md)
- [07 - Data Model](./07-data-model.md)
- [09 - Coding Style Guide](./09-coding-style.md)
