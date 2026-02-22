# Page 0: Home Screen
**Route:** `/` | **Tab:** None (landing screen)

---

## Purpose

The first thing users see when they open the app. Presents a clear two-path choice:

1. **Library** — browse and manage your projects
2. **Get Suggestion** — let the app pick what to work on

After the user has used the app before, this screen may be skipped (redirect to last visited tab). A settings flag `hasSeenHome` controls this.

---

## Layout

```
┌─────────────────────────────┐
│                             │
│       EverProject           │  ← Display text, 32px, surface
│   Your project companion    │  ← Body text, on-surface-variant
│                             │
│   What do you want to do?   │  ← Title text, on-surface
│                             │
│  ┌───────────────────────┐  │
│  │       Library         │  │  ← filled button (primary)
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │  ▶  Get Suggestion    │  │  ← filled button (primary)
│  └───────────────────────┘  │
│                             │
│  ┌───────────────────────┐  │
│  │    Activity History   │  │  ← tonal button (primary-container)
│  └───────────────────────┘  │
│                             │
└─────────────────────────────┘
```

---

## Design Details

### App Title
- `EverProject` in Roboto 400, 32px (`text-4xl`), `on-surface` color
- Subtitle: "Your project companion" in 14px `on-surface-variant` — no border box

### Buttons
Two filled primary buttons + one tonal button:
- Full width, 56px height (`h-14`) — hero CTA size
- `rounded-xl` (12px border-radius)
- **Library** and **Get Suggestion**: `bg-primary text-on-primary` — filled primary
- **Activity History**: `bg-primary-container text-on-primary-container` — tonal (lower emphasis)
- Press feedback: `active:opacity-80 transition-opacity duration-100`
- Icon (Lucide, 20px) + Sentence Case label

---

## Behavior

### First Time User
- `settings.hasSeenHome` is `false` (or missing)
- Show this screen on app open

### Returning User
- As soon as the user taps **any button** on the home screen (Library, Get Suggestion, or skip), set `settings.hasSeenHome = true`
- Future app opens redirect directly to the last visited tab (`settings.lastVisitedTab`, default `/suggest`)
- User can return to the home screen by tapping the **`[ HOME ]` button** in the Library or Dashboard page header

### Button Actions
| Button | Action |
|---|---|
| **LIBRARY** | Navigate to `/library` |
| **▶ GET SUGGESTION** | Navigate to `/suggest` |
| **ACTIVITY HISTORY** | Navigate to `/dashboard?view=history` (pre-selects the History tab) |

---

## Design System

These conventions apply to **all pages** in the app.

### Typography
| Role | Font | Size | Weight |
|---|---|---|---|
| Display / app title | Roboto / system-ui | 32px | 400 |
| Headline / page heading | Roboto / system-ui | 24px | 700 |
| Title / section heading | Roboto / system-ui | 20px | 600 |
| Body (default) | Roboto / system-ui | 16px | 400 |
| Body Small | Roboto / system-ui | 14px | 400 |
| Label / badge / caption | Roboto / system-ui | 12px | 500 |

Case: Sentence case everywhere; ALL CAPS only for badges and tags.

### Color Tokens (MD3)
| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#FAFAFA` | `#1C1B1F` | Page background |
| `surface-variant` | `#F3F0FA` | `#2B2A33` | Card background |
| `on-surface` | `#1C1B1F` | `#E6E1E5` | Primary text |
| `on-surface-variant` | `#49454E` | `#CAC4D0` | Secondary text |
| `primary` | `#6366F1` | `#C5C1FF` | Primary accent |
| `on-primary` | `#FFFFFF` | `#1A1065` | Text on primary |
| `primary-container` | `#E8E7FF` | `#4942C9` | Tonal button bg |
| `on-primary-container` | `#1A1065` | `#E5E0FF` | Text on tonal |
| `error` | `#B3261E` | `#F2B8B5` | Error states |
| `success` | `#386A20` | `#8FD67A` | Success / Done |
| `warning` | `#7B5800` | `#EFBF00` | Warning / Partial |
| `outline` | `#79757F` | `#938F99` | Borders, dividers |

Light/dark mode: driven by `prefers-color-scheme` media query.

### Cards
```
bg-surface-variant rounded-xl p-4 shadow-sm
```
- No hard offset shadows — `shadow-sm` only
- Dividers: 1px, `border-outline/30`

### Buttons
| Variant | Classes | Use |
|---|---|---|
| Filled | `bg-primary text-on-primary rounded-xl h-12 px-6` | Primary CTA |
| Tonal | `bg-primary-container text-on-primary-container rounded-xl h-12 px-6` | Secondary action |
| Outlined | `border border-outline text-primary bg-transparent rounded-xl h-12 px-6` | Ghost / cancel |

Press feedback: `active:opacity-80 transition-opacity duration-100`
Height: 48px standard (`h-12`); 56px for hero CTAs (`h-14`).

### Animations
```css
/* Standard transition */
transition: all 250ms ease-out;

/* Instant feedback (press, toggle) */
transition: opacity 100ms ease-out;
```
- No `steps()` easing anywhere
- Respect `prefers-reduced-motion` — provide instant fallback
