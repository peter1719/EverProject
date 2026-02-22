# Page 4: Pomodoro Timer
**Route:** `/timer` | **Tab:** None (full-screen, no BottomNav)

---

## Purpose

A focused, distraction-free countdown screen. Counts down the planned session, handles pause/resume, shows a smooth progress ring, prevents screen sleep, and handles background/foreground reconciliation. For combo sessions, advances through each project sequentially.

---

## Layout

**Running state:**
```
┌─────────────────────────────┐
│  [✕ Quit]                   │  ← small outlined button top-left
├─────────────────────────────┤
│                             │
│  ● Project Name             │  ← current project header, 20px title
│    (Project 1 of 3)         │  ← combo subtitle (hidden for single)
│                             │
│   ┌─────────────────────┐   │
│   │                     │   │  ← progress ring (react-circular-progressbar)
│   │       12:34         │   │  ← countdown, 32px display, on-surface
│   │                     │   │     smooth arc, strokeLinecap="round"
│   └─────────────────────┘   │
│                             │
│  [●][●][○][○]               │  ← combo pills (hidden for single)
│                             │
│        [ ❚❚ Pause ]         │  ← filled primary button
│   [ ⏭ Skip Project ]       │  ← outlined button (see below)
│                             │
└─────────────────────────────┘
```

**Paused state:**
```
│        [ ▶ Resume ]         │  ← filled primary button
│  [ ⏹ Stop & Log ]          │  ← tonal button
│   [ ⏭ Skip Project ]       │  ← outlined button (see below)
```

---

## Components

### TimerRing
`react-circular-progressbar` with MD3 styling:
- **Stroke**: 10–12px wide
- **Progress style**: `strokeLinecap="round"` — smooth rounded ends
- **Color**: project's assigned color (from palette)
- **Background track**: `surface-variant` color
- **Center text**: remaining time in `MM:SS`, 32px display font, `on-surface`
- **Progress**: updates smoothly every second (`transition: stroke-dashoffset 1s ease-out`)

### Project Header
```
●  Project Name
   Project 2 of 3           ← only for combos
```
Colored circle dot (`rounded-full`, 12px) + name, 20px title. Subtitle in `on-surface-variant`, 14px.

### Combo Progress Pills
```
[●] [●] [○] [○]
```
- Filled `bg-primary`: completed
- Pulsing `bg-primary` with subtle scale animation: current
- `bg-outline/30`: upcoming
- Tap a completed pill to see project name tooltip

### Timer Controls
Large, centered MD3 buttons (`h-14 w-full`):
- **Running**: `[ ❚❚ Pause ]` — filled primary
- **Paused**: `[ ▶ Resume ]` (filled primary) + `[ ⏹ Stop & Log ]` below it (tonal)
- **Finished**: auto-navigates; shows brief "Complete!" scale-up with `success` color fill

### Skip Project Button (`⏭ Skip Project`)
Outlined button, shown in both running and paused states.

**Enabled/disabled rules:**
- **Single-project session**: always rendered but dimmed/disabled — nothing to skip to
- **Last project in a combo**: dimmed/disabled — no next project
- **Any other combo project**: active

**On tap (when active):**
Fires an MD3 confirmation dialog:
```
┌──────────────────────────────┐
│  Skip project?               │
│  ● Project Name              │
│  Time so far: 3:20           │
│                              │
│  [Yes, skip]  [Keep going]   │
└──────────────────────────────┘
```
- **YES, SKIP**: logs elapsed time for the current project as `partial`, advances to next project (same `"NEXT!"` flash as natural advancement), starts next project's full `estimatedDurationMinutes`
- **KEEP GOING**: dismisses dialog, timer resumes if it was running

**What gets logged for a skipped project:**
- `outcome: 'partial'`
- `actualDurationMinutes`: time actually spent before skip
- Stored in `timerStore.skippedProjectIds[]` — written as a `Session` record on `/complete` alongside completed projects

### Quit Button (✕ Quit)
- Top-left, small outlined button
- Taps → MD3 dialog:
  ```
  ┌───────────────────────────┐
  │  Quit session?            │
  │  Progress will be saved.  │
  │                           │
  │  [Yes, quit]  [Keep going]│
  └───────────────────────────┘
  ```

