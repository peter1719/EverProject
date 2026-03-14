# EverProject

A mobile-first Progressive Web App (PWA) for managing personal projects and staying productive. Get time-aware suggestions, run focused Pomodoro sessions, and track your activity — all stored locally on your device with no accounts required.

> Works offline. Installable on iOS and Android. All data stays on your device.

---

## Features

- **Smart Suggestions** — Weighted algorithm surfaces neglected projects based on recency and frequency
- **Combo Mode** — Fills a larger time block with 2–4 projects automatically
- **Pomodoro Timer** — Focused countdown with pause, skip, and crash recovery
- **Session Logging** — Record outcomes, notes, and photos after each session
- **Activity Dashboard** — 90-day heatmap, streaks, and per-project time breakdown
- **Todo Lists** — Per-project task checklists
- **4 Visual Styles** — Classic, Pixel, Paper, and Zen themes
- **Bilingual** — English and Traditional Chinese (繁體中文)
- **PWA** — Install to home screen, works fully offline

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + Material Design 3 |
| State | Zustand v5 + Immer |
| Persistence | IndexedDB (idb v8) — no server, no cloud |
| PWA | vite-plugin-pwa + Workbox v7 |
| Forms | React Hook Form v7 + Zod v4 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Development

```bash
git clone https://github.com/your-username/EverProject.git
cd EverProject
npm install
npm run dev
```

### Build

```bash
npm run build       # Production build
npm run preview     # Serve build locally (required for PWA/offline testing)
```

### Other Commands

```bash
npm run lint        # ESLint check
npm run test        # Vitest unit tests
```

---

## PWA Install

After running `npm run build && npm run preview`:

1. Open `http://localhost:4173` in Chrome or Safari
2. Use the browser's "Add to Home Screen" or "Install App" option
3. The app works fully offline after installation

---

## Project Structure

```
src/
├── algorithms/     # Suggestion and combo scoring (pure functions)
├── components/     # Shared UI components and layout
├── db/             # IndexedDB schema and connection
├── hooks/          # Custom React hooks (timer, hydration, PWA)
├── i18n/           # English and Traditional Chinese translations
├── lib/            # Utilities and constants
├── pages/          # Route-level page components
├── store/          # Zustand stores (project, session, timer, settings, todo)
└── types/          # TypeScript interfaces
```

---

## License

Copyright (c) 2025 peterpenno1@gmail.com

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/).

You are free to share and adapt this work for **non-commercial purposes**, provided you give appropriate credit. Commercial use is not permitted.
