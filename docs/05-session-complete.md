# Page 5: Session Complete
**Route:** `/complete` | **Tab:** None (full-screen, no BottomNav)

---

## Purpose

After a timer session ends, this page captures outcome + notes and writes a `Session` record to IndexedDB. It's the "save game" screen — reinforces progress and closes the loop.

---

## Layout

```
┌─────────────────────────────┐
│                             │
│   ✓ Session Complete        │  ← success header (completed)
│   ◷ Session Logged          │  ← neutral header (partial)
│   ✕ Abandoned               │  ← muted header (abandoned)
│                             │
│  ┌─────────────────────┐   │
│  │  Session Summary    │   │  ← surface-variant card, rounded-xl
│  │  ● Project Name     │   │
│  │  Planned: 45 min    │   │
│  │  Actual:  38 min    │   │
│  └─────────────────────┘   │
│                             │
│  How did it go?             │
│  ┌────────┬─────────┬──────┐ │
│  │ ✓ Done │ ~ Part  │✕Quit│ │  ← segmented toggle (outlined/filled)
│  └────────┴────────┴──────┘ │
│                             │
│  Notes (optional)           │
│  ┌──────────────────────┐  │
│  │ Add notes...         │  │  ← surface-variant textarea, rounded-xl
│  │                      │  │
│  └──────────────────────┘  │
│  0 / 500                    │  ← char counter, 12px, on-surface-variant
│                             │
│  [ ✓ Save ]                 │  ← filled primary button
│                             │
│  [ ▶ View Stats ]           │  ← tonal button → /dashboard
│  [ ↩ Go Home ]              │  ← outlined button → /
│                             │
└─────────────────────────────┘
```

---

## Components

### Completion Header

**Completed** (`outcome: 'completed'`):
- `✓ Session Complete`
- Icon + text scale in from 80% to 100%, 300ms ease-out
- `text-success` color
- No blinking or pixel confetti

**Partial** (`outcome: 'partial'`):
- `◷ Session Logged`
- `text-warning` color, no animation

**Abandoned** (`outcome: 'abandoned'`):
- `✕ Abandoned`
- `text-error` color, no animation

### Session Summary Card

**Single project** (`bg-surface-variant rounded-xl p-4`):
```
┌─────────────────────────┐
│  ● Project Name         │
│  Planned: 45 min        │
│  Actual:  38 min        │
└─────────────────────────┘
```

**Combo session:**
Each project listed with its own outcome badge. Only the last active project's outcome is editable — skipped and naturally-completed projects are locked.
```
┌──────────────────────────────────┐
│  ✓ ● Project Alpha   ~30 min    │  ← completed (locked)
│  ~ ● Project Beta    ~20 min    │  ← skipped (locked as partial)
│  ? ● Project Gamma   ~30 min    │  ← last project (outcome editable below)
└──────────────────────────────────┘
```

### Outcome Toggle (segmented)

Outcome labels map directly to `SessionOutcome` values:
| Label | Value | When pre-selected |
|---|---|---|
| `✓ Done` | `completed` | Timer reached zero naturally |
| `~ Partial` | `partial` | User tapped Stop & Log |
| `✕ Quit` | `abandoned` | User tapped Quit |

**Single project** — standard three-option toggle:
```
[ ✓ Done ] [ ~ Partial ] [ ✕ Quit ]
```

**Combo session** — toggle only applies to the last active project; locked projects show their outcome as a badge (not interactive):
```
How did Project Gamma go?
[ ✓ Done ] [ ~ Partial ] [ ✕ Quit ]
```

- Pre-selected based on what the timer passed (natural finish = Done, stop = Partial, quit = Quit)
- User can change before saving
- Selected state: `bg-primary text-on-primary` (filled)
- Unselected state: `border border-outline text-on-surface` (outlined), `rounded-xl`

### Notes Input
```css
background: var(--surface-variant);
border: 1px solid var(--outline);
border-radius: 12px;
font-family: Roboto, system-ui;
font-size: 16px;
color: var(--on-surface);
```
- Standard cursor (no custom blinking)
- Character counter: `0 / 500` in bottom-right, `on-surface-variant`
- Placeholder text: `Add notes...`

### Save Button & Navigation
- `[ ✓ Save ]` — full width, filled primary button. On tap: haptic + writes session records to IDB. Does **not** navigate yet.
- `[ ▶ View Stats ]` (tonal) and `[ ↩ Go Home ]` (outlined) are **always visible** but **disabled** (`opacity-38`, not tappable) until Save is tapped. After save they become active — user must choose one to leave the page.
  - `[ ▶ View Stats ]` — navigate to `/dashboard` to see updated heatmap/streak
  - `[ ↩ Go Home ]` — navigate to `/` (home screen)

---

## Data Written

```typescript
// One Session per project (for combos: N records with shared comboGroupId)
{
  id: crypto.randomUUID(),
  projectId,
  startedAt,
  endedAt: Date.now(),
  plannedDurationMinutes,
  actualDurationMinutes,   // from actualDurationMs
  outcome,                 // from toggle
  notes,                   // from textarea
  wasCombo: projectIds.length > 1,
  comboGroupId             // null for single sessions
}
```

---

## State & Data Flow

- **Receives via router state**: `{ actualDurationMs, projectIds, comboGroupId: string | null, plannedDurationMinutes, outcome: SessionOutcome, skippedProjectIds: string[], projectElapsedMs: Record<string, number> }`
  - `outcome` is always required (set by timer based on how session ended; user can change it on this page before saving)
  - `comboGroupId` is `null` for single-project sessions
- **Local state**: `outcome` (pre-filled from router state), `notes` (empty string)
- **On save**:
  1. `sessionStore.addSession(...)` for each project
  2. Destination buttons become active — user chooses `[ VIEW STATS ]` → `/dashboard` or `[ GO HOME ]` → `/`

---

## UI Details

### Completion Header Animation
```css
@keyframes complete-enter {
  from { opacity: 0; transform: scale(0.8); }
  to   { opacity: 1; transform: scale(1); }
}
.completion-header {
  animation: complete-enter 300ms ease-out forwards;
}
```
Plays once on mount for `completed` outcome. No animation for `partial` or `abandoned`.

---

## Edge Cases

- **No router state** (direct navigation to `/complete`): Redirect to `/library`
- **Combo sessions**: Summary shows only projects that were **started** (reached by the timer). If the user stops mid-combo on project 3 of 4, project 4 (never started) does not appear in the summary and no session record is written for it.
- **Zero actual duration** (abandoned immediately): Log with `actualDurationMinutes: 0`
- **Back navigation while unsaved**: Show MD3 dialog — "Save before leaving?" with **Save** (filled primary) / **Discard** (outlined)