---

## `useTimer` Hook

Manages the timer state machine using `requestAnimationFrame`:

```
idle → running → paused → running → ... → finished
                                         ↓
                                  (auto → /complete)
```

**Key behaviors:**
- **rAF loop**: decrements `remainingSeconds` every ~1000ms
- **Page Visibility API**: on hide, records `backgroundedAt`. On show, computes elapsed and adjusts `remainingSeconds` — prevents drift from OS backgrounding
- **Wake Lock**: `navigator.wakeLock.request('screen')` while running; released on pause/stop
- **Haptic**: `navigator.vibrate(10)` on pause, resume, finish, skip
- **Combo advancement**: when one project's timer hits 0 (or user skips), advance to next project (brief "Next!" fade-in flash, 300ms ease-out)
- **Skip**: records `currentProjectIndex` into `skippedProjectIds`, resets `remainingSeconds` to next project's `estimatedDurationMinutes * 60`, increments `currentProjectIndex`

---

## State & Data Flow

- **Receives via router state**: `{ projectIds, totalMinutes, comboGroupId? }`
- **Zustand `timerStore`** (ephemeral — not persisted to IDB):
  - `phase`, `projectIds`, `currentProjectIndex`
  - `plannedDurationMinutes`, `remainingSeconds`
  - `startedAt`, `comboGroupId`
  - `skippedProjectIds: string[]` — project IDs skipped mid-combo
  - `projectElapsedMs: Record<string, number>` — actual ms spent per project (tracked as timer runs, used on /complete)
- **On finish/stop/skip-all**: navigate to `/complete` with `{ actualDurationMs, projectIds, comboGroupId, outcome, plannedDurationMinutes, skippedProjectIds, projectElapsedMs }`

---

## Background Reconciliation

**Single-project session:**
1. User backgrounds app → `backgroundedAt = Date.now()`
2. User returns → `elapsed = Date.now() - backgroundedAt`
3. `remainingSeconds -= Math.floor(elapsed / 1000)`
4. If `remainingSeconds <= 0` → timer finished while backgrounded → go to `/complete` immediately

**Combo session (multi-project):**
Must walk through projects in order, as elapsed time may span more than one:
1. User backgrounds → `backgroundedAt = Date.now()`
2. User returns → `remainingElapsedMs = Date.now() - backgroundedAt`
3. Walk forward through projects starting from `currentProjectIndex`:
   - If `remainingElapsedMs >= remainingSeconds * 1000`:
     - Record that project as completed (log elapsed time into `projectElapsedMs`)
     - `remainingElapsedMs -= remainingSeconds * 1000`
     - Advance to next project; reset `remainingSeconds` to that project's full duration
     - Repeat
   - Else:
     - `remainingSeconds -= Math.floor(remainingElapsedMs / 1000)`
     - Stop walking
4. If all projects exhausted → go to `/complete` immediately

---

## UI Details

### Ring Progress
The ring arc updates smoothly every second:
- `transition: stroke-dashoffset 1s ease-out` — continuous smooth movement
- No stepping or chunking

### Complete! Animation
When timer finishes naturally:
1. Ring fills completely (`success` color)
2. "Complete!" text appears in center — scales up from 80% to 100%, 300ms ease-out
3. Haptic vibration pattern: `[100, 50, 100]`
4. After 1.5 seconds, navigate to `/complete`

---

## Edge Cases

- **Natural finish**: Animation → auto-navigate to `/complete` with `outcome: 'completed'`
- **Stop early**: Navigate to `/complete` with `outcome: 'partial'`
- **Quit (abandon)**: Navigate to `/complete` with `outcome: 'abandoned'`
- **Screen lock**: Wake Lock released; timer reconciles elapsed time on return
- **Page refresh**: `timerStore` not persisted → timer resets to idle (session data lost — acceptable trade-off for simplicity)
- **All projects skipped except last**: Last project cannot be skipped (button disabled). User must either let it run to completion or tap `[ ⏹ STOP & LOG ]`. `/complete` will show all skipped projects as `partial` + last project with outcome toggle.
