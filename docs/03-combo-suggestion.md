# Page 3: Combo Suggestion
**Route:** `/combo?minutes=N` | **Tab:** None (entered from /suggest via "TRY COMBO →")

---

## Purpose

When the user has a larger time block, Combo mode suggests multi-project sessions — 2–4 projects that together fill the available time. Each combo is a mini "playlist." The user picks one combo and starts a sequential timer.

---

## Layout

```
┌─────────────────────────────┐
│  ← Back   Combo Mode        │  ← back icon button + headline
│           For 90 min        │  ← subtitle, on-surface-variant
├─────────────────────────────┤
│                             │
│  ‹  ┌───────────────────┐ ›│  ← CSS scroll-snap carousel, Lucide chevrons
│     │  Combo  1 / 3     │  │
│     │                   │  │
│     │ ● Project Alpha   │  │
│     │   ~30 min         │  │
│     │ ● Project Beta    │  │
│     │   ~30 min         │  │
│     │ ● Project Gamma   │  │
│     │   ~20 min         │  │
│     │ ─────────────────  │  │  ← 1px divider, outline/30
│     │ Total: ~80 min    │  │
│     │ 10 min free       │  │
│     └───────────────────┘  │
│                             │
│         [●] [○] [○]        │  ← dot indicators (pills, 8px)
│                             │
│  [ ▶ Start This Combo ]     │  ← filled primary button
│                             │
└─────────────────────────────┘
     BottomNav
```

---

## Components

### ComboCard
One card per combo suggestion (`bg-surface-variant rounded-xl shadow-sm`):
```
┌────────────────────────────────┐  ← rounded-xl, surface-variant, shadow-sm
│  Combo 1 / 3                   │  ← 12px label, on-surface-variant, top-right
│                                │
│  ●  Project Alpha     ~30 min  │  ← colored circle + name + duration
│  ●  Project Beta      ~30 min  │
│  ●  Project Gamma     ~20 min  │
│  ─────────────────────────     │  ← 1px divider, outline/30
│  Total: ~80 min                │  ← total, 16px body
│  10 min free                   │  ← slack, 14px, on-surface-variant
└────────────────────────────────┘
```

### Carousel (CSS scroll-snap, no JS lib)
```css
.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;       /* but steps for pixel feel: override with JS */
  -webkit-overflow-scrolling: touch;
}
.combo-card {
  scroll-snap-align: center;
  flex: 0 0 90%;                 /* card takes 90% of viewport width */
}
```
- Left/right arrow buttons (`◀` / `▶`) in pixel style
- Dot indicators: filled/empty pixel squares `[●] [○] [○]`
- Current card tracked via `IntersectionObserver`

### Start Button
- `[ ▶ START THIS COMBO ]` — full width primary pixel button
- Reads current visible card's project IDs — each project ID in a combo is unique (no duplicates within one combo)
- Generates a shared `comboGroupId = crypto.randomUUID()`
- Navigates to `/timer` with `{ projectIds, totalMinutes: availableMinutes, comboGroupId }`

---

## Algorithm Summary

`suggestCombos(context)` → up to 3 `ComboSuggestion[]`

1. Score all eligible projects (same scoring as Page 2); take top 8
2. Generate all C(8,2) + C(8,3) + C(8,4) combinations = max 154
3. Filter: `availableMinutes - 10 ≤ totalDuration ≤ availableMinutes`
4. Score each combo: `avgProjectScore × (1 - slack / availableMinutes)`
5. Return top 3
6. **Fallback**: relax tolerance to ±20 min if empty

---

## State & Data Flow

- **Receives via URL param**: `minutes` query param (e.g. `/combo?minutes=90`) — URL params survive browser back navigation and page refresh; router state does not
- **On missing/invalid param**: redirect back to `/suggest`
- **Local state**: `currentIndex` (which card is visible)
- **On "Start This Combo"**: navigate to `/timer` with `{ projectIds, totalMinutes, comboGroupId }`

---

## UI Details

### Card Transition
When swiping between cards:
- Snap scrolling gives natural swipe feel
- Arrow buttons (Lucide `ChevronLeft` / `ChevronRight`) use JS `scrollTo()` with `behavior: 'smooth'` — ease-out feel

### Dot Indicators
```
[●] [○] [○]   ← filled pill = current; outlined pill = other
```
`8px` height, `rounded-full` pill shape. Active: `bg-primary`; inactive: `bg-outline/30`.

### Slack Label Color
- 0–5 min slack: `text-success` — tight fit (good!)
- 6–15 min slack: `text-warning` — decent fit
- 16+ min slack: `text-on-surface-variant` — loose fit

---

## Edge Cases

- **No combos found**: EmptyState — "No combos for X min." + "← Try a different time" back link
- **Only 1 combo**: Hide arrows and dots; just show the single card
- **2 combos**: 2 dots, no left arrow on first / no right arrow on last
- **Came from Home → Suggest → Combo**: Back button always returns to `/suggest`; `availableMinutes` is in the URL param so it survives navigation
