# Neon Tetris 99

A neon-styled mobile Tetris game built with React 19, Vite, TypeScript, and Firebase Realtime Database.

## Tech Stack
- **Frontend:** React 19 + TypeScript
- **Build tool:** Vite 6
- **Styling:** Tailwind CSS (CDN)
- **Backend services:** Firebase Realtime Database (for multiplayer/leaderboard)
- **Icons:** lucide-react

## Project Layout
- `index.html` — App entry point
- `index.tsx` — React mount point
- `App.tsx` — Root component
- `components/` — UI components
- `hooks/` — Custom React hooks
- `services/` — Firebase and other service integrations
- `utils/` — Utility functions
- `constants.ts` / `types.ts` — Shared constants and types
- `firebase.ts` — Firebase initialization
- `public/` — Static assets

## Replit Setup
- Vite dev server runs on host `0.0.0.0`, port `5000`, with `allowedHosts: true` to support the Replit iframe proxy.
- Workflow `Start application` runs `npm run dev`.

## Deployment
Configured as a static site:
- Build: `npm run build`
- Public directory: `dist`
