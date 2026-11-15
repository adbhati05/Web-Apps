# Repository Guidelines

## Project Structure & Module Organization

This directory contains a React 19, TypeScript, and Vite frontend for a Firebase-backed social fashion app. Run project commands from `Archive/` (the Git root is its parent). Application code lives in `src/`: route-level screens are in `pages/`, reusable UI and co-located CSS are in `components/`, authentication helpers are in `auth/`, and Firebase access belongs in `services/`. Shared interfaces live in `src/types.ts`, routing is defined in `src/routes.tsx`, and Firebase initialization is in `src/firebase.ts`. Static images belong in `src/assets/`. Firestore and Storage policies are maintained under `rules/`.

## Build, Test, and Development Commands

- `npm install` installs the locked dependency set from `package-lock.json`.
- `npm run dev` starts the Vite development server with hot reload.
- `npm run build` runs strict TypeScript project checks and creates the production bundle in `dist/`.
- `npm run lint` checks all TypeScript and TSX files with ESLint.
- `npm run preview` serves the built bundle for a local production check.

## Coding Style & Naming Conventions

Follow the existing TypeScript/TSX style and keep strict typing intact. Use PascalCase for React components and their files (`PostCard.tsx`), camelCase for functions and variables, and `*.service.ts` for Firebase service modules. Components are functions; place their plain CSS beside them with a matching basename. Prefer CSS custom properties from `src/App.css` and existing responsive breakpoints. Keep Firebase calls in `src/services/`, and update security rules when data shapes or write patterns change. Run `npm run lint` before committing.

## Testing Guidelines

No automated test framework or coverage threshold is configured yet. For every change, run `npm run lint` and `npm run build`, then manually exercise affected routes and Firebase flows. If adding tests, use descriptive `*.test.ts` or `*.test.tsx` names and add the runner command to `package.json` and this guide.

## Commit & Pull Request Guidelines

Recent commits use concise, descriptive past-tense summaries such as `Adjusted styling behavior...`; keep each commit focused on one concern. Pull requests should explain the user-visible effect, list validation performed, link relevant issues, and include before/after screenshots for UI changes. Call out Firestore or Storage rule changes explicitly.

## Security & Configuration

Supply Firebase settings through local `VITE_FIREBASE_*` environment variables. Never commit `.env` files, credentials, or production data. Keep client service behavior and the files in `rules/` synchronized.
