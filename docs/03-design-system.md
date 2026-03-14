# Design System

The entire app uses Material Design 3 semantic tokens implemented as CSS custom properties, with 4 app styles.

---

## Color Tokens

Tokens are mapped to Tailwind utilities via `@theme inline` in `src/index.css` (`bg-surface`, `text-on-surface`, etc.).

### Classic Style (default) — `src/index.css`

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#FDFAF4` | `#1A1208` | Page background |
| `surface-variant` | `#FFFFFF` | `#261C0F` | Card background |
| `on-surface` | `#1A1208` | `#F4EDE0` | Primary text |
| `on-surface-variant` | `#7A6651` | `#A89070` | Secondary / muted text |
| `primary` | `#C75B21` | `#E07840` | Primary accent (warm orange) |
| `on-primary` | `#FFFFFF` | `#1A1208` | Text on primary |
| `primary-container` | `#FEECD8` | `#5C1E00` | Tonal button background |
| `on-primary-container` | `#5C1E00` | `#FEECD8` | Text on tonal |
| `error` | `#C0392B` | `#EF5350` | Error / destructive |
| `success` | `#2D6A2D` | `#66BB6A` | Completed / done |
| `warning` | `#A0600A` | `#FFA726` | Partial / caution |
| `outline` | `#B0A090` | `#5C4A35` | Borders, dividers |

### Other Style Primary Colors

| Style | `primary` Light | Key Characteristics |
|-------|----------------|---------------------|
| `pixel` | `#D62828` (red) | `border-radius: 0 !important`; DM Mono font |
| `paper` | `#1A4A8C` (blue) | Dotted background on `main`; ruled lines on timer page |
| `zen` | `#4A7C59` (green) | Neutral tones, no special overrides |

---

## Typography

Fonts: `DM Sans` (default sans) / `DM Mono` (pixel style) / `Playfair Display` (display, special contexts)

| Role | Size | Weight | Context |
|------|------|--------|---------|
| Display / App title | 32px | 400 | Large headings |
| Headline / Page heading | 24px | 700 | Page titles |
| Title / Section heading | 20px | 600 | Section titles |
| Body (default) | 16px | 400 | General content |
| Body Small | 14px | 400 | Secondary descriptions |
| Label / Badge | 12px | 500 | Badges, tags |

Rules: Sentence case everywhere. ALL CAPS only for badges and tags.

---

## Layout Rules

- **8px base grid**: all spacing should be multiples of 4 or 8
- **Safe areas**: add top inset to headers, `env(safe-area-inset-bottom)` to fixed bottom elements
- **Minimum touch target**: 44×44px (Apple HIG) / 48dp (Material Design)
- **Screen padding**: 16px (`px-4`)
- **Max-width on tablet**: 600px centered

---

## Components

### Buttons (MD3 three variants)

```typescript
// Filled — primary CTA (max one per screen)
'bg-primary text-on-primary rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100'

// Tonal — secondary action
'bg-primary-container text-on-primary-container rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100'

// Outlined — low-emphasis / cancel
'border border-outline text-primary bg-transparent rounded-xl h-12 px-6 active:opacity-80 transition-opacity duration-100'
```

Height: standard `h-12` (48px); Hero CTA `h-14` (56px).
Disabled: `opacity-38 pointer-events-none` (never remove from DOM).
Danger (delete): `bg-error text-white`.

### Cards
```
bg-surface-variant rounded-xl p-4 shadow-sm
```
- No hard offset shadows — `shadow-sm` only
- Dividers: 1px, `border-outline/30`
- Never nest cards inside cards

### Bottom Sheet / Drawer
- Drag handle: 4×36px, centered, `bg-outline/30`, 8px from top
- Corner radius: `rounded-t-2xl` (top 24px)
- Max height: 90% of screen; scrollable if content overflows

### Modals / Dialogs
- Max width: `max-w-xs`
- Corner radius: `rounded-2xl` (20px)
- Padding: `p-6` (24px)
- Overlay: `bg-black/50`

### Empty States
Structure: Lucide icon (48px) + title (h2) + body text + optional CTA button

### Color Dot
```typescript
// Never interpolate! Use COLOR_BG_MAP
<div className={cn('rounded-full w-3 h-3', COLOR_BG_MAP[project.color])} />
```

---

## Animations

```css
/* Standard transition */
transition: all 250ms ease-out;

/* Instant feedback (press, toggle) */
transition: opacity 100ms ease-out;
```

Rules:
- Never use `steps()` easing
- All transitions ≤ 500ms
- Entering elements: `ease-out`; leaving elements: `ease-in`
- Always provide an instant fallback for `prefers-reduced-motion`

---

## Icons

- Use **Lucide** exclusively — do not mix icon libraries
- Standard: 24×24px
- Inline / label: 16px
- Empty state: 48px
- Inside button: 20px with 8px gap to label text
- Icon-only buttons must have `aria-label`
