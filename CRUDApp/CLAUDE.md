# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The git repository root is the parent `Web-Apps/` folder, which contains multiple independent projects (`CRUDApp`, `ArtistSearch`, `igneous-rocks`). This file covers `CRUDApp`, a work-in-progress social fashion/outfit-posting app (React 19 + TypeScript + Vite + Firebase). Run all commands from the `CRUDApp/` directory.

## Commands

```sh
npm run dev       # Start Vite dev server
npm run build     # Type-check (tsc -b) then build with Vite
npm run lint      # ESLint (flat config, typescript-eslint + react-hooks)
npm run preview   # Preview production build
```

There is no test setup in this project.

## Environment

Firebase config is read from Vite env vars (`VITE_FIREBASE_*`) in `src/firebase.ts`. `.env.development` and `.env.production` exist locally but are gitignored — never commit them. If they're missing, the app cannot connect to Firebase.

## Architecture

Three layers, top to bottom:

1. **Pages & routing** — `src/routes.tsx` defines a `createBrowserRouter` where all app pages (`Home`, `Post`, `StyleBoard`, `Saved`, `Settings` in `src/pages/`) are children of `ProtectedRoutes` (`src/auth/ProtectedRoutes.tsx`), which redirects unauthenticated users to `/login`. Only `/login` and `/signup` are public.

2. **Auth context** — `App.tsx` wraps the router in `UserAuthProvider` (`src/auth/UserAuthContext.tsx`). Components call the `useUserAuth()` hook to get `user` (the Firebase `User`), `userInfo` (the app's Firestore profile, see `UserInfo` in `src/types.ts`), and `signUp`/`signIn`/`signOut`. The context listens to `onAuthStateChanged` and fetches the Firestore user doc on every auth change. Note `ProtectedRoutes` currently uses `useAuthState` from `react-firebase-hooks` rather than this context (a known TODO in the code).

3. **Services** — all Firebase access goes through the service objects in `src/services/`; components should not call Firestore/Storage APIs directly:
   - `auth.service.ts` — sign-up/sign-in/sign-out and Firestore user docs. Sign-up writes to two collections atomically via `writeBatch`: `users/{uid}` (profile) and `usernames/{username}` (lowercased, used to enforce unique usernames).
   - `post.service.ts` — CRUD on the `posts` collection plus likes and comments, which live in `posts/{id}/likes/{uid}` and `posts/{id}/comments/{commentId}` subcollections. The post doc carries denormalized `likeCount`/`commentCount` counters; like/comment mutations write the subcollection doc and the counter in one `writeBatch` (the security rules require this pairing — see `firestore.rules`). Maintains an in-memory `postCache` Map — mutations must keep it in sync.
   - `storage.service.ts` — image upload to Firebase Storage. Always compresses via `browser-image-compression` first; paths are `posts/{uid}/{timestamp}.jpg` and `profile/{uid}/{timestamp}.jpg`, and download URLs get a `?t=` cache-busting param.

Shared data shapes (`UserInfo`, `Post`, `PieceDetail`, `Like`, `Comment`) live in `src/types.ts`. Timestamps are ISO strings, not Firestore Timestamps.

Security rules live in `firestore.rules` and `storage.rules` at the repo's `CRUDApp/` root. They are the source of truth and must be mirrored into the Firebase console (or deployed via the Firebase CLI) — keep them in sync with any service-layer change to data shapes or write patterns.

## Conventions

- Components are function components in `.tsx` files with a co-located `.css` file of the same name (plain CSS, no CSS modules). Bootstrap is imported globally in `main.tsx`; MUI is also a dependency.
- A `Post` has `hasDetails` toggling whether its `pieces: PieceDetail[]` (name, price, size, materials) are rendered — post cards branch on this.

## Responsive Design

Breakpoints (mobile-first):
- Mobile: <= 500px (layout stacks; nav becomes floating icon-only buttons)
- Tablet: 501px–768px (side-by-side layout at 95vw)
- Desktop: > 768px
- Home only: the right side bar is hidden at <= 900px

CSS custom properties are defined in `src/App.css` under `:root` (colors, typography, spacing, borders/radii, control sizes). The spacing scale is 5px-based to match the app's existing rhythm: --space-3xs (2px), --space-2xs (4px), --space-xs (5px), --space-sm (8px), --space-md (10px), --space-lg (15px), --space-xl (20px), --space-2xl (25px), --space-3xl (30px), --space-4xl (40px), --space-5xl (50px), --space-6xl (60px). Use these variables instead of hardcoded pixel values.

Media queries go in each component's co-located CSS file. Use `@media (max-width: 768px)` and `@media (max-width: 500px)`.

## Constraints

- Do not introduce new dependencies without asking first
- Do not touch functionality, Firebase service calls, or business logic — layout and styling only
- Do not convert CSS files to CSS modules or any other format
- Do not remove or rename existing CSS classes without confirming
- Bootstrap is globally imported — do not remove it, but prefer existing component CSS for layout work unless Bootstrap offers a better solution.
- Preserve all existing TypeScript types and component interfaces