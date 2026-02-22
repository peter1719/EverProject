# Page 1: Project Library
**Route:** `/library` | **Tab:** 1 (Library icon)

---

## Purpose

Two roles in one page:

1. **Browse & launch**: Tap a project to start a timer directly — no suggestion required
2. **Manage**: Add, edit, archive, and delete projects

---

## Layout

```
┌─────────────────────────────┐
│  My Library   [ Home ] [+ ] │  ← Title, tonal buttons
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐   │
│  │ ● Project Name  [▶] │   │  ← tap card = start timer; [▶] = same
│  │   ~45 min           │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ ● Another Project [▶]   │
│  │   ~90 min  [Archived]   │
│  └─────────────────────┘   │
│                             │
│  (EmptyState if empty)      │
├─────────────────────────────┤
│       BottomNav             │
└─────────────────────────────┘
```

---

## Components

### ProjectCard
Each project is a full-width card (`bg-surface-variant rounded-xl shadow-sm`) with:
- **Left**: Filled circle (●) in the project's color — `rounded-full`, 12px
- **Project name** — 16px body text, truncated at 1 line
- **Duration badge** — `~45 min` in a small `rounded-full` pill, `bg-primary-container text-on-primary-container`
- **[▶] Play button** — right side, tapping directly starts the timer for this project
- **Status**: Archived projects show a dimmed `Archived` badge; active ones don't
- **Long-press or 3-dot menu**: reveals Edit / Archive / Delete actions

Tapping the card body (or the ▶ button) both trigger the **direct-start flow**.

### Direct-Start Flow
When user taps a project:
1. A small confirmation bottom sheet slides up:
   ```
   ┌──────────────────────────────┐
   │  START SESSION?              │
   │  ● Project Name              │
   │                              │
   │  HOW LONG?                   │
   │  [15][30][45][60][90][120]   │  ← pre-selected to estimatedDurationMinutes
   │                              │
   │  [▶ START]  [CANCEL]         │
   └──────────────────────────────┘
   ```
2. User can adjust time if needed (e.g. they only have 20 min but the project is set to 45)
3. User taps **START** → navigate to `/timer` with `{ projectIds: [id], totalMinutes: selectedMinutes }`

This sheet is minimal and fast — users can skip the suggestion flow entirely.

### Home Button
Small tonal button `[ Home ]` in the page header. Navigates to `/` and sets `settings.hasSeenHome = false` so the home screen shows again. Same button appears on the Dashboard header.

### Add/Edit Project Sheet (Bottom Sheet)
Slides up from bottom when tapping `+ ADD` or editing a card. Contains `ProjectForm`.

Auto-opens when navigating from the Home screen's "Library" button via router state `{ openAddSheet: true }`.

### ProjectForm (React Hook Form + Zod)
Fields:
| Field | Type | Validation |
|---|---|---|
| Name | text input | required, max 30 chars |
| Color | color swatch grid | required, pick 1 of 15 |
| Estimated Duration | segmented buttons | required, 15/30/45/60/90/120/180 min |
| Notes | textarea | optional, max 500 chars |

Buttons: **Save** (filled primary) / **Cancel** (outlined)

### ColorPicker
A 5×3 grid of colored circles (`rounded-full`, 32px).
- Tapping one selects it (shows a checkmark overlay or ring highlight)
- Colors from `COLOR_PALETTE`

### EmptyState
Shown when no projects exist:
- Lucide `FolderOpen` icon, 48px, `on-surface-variant` color
- Title: "No projects yet" — 20px, `on-surface`
- Subtext: "Tap + to add your first project." — 14px, `on-surface-variant`

---

## Sorting & Filtering

- Active projects first, archived at bottom
- Within active: sorted by most recent session `startedAt` DESC; projects with no sessions fall back to `createdAt` DESC — keeps your most-worked projects at the top
- No search (library unlikely to exceed 20–30 projects)
- Archived projects can be collapsed into a `[ SHOW ARCHIVED (N) ]` toggle row

---

## State & Data Flow

- **Read**: `useProjectStore` → `projects` (hydrated from IndexedDB on load)
- **Add**: `projectStore.addProject(data)` → IDB write → list updates
- **Edit**: `projectStore.updateProject(id, data)` → same
- **Archive**: `projectStore.updateProject(id, { isArchived: true })`
- **Delete**: `projectStore.deleteProject(id)` — confirmation dialog first
- **Start timer**: navigate to `/timer` with `{ projectIds: [id], totalMinutes: estimatedDurationMinutes }`

---

## UI Details

### ProjectCard styling
```
┌──────────────────────────────┐  ← rounded-xl, surface-variant bg, shadow-sm
│ ●  Project Name         [▶] │   ← ● = colored circle, 12px, rounded-full
│    ~45 min  [badge]          │   ← duration badge: primary-container pill
└──────────────────────────────┘
```

### 3-dot Menu (long press)
Standard dropdown with `ease-out` slide-in (150ms):
```
┌──────────────┐
│ ✎ Edit       │
│ ⊳ Archive    │
│ ✕ Delete     │
└──────────────┘
```
`bg-surface rounded-xl shadow-md`, 1px `outline` border.

---

## Edge Cases

- **Empty library**: EmptyState component
- **Long project name**: Truncate at 1 line with `…`
- **All archived**: Show collapsed archived section with `[ SHOW ARCHIVED (N) ]`; active section shows "All projects archived" in dimmed text
- **Delete confirmation**: MD3 dialog — `"Delete 'Name'? Sessions will be kept."` with **Delete** (filled error) / **Cancel** (outlined) buttons
- **Archived project tapped**: Confirmation sheet opens but shows an `[ARCHIVED]` banner with inline `[ UNARCHIVE ]` button. User can unarchive in one tap, then start — or start directly anyway (archived only hides from suggestions; the timer itself is fully functional). Clear messaging prevents surprise.
