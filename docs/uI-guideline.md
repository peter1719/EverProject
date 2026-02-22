# Mobile App UI Design Guidelines

> A reference document for Claude Code to apply consistent, user-friendly, pixel-precise design across the app.

---

## 1. Layout & Grid System

### Base Grid
- Use an **8px base unit** for all spacing, sizing, and layout decisions. All values should be multiples of 8 (or 4 for fine-grained adjustments).
- Screen padding (safe zone from screen edge): **16px** on all sides.
- Column gutters: **16px**.
- Section spacing (vertical distance between major sections): **32px**.

### Safe Areas
- Always respect device safe areas (notch, status bar, home indicator).
- Top safe area: add to any fixed header.
- Bottom safe area: add to any fixed bottom nav or CTA buttons.
- Use `SafeAreaView` (React Native) or `env(safe-area-inset-*)` (web/PWA).

### Breakpoints (for responsive or tablet support)
| Device | Width |
|---|---|
| Small phone | < 375px |
| Standard phone | 375–414px |
| Large phone | 414–480px |
| Tablet | ≥ 768px |

---

## 2. Typography

### Type Scale
All font sizes must be in `sp` (Android) or `pt` (iOS) — never hard-coded `px` to respect user accessibility settings.

| Role | Size | Weight | Line Height |
|---|---|---|---|
| Display / Hero | 32sp | Bold (700) | 1.2× |
| H1 | 24sp | Bold (700) | 1.25× |
| H2 | 20sp | SemiBold (600) | 1.3× |
| H3 | 18sp | SemiBold (600) | 1.35× |
| Body (default) | 16sp | Regular (400) | 1.5× |
| Body Small | 14sp | Regular (400) | 1.5× |
| Caption / Label | 12sp | Regular (400) | 1.4× |
| Micro / Tag | 10sp | Medium (500) | 1.3× |

### Rules
- Minimum readable body text: **14sp**.
- Never go below **10sp** for any visible text.
- Line length (characters per line): 45–75 characters for body text.
- Avoid ALL CAPS for long text. Use for labels, tags, and badges only.
- Letter-spacing for ALL CAPS labels: `+0.08em`.

---

## 3. Color System

### Structure
Define a semantic token system — never hard-code raw hex values directly in components. This app uses **MD3 (Material Design 3) semantic roles**:

```
Surface
  surface              → Main screen background
  surface-variant      → Card / elevated surface background
  on-surface           → Primary text on surface
  on-surface-variant   → Secondary / muted text

Primary
  primary              → Primary action color (filled buttons, active states)
  on-primary           → Text/icons on primary color
  primary-container    → Tonal button background
  on-primary-container → Text/icons on primary-container

Status
  success         → Done / completed states
  warning         → Partial / caution states
  error           → Error / abandoned / destructive states

Border
  outline         → Subtle dividers, card borders, outlined button borders
```

Light/dark values for each token are defined in `docs/00a-home-screen.md` (Design System section) and applied via `prefers-color-scheme`.

### Contrast Requirements (WCAG AA minimum)
- Normal text (< 18pt): **contrast ratio ≥ 4.5:1**
- Large text (≥ 18pt bold or ≥ 24pt): **contrast ratio ≥ 3:1**
- Interactive elements and icons: **≥ 3:1** against background
- Always verify using a contrast checker before finalizing colors.

### Dark Mode
- Provide both light and dark token values.
- Do not simply invert colors — dark mode backgrounds should be dark gray (e.g., `#121212`, `#1E1E1E`), not pure black.
- Elevation in dark mode is expressed by **lightening** the surface color, not adding shadows.

---

## 4. Spacing & Sizing

### Spacing Scale (multiples of 4px/8px)
| Token | Value |
|---|---|
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 24px |
| space-6 | 32px |
| space-7 | 40px |
| space-8 | 48px |
| space-9 | 64px |

### Touch Targets
- **Minimum touch target size: 44×44px** (Apple HIG) / **48×48dp** (Material Design).
- This applies even if the visual element is smaller — pad the tappable area.
- Spacing between adjacent touch targets: minimum **8px**.

