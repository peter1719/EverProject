# Page 2: Daily Suggestion
**Route:** `/suggest` | **Tab:** 2 (Suggest icon)

---

## Purpose

Given how much time the user has right now, the app intelligently picks a single project to work on. The algorithm favors neglected projects, balances frequency, and fills the available time well. Users can re-roll for a different suggestion or jump to combo mode.

---

## Layout

```
┌─────────────────────────────┐
│  What's Next?               │  ← Headline, 24px
├─────────────────────────────┤
│                             │
│  How much time?             │
│                             │
│  ┌──┬──┬──┬──┬──┬──┬──┐   │
│  │15│30│45│60│90│120│180│  │  ← segmented buttons (outlined/filled)
│  └──┴──┴──┴──┴──┴──┴──┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ ● Project Name      │   │  ← SuggestionCard (surface-variant)
│  │   ~45 min           │   │
│  │   Last: 5 days ago  │   │
│  │   [notes excerpt]   │   │
│  └─────────────────────┘   │
│                             │
│  [ ↻ Roll Again ]          │  ← outlined button
│                             │
│  [ ▶ Start Timer ]         │  ← filled primary button
│  [ Try Combo → ]           │  ← tonal button
│                             │
└─────────────────────────────┘
     BottomNav
```

---

## Components

### TimeInput (segmented buttons)
7 buttons: `15`, `30`, `45`, `60`, `90`, `120`, `180` (minutes).
- Only one selected at a time (default: `45`)
- Selected state: `bg-primary text-on-primary` (filled)
- Unselected state: `border border-outline text-on-surface bg-transparent` (outlined)
- `rounded-full` pill shape, consistent with MD3 segmented button style
- Tapping re-runs suggestion algorithm immediately

### SuggestionCard
```
┌──────────────────────────────┐  ← surface-variant bg, rounded-xl, 4px left accent bar in project color
│ ●  Project Name              │  ← colored circle + name, 16px body
│    ~45 min  [──────────]     │  ← duration + smooth linear progress bar (4px, rounded)
│    Last: 5 days ago          │  ← recency line, 14px, on-surface-variant
│    "notes excerpt..."        │  ← first 80 chars, 14px body
└──────────────────────────────┘
```

The progress bar shows how well the project fills the available time (duration fit score). Filled = tight fit; mostly empty = lots of slack. Bar is `h-1 rounded-full bg-primary`.

### Action Buttons
- **Roll Again** — outlined button; card fades out + slides up (150ms ease-out) on tap, then new card fades in
- **Start Timer** — filled primary button; navigate to `/timer`
- **Try Combo** — tonal button; navigate to `/combo`

---

## Algorithm Summary

`suggestProject(context)` → single `Project | null`

1. **Filter**: `estimatedDurationMinutes <= availableMinutes`
2. **Score each project**:
   - **Recency** (50%): days since last session / 14, capped at 1.0. Never-done = 1.0
   - **Frequency** (30%): penalizes projects worked heavily in last 30 days
   - **Duration fit** (20%): prefers projects that fill the time well (less slack)
3. **Weighted random pick** from scored pool

"Roll Again" reruns with a new random seed.

---

## State & Data Flow

- **Local state**: `availableMinutes` (default 45), `suggestionSeed` (incremented on re-roll)
- **Read from stores**: all active projects + all sessions
- **On "Start Timer"**: navigate to `/timer` with `{ projectIds: [id], totalMinutes: availableMinutes }`
- **On "Try Combo"**: navigate to `/combo?minutes=N` (URL param, not router state — survives back navigation)

---

## UI Details

### Suggestion Card Transition
When "Roll Again" is tapped:
1. Current card fades out + translates up 8px: `opacity 0, translateY(-8px)` — 150ms ease-in
2. New suggestion loaded
3. New card fades in + translates from below: `opacity 1, translateY(0)` — 150ms ease-out

### Duration Fit Bar
```
[████████░░]  ~45 min  (fits 45/60 = 75%)
[██████████]  ~60 min  (fits 60/60 = 100%)
[████░░░░░░]  ~30 min  (fits 30/60 = 50%)
```
`h-1 rounded-full`, filled segment in project color, background `bg-outline/20`.

---

## Edge Cases

- **No active projects**: EmptyState — "No projects in library." with link to Library tab
- **No project fits the time**: "Nothing fits X min." + dimmed "Try a longer time." — TimeInput still accessible
- **Only 1 project fits**: Show it; disable Roll Again at `opacity-38` (not hidden — hidden looks like a bug)
