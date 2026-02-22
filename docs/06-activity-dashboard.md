# Page 6: Activity Dashboard
**Route:** `/dashboard` | **Tab:** 3 (Stats icon)

---

## Purpose

One page for all activity — switch between a visual **Overview** (heatmap, stats, project breakdown) and a scrollable **History** (full chronological session log). Clean analytics dashboard with clear data hierarchy.

---

## Layout

```
┌─────────────────────────────┐
│  Activity          [ Home ] │  ← Headline + tonal home button
├─────────────────────────────┤
│  [ Overview ] [ History ]   │  ← segmented toggle (outlined/filled)
├─────────────────────────────┤
│                             │
│  (view content below)       │
│                             │
├─────────────────────────────┤
│       BottomNav             │
└─────────────────────────────┘
```

---

## View Toggle

Segmented control with two options:

```
[ Overview ] [ History ]
```

- Selected: `bg-primary text-on-primary`, `rounded-xl`
- Unselected: `border border-outline text-on-surface bg-transparent`, `rounded-xl`
- Switches instantly (no animation — just swap content)
- Default: `Overview`
- If navigated from Home via `[ Activity History ]` button (`/dashboard?view=history`): pre-selects `History`

---

## OVERVIEW Tab

```
┌─────────────────────────────┐
│  [ OVERVIEW ] [ HISTORY ]   │
├─────────────────────────────┤
│                             │
│  ┌──────┬──────┬─────────┐ │
│  │  24  │  18H │  🔥 5   │ │  ← StatsPanel (3 tiles)
│  │ SESS │  30M │  DAYS   │ │
│  └──────┴──────┴─────────┘ │
│                             │
│  ACTIVITY — LAST 12 WEEKS   │
│  ┌─────────────────────┐   │
│  │ M ░ ▒ ▓ █ ░ ░ ▒ ▓  │   │  ← HeatmapPanel
│  │ T ░ ░ ░ ▒ ░ █ ░ ░  │   │
│  │ W ▒ ░ █ ░ ▒ ░ ░ ▒  │   │
│  │ ...                 │   │
│  └─────────────────────┘   │
│                             │
│  TIME BY PROJECT            │
│  ┌─────────────────────┐   │
│  │ █ PROJECT A ████ 4H │   │  ← ProjectBreakdown
│  │ █ PROJECT B ███  2H │   │
│  │ █ PROJECT C ██   1H │   │
│  └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

### StatsPanel (3 tiles)
Three equal-width tiles in a row, `bg-surface-variant rounded-xl`:
| Tile | Value | Label |
|---|---|---|
| Total Sessions | `24` | `Sessions` |
| Total Time | `18h 30m` | `Focused` |
| Current Streak | `🔥 5` | `Day streak` |

- Numbers: 28px, Roboto 700 (`text-3xl font-bold`), `on-surface`
- Labels: 12px, 500 weight, `on-surface-variant`
- Streak tile: flame emoji + number; if streak = 0, shows `○ 0` (no flame)
- On mount: count-up animation from `0` using `ease-out` over 600ms

### HeatmapPanel
`react-calendar-heatmap` with MD3 tonal indigo scale:
- Each cell = 1 day, rendered as a small square (10×10px), `rx:2, ry:2` (slightly rounded)
- Color scale (light mode / dark mode):
  - 0 sessions: `surface-variant` — near-empty
  - 1–2 sessions: `#C5C1FF` / `#4942C9` — dim indigo
  - 3–4 sessions: `#9B97F5` / `#6366F1` — mid indigo
  - 5+ sessions: `#6366F1` / `#C5C1FF` — full primary
- Cell gap: `2px`
- Scrolls horizontally on mobile (most recent weeks on right)
- **Week alignment**: always start from the most recent completed Monday, going back 12 full weeks — prevents partial columns on the left edge
- Week row labels on left: `M T W T F S S`
- Tap a cell → opens **Day Detail panel** (slide-up sheet):
  ```
  ┌──────────────────────────────┐
  │  Feb 15 — 3 sessions         │
  │                              │
  │  ✓ Project Alpha  38 min     │  ← outcome icon + name + duration
  │    "Finished chapter 4"      │  ← session notes, 14px, on-surface-variant
  │  ─────────────────────────── │
  │  ~ Project Beta   12 min     │
  │    (no notes)                │
  │  ─────────────────────────── │
  │  ✓ Project Alpha  45 min     │
  │    "Good flow today"         │
  └──────────────────────────────┘
  ```
  Tapping a session row in the Day Detail panel opens the **Edit Session sheet**

### ProjectBreakdown (bar chart)
One row per project (top 10 by time), sorted descending:
```
● Project Name  [████████░░░░]  4h 20m
● Project B     [█████░░░░░░░]  2h 10m
```
- Colored circle = project color, `rounded-full`, 12px
- Bar = CSS `width` percentage, `h-2 rounded-full`, filled in project color; background `bg-outline/20`
- No hard border on bars
- Bars animate from 0% to full width on mount: `ease-out` over 400ms
- Right side: time formatted (`4h 20m`)
- If more than 10 projects: `+ X more` in `on-surface-variant`

---

## HISTORY Tab