---

## 5. Components

### Buttons
| Variant | Use Case |
|---|---|
| Primary | Main CTA, one per screen maximum |
| Secondary | Supporting action, outlined style |
| Ghost / Text | Low-emphasis, inline actions |
| Destructive | Delete, remove — use red/error color |
| Icon Button | Icon-only, must have accessible label |

- Height: **48dp** (standard), **40dp** (compact), **56dp** (large/hero CTA)
- Border radius: consistent with app's radius token (see §6)
- Padding (horizontal): **24px** minimum for text buttons
- Disabled state: reduce opacity to **38%**, never remove button from layout

### Inputs & Forms
- Input height: **48dp**
- Label: always visible above the input (avoid placeholder-only labels)
- Error state: show error text below input with error icon and red border
- Helper text: `12sp`, `text-secondary` color, below input
- Focus ring: **2px** solid `brand-primary`
- Spacing between form fields: **16px**

### Cards
- Background: `bg-secondary`
- Border radius: app radius token (typically **12–16px**)
- Padding inside card: **16px**
- Elevation / shadow: subtle, 1–3dp shadow for light mode; lightened surface for dark mode
- Do not nest cards inside cards.

### Navigation
**Bottom Tab Bar**
- Height: **56dp** + bottom safe area inset
- 3–5 tabs maximum
- Active icon + label; inactive icon only or icon + muted label
- Icon size: **24×24dp**

**Top App Bar / Header**
- Height: **56dp** standard, **64dp** with subtitle
- Title: H2 style (20sp, SemiBold)
- Back/close icon: left-aligned, 44×44dp touch target
- Actions: right-aligned, max 2–3 icon buttons

**Bottom Sheet / Drawer**
- Drag handle: 4×36px, centered, `border-default` color, 8px from top
- Corner radius: **24px** top corners
- Max height: 90% of screen height; always scrollable if content overflows

### Lists & Cells
- Standard list item height: **56dp** (icon + text) or **72dp** (icon + title + subtitle)
- Dividers: 1px, `border-default`, left-inset by **16px** (or icon width + gap)
- Swipe actions: reveal on swipe-left; max 2 actions

### Modals & Dialogs
- Max width: **320px** (phone), **480px** (tablet)
- Border radius: **20px**
- Padding: **24px**
- Overlay: `rgba(0,0,0,0.5)` or `rgba(0,0,0,0.6)` for dark mode
- Dismiss: tap outside OR explicit close/cancel button. Always provide both.

---

## 6. Border Radius

Use a consistent radius scale across the app. Pick **one radius personality** (sharp, soft, or rounded) and stick to it.

| Token | Value | Use |
|---|---|---|
| radius-sm | 4px | Tags, chips, badges |
| radius-md | 8px | Small cards, inputs (sharp style) |
| radius-lg | 12px | Cards, inputs (standard) |
| radius-xl | 16px | Modals, sheets, large cards |
| radius-2xl | 24px | Bottom sheets, hero cards |
| radius-full | 9999px | Pills, avatars, FABs |

---

## 7. Icons

- Use a **single icon library** throughout the app (e.g., Material Symbols, Phosphor, Lucide). Do not mix libraries.
- Standard icon size: **24×24dp**
- Small icon (inline, label): **16×16dp**
- Large icon (empty state, onboarding): **48×48dp** or **64×64dp**
- Icons inside buttons: **20×20dp**, with **8px** gap to label text
- Always provide `accessibilityLabel` for icon-only elements.

---

## 8. Images & Media

- Use **aspect ratio containers** — never let images reflow layout on load.
- Standard ratios: `16:9` (banners, media), `1:1` (avatars, thumbnails), `4:3` (cards)
- Avatar sizes: **32dp** (compact), **40dp** (list), **56dp** (profile header), **96dp** (full profile)
- Always show a **skeleton / placeholder** while images load.
- Always provide `alt` text or `contentDescription`.

---

## 9. Motion & Animation