```
┌─────────────────────────────┐
│  [ OVERVIEW ] [ HISTORY ]   │
├─────────────────────────────┤
│  [ ALL PROJECTS ▼ ]         │  ← project filter
│                             │
│  FEB 21, 2026 ───────────   │  ← date group header
│  ┌─────────────────────┐   │
│  │ ✓ █ Project Alpha   │   │
│  │   45 MIN            │   │
│  │   "Finished ch. 4"  │   │
│  └─────────────────────┘   │
│                             │
│  FEB 20, 2026 ───────────   │
│  ┌─────────────────────┐   │
│  │ ~ █ Project Beta    │   │
│  │   12 MIN            │   │
│  │   (no notes)        │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ ✓ █ Project Alpha   │   │
│  │   38 MIN            │   │
│  │   "Good flow today" │   │
│  └─────────────────────┘   │
│  ... (infinite scroll)      │
└─────────────────────────────┘
```

### Project Filter
Dropdown: `[ All Projects ▼ ]`
- Options: "ALL PROJECTS" + one entry per project (color dot + name)
- Filtering updates the list immediately

### Session Card
`bg-surface-variant rounded-xl p-4`:
```
┌──────────────────────────────────┐
│  ✓  ●  Project Name   45 min    │
│     "Notes excerpt here..."      │
└──────────────────────────────────┘
```
- **Outcome icons**: `✓` `text-success`, `~` `text-warning`, `✕` `text-error`
- Tap card → opens **Edit Session sheet**
- Combo sessions shown as one card:
  ```
  ┌──────────────────────────────────┐
  │  ✓  Combo session       80 min  │
  │     ● Project Alpha              │
  │     ● Project Beta               │
  │     "Both went well"             │
  └──────────────────────────────────┘
  ```

### Date Group Header
```
Feb 21, 2026  ──────────────────
```
12px label, `on-surface-variant`, with a 1px `outline/30` horizontal divider line.

### Infinite Scroll
Render sessions in batches of 20; load more on scroll-to-bottom via `IntersectionObserver` on a sentinel element.

---

## Edit Session Sheet
Reused by both Overview (Day Detail tap) and History (session card tap).

```
┌──────────────────────────────┐
│  Edit session                │
│  ● Project Alpha — Feb 15    │
│                              │
│  Outcome                     │
│  [ ✓ Done ] [ ~ Part ] [✕]  │
│                              │
│  Notes                       │
│  ┌──────────────────────┐   │
│  │ Finished chapter 4   │   │
│  └──────────────────────┘   │
│                              │
│  [ Save ]  [ Cancel ]        │
└──────────────────────────────┘
```
- Only `outcome` and `notes` are editable — timestamps and duration are locked
- `[ SAVE ]` calls `sessionStore.updateSession(id, { outcome, notes })`

---

## Computed Selectors (in `sessionStore`)

```typescript
getTotalSessionCount(): number                  // non-abandoned sessions
getTotalMinutes(): number                       // sum of actualDurationMinutes
getCurrentStreak(): number                      // consecutive days with ≥ 1 session
getDailyActivity(days: 84): DailyActivity[]     // for heatmap
getProjectTotals(): ProjectTotal[]              // for breakdown chart
getSessionsForDay(date: string): Session[]      // for Day Detail panel
getSessionsForHistory(filterProjectId?: string): Session[]  // all sessions DESC for History tab
```

---

## State & Data Flow

- **Read from**: `sessionStore` + `projectStore`
- **Local state**:
  - `activeView: 'overview' | 'history'` — defaults to `'overview'`; set to `'history'` if URL param `?view=history` is present
  - `filterProjectId: string | null` — project filter for History tab
- **Mutations**: Edit Session sheet calls `sessionStore.updateSession()`

---

## Streak Calculation

1. Get all unique session days (YYYY-MM-DD) with ≥ 1 non-abandoned session
2. Sort descending
3. Start from today (include today if sessions exist) or yesterday — count consecutive days backward
4. Stop at first missing day; return count

---

## UI Details

### Heatmap Cell Rendering
```css
.react-calendar-heatmap rect {
  rx: 2;
  ry: 2;
}
```
Slightly rounded corners — consistent with MD3 radius scale.

### Stat Tile Count-Up Animation
```
0 → ... → 24   (smooth ease-out over 600ms)
```
Use `requestAnimationFrame` with `easeOut` interpolation.

### ProjectBreakdown Bar Fill
```css
@keyframes fill-bar {
  from { width: 0%; }
  to   { width: var(--bar-width); }
}
animation: fill-bar 0.4s ease-out forwards;
```

---

## Edge Cases

**Overview tab:**
- No sessions: stats = 0, heatmap all empty, breakdown shows "No sessions yet."
- All abandoned: `getTotalSessionCount()` = 0; streak = 0
- Deleted projects: sessions still count; breakdown shows gray circle + "Deleted project"

**History tab:**
- No sessions: "No activity yet." empty state (Lucide icon + text)
- Filter active + no results: "No sessions for [Project Name]."
- Deleted project sessions: show "Deleted project" + gray dot

**Both tabs:**
- Large time values: `< 60 min` → `45M` | `1h+` → `3H 20M` | `24h+` → `1D 5H`