- Duration scale:
  - Instant feedback (ripple, toggle): **100ms**
  - Standard transition (page push, modal open): **250–300ms**
  - Emphasis / attention: **400–500ms**
  - Never exceed **500ms** for UI transitions — it feels sluggish.
- Easing: use decelerate-in (`ease-out`) for elements entering screen, accelerate-out (`ease-in`) for elements leaving.
- **Never animate** layout shifts that reflow surrounding content.
- Respect `prefers-reduced-motion` / system accessibility setting — provide instant fallback.

---

## 10. Accessibility

- All interactive elements must have an accessible name (label, hint, or description).
- Focus order must follow reading order (top-to-bottom, left-to-right).
- Do not rely on color alone to convey meaning — always pair with icon or text.
- Text must scale up to **200%** without breaking layout (use flexible containers, not fixed heights).
- Screen reader support: group related elements, use semantic roles (`header`, `button`, `list`).
- Tap target minimum: **44×44pt** (see §4).

---

## 11. Loading & Empty States

### Loading
- For initial page load: show **skeleton screens** (not spinners).
- For inline actions (button tap): show **inline spinner** inside the button, disable it.
- For background refresh: show a subtle **pull-to-refresh** indicator or top progress bar.

### Empty States
Structure every empty state with:
1. Illustration or icon (48–96dp)
2. Title: H2, explains what's empty
3. Body: 14–16sp, explains why or what to do
4. CTA button (optional): primary action to resolve the empty state

### Error States
- Network error: show inline error with retry button.
- Full-page error: centered, with illustration, message, and retry.
- Form errors: inline, below each field.

---

## 12. Responsive & Adaptive Layout

- Use **flexible layouts** (Flexbox / AutoLayout) — avoid fixed pixel widths for containers.
- Scrollable content: always vertical scroll; avoid horizontal scroll except for intentional carousels.
- Content max-width on tablets: **600px** centered, with increased side padding.
- Large screens: consider a two-pane layout (list + detail) for primary navigation flows.

---

## 13. Platform-Specific Conventions

### iOS
- Use SF Symbols for system icons where appropriate.
- Navigation: back swipe from left edge must be supported.
- Modals: card-style with handle, swipe down to dismiss.
- Bottom tab bar: standard iOS style with labels.

### Android
- This app uses **Material Design 3** as its baseline design system throughout.
- Back navigation: support Android back gesture/button.
- FAB (Floating Action Button): primary action, bottom-right, `56dp`.
- Press feedback: `active:opacity-80` at 100ms (replaces ripple for PWA).

---

## 14. Do's and Don'ts

| Do | Don't |
|---|---|
| Use 8px grid for all spacing | Use arbitrary spacing values (e.g., 7px, 13px) |
| Provide visual feedback within 100ms of any tap | Leave taps with no feedback |
| Label every interactive element | Use icon-only buttons without accessible labels |
| Design for 44dp minimum touch targets | Make small text links the only tap target |
| Use semantic color tokens | Hard-code hex values in components |
| Support both light and dark mode | Design only for one theme |
| Test at 200% text size | Assume fixed text sizes |
| Keep primary CTAs to one per screen | Stack multiple equally-weighted CTAs |
| Use skeleton loaders for content | Show blank screens during load |
| Follow platform back/dismiss conventions | Build custom non-standard navigation |

---

## 15. File & Handoff Notes for Claude Code

When applying these guidelines in code:

- Define all spacing, color, radius, and typography as **design tokens / constants** in a single file (e.g., `theme.ts`, `tokens.js`, `styles/tokens.css`).
- Reference tokens by name everywhere — never inline raw values.
- Component files should import tokens, not redefine values.
- When implementing a new screen or component, verify against this checklist:
  - [ ] All spacing is multiples of 4 or 8px
  - [ ] Touch targets are ≥ 44dp
  - [ ] Text contrast meets WCAG AA
  - [ ] Loading and empty states are handled
  - [ ] Dark mode tokens are applied
  - [ ] Accessible labels are present on interactive elements
  - [ ] Platform-specific conventions are followed