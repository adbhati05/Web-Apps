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
npm run test:rules  # Firestore rules tests on the local emulator (eval/tests/, needs Java)
npm run emulators   # Start just the Firestore emulator
```

The only tests are the security rules tests in `eval/tests/` (one file per area: `users`, `posts`, `comments`, `follows`, `chats`, `styleboard`, plus shared setup in `helpers.ts`), run with Vitest against the Firebase Emulator (`firebase.json` / `.firebaserc` at the root, project ID `demo-fitlog` so it never touches production). When a rule changes, add or update the matching test. There are no component or end-to-end tests.

## Environment

Firebase config is read from Vite env vars (`VITE_FIREBASE_*`) in `src/firebase.ts`. `.env.development` and `.env.production` exist locally but are gitignored — never commit them. If they're missing, the app cannot connect to Firebase.

## Architecture

Three layers, top to bottom:

1. **Pages & routing** — `src/routes.tsx` defines a `createBrowserRouter` where all app pages (`Home`, `Post`, `Profile`, `Chat`, `StyleBoard`, `Settings` in `src/pages/`) are children of `ProtectedRoutes` (`src/auth/ProtectedRoutes.tsx`), which redirects unauthenticated users to `/login` and shows the full-screen `Loading` page while the auth state resolves. Routes with URL params: `/profile/:username`, `/chat/:username`, `/settings/:section`. Only `/login`, `/signup`, and the catch-all `*` (404) are public. Every route uses `Error` (`src/pages/Error.tsx`) as its `errorElement`; it shows a 404 or a "Something went wrong" screen depending on `useRouteError()`.

2. **Contexts** — `App.tsx` wraps everything in `AlertProvider` (outermost) and `UserAuthProvider`:
   - `UserAuthProvider` (`src/auth/UserAuthContext.tsx`) — components call `useUserAuth()` to get `user` (the Firebase `User`), `userInfo` (the app's Firestore profile, see `UserInfo` in `src/types.ts`), `signUp`/`signIn`/`signOut`, and `refreshUserInfo()` (call it after anything that changes the signed-in user's doc). The context listens to `onAuthStateChanged` and fetches the Firestore user doc on every auth change. Note `ProtectedRoutes` currently uses `useAuthState` from `react-firebase-hooks` rather than this context (a known TODO in the code).
   - `AlertProvider` (`src/alerts/AlertContext.tsx`) — components call `useAlert().showAlert(type, message)` with `'error' | 'warning' | 'success' | 'info'`. Renders `AlertStack` (toasts at the top of the screen, auto-dismissing). Errors and success updates are one system on purpose. Never use the browser's `alert()`.

3. **Services** — all Firebase access goes through the service objects in `src/services/`; components should not call Firestore/Storage APIs directly:
   - `auth.service.ts` — sign-up/sign-in/sign-out and Firestore user docs. Sign-up writes to two collections atomically via `writeBatch`: `users/{uid}` (profile) and `usernames/{username}` (lowercased, used to enforce unique usernames). Also the Account info actions: `reauthenticate`, `changeEmail` (`verifyBeforeUpdateEmail`), `changePassword`, `changeUsername` (one batch: claim new name, release old, update user doc), and `deleteAccount` (Firestore docs, then the Auth account).
   - `profile.service.ts` — profile lookups by UID/username (with an in-memory `profileCache`; pass `fresh = true` to bypass it) and `updateProfile` for the owner-editable fields.
   - `post.service.ts` — CRUD on the `posts` collection plus likes and comments, which live in `posts/{id}/likes/{uid}` and `posts/{id}/comments/{commentId}` subcollections. The post doc carries denormalized `likeCount`/`commentCount` counters; like/comment mutations write the subcollection doc and the counter in one `writeBatch` (the security rules require this pairing — see `rules/firestore.rules`). Maintains an in-memory `postCache` Map — mutations must keep it in sync.
   - `follow.service.ts` — `toggleFollow` writes both mirrored docs (`users/{target}/followers/{me}` and `users/{me}/following/{target}`) and both counters in one batch; also `isFollowing`, `getFollowers`, `getFollowing`.
   - `chat.service.ts` — one-to-one chats in `chats/{uidA_uidB}` (sorted UIDs) with `messages` subcollections. Uses `onSnapshot` listeners (`subscribeToChats`, `subscribeToMessages`, which return unsubscribe functions that must run in `useEffect` cleanup) instead of a cache. The chat doc is created with the first message. Every message write (send, edit, unsend) also updates the chat's `lastMessage` preview in the same batch when needed; the rules require this.
   - `archive.service.ts` / `fit.service.ts` — the style board, both private (owner-only rules) and both `onSnapshot`-based like chat. The archive (`users/{uid}/archive`) holds copies of pieces: favorites (doc ID `postId_pieceIndex`, so a piece can't be favorited twice) and the user's own pieces. Fits (`users/{uid}/fits`) hold an optional name plus five sections (`FIT_SECTIONS`: headwear, tops, bottoms, footwear, accessories) of copied pieces. Unnamed fits are labeled `Fit #n` by board position (`getFitLabel`).
   - `storage.service.ts` — image upload to Firebase Storage. Always compresses via `browser-image-compression` first; paths are `posts/{uid}/{timestamp}.jpg` and `profile/{uid}/{timestamp}.jpg`, and download URLs get a `?t=` cache-busting param.

Shared data shapes (`UserInfo`, `Post`, `PieceDetail`, `Like`, `Comment`, `CommentPiece`, `Follow`, `Chat`, `MessagePreview`, `MessageReply`, `Message`, `ArchivedPiece`, `FitSection`, `FitPiece`, `Fit`) live in `src/types.ts`. Timestamps are ISO strings, not Firestore Timestamps. Shared input checks (`getUsernameError`, `getEmailError`, `getPasswordError`) live in `src/utils/validation.ts`, used by both sign-up and the Account info settings. `copyPiece` (`src/utils/pieces.ts`) copies a piece's fields wherever a piece is copied (archive, fits, comments about a piece).

Security rules live in `rules/firestore.rules` and `rules/storage.rules`. They are the source of truth and must be mirrored into the Firebase console (or deployed via the Firebase CLI) — keep them in sync with any service-layer change to data shapes or write patterns.

## Conventions

- Components are function components in `.tsx` files with a co-located `.css` file of the same name (plain CSS, no CSS modules). Bootstrap is imported globally in `main.tsx`; MUI is also a dependency.
- A `Post` has `hasDetails` toggling whether its `pieces: PieceDetail[]` (name, price, size, materials) are rendered — post cards branch on this.
- Pieces render through `PieceItem` everywhere (post cards, comments about a piece, the archive): with `actions` the name is a button opening a menu of them (post cards: Favorite/Comment; archive: Remove), without them it's plain text (comments about a piece are display only). A piece with details gets a chevron to show them. Style board overlays use the shared `Modal` (backdrop, Escape, scroll lock, `modal-button` footer buttons).
- Feedback: failed actions and successful updates go through `showAlert` (see Contexts above). Settings forms keep field-specific errors inline next to the field; their successes are alerts. Auth forms use `noValidate` and check fields themselves so the browser's validation bubbles never show.
- Loading states use `LoadingSpinner` (`src/components/LoadingSpinner.tsx`, optional `label`, `size` `'sm' | 'md'`) instead of plain "Loading..." text.

## Responsive Design

Breakpoints (mobile-first):
- Mobile: <= 500px (layout stacks; nav becomes floating icon-only buttons)
- Tablet: 501px–768px (side-by-side layout at 95vw)
- Desktop: > 768px
- Home only: the right side bar is hidden at <= 900px
- Chat: at <= 900px only one pane shows (the chat list on `/chat`, the open chat with a back button on `/chat/:username`), toggled by a `chat-thread-open` class
- StyleBoard: at <= 900px a Fits/Archive tab switch replaces the right side bar (one pane at a time), toggled by a `style-board-archive-open` class
- Settings: at <= 500px, `/settings` is a list of options and each section opens on its own screen with a back link, toggled by a `settings-section-open` class

CSS custom properties are defined in `src/App.css` under `:root` (colors including `--color-success`/`--color-warning` for alerts, typography, spacing, borders/radii, control sizes). Every button uses one of `--button-height-sm/md/lg` (20/32/44px) with the matching `--radius-button-sm/md/lg`. Text buttons grow on hover/click with `--scale-hover`/`--scale-active`; icon-only buttons instead grow the icon with `--scale-icon-sm/md/lg-hover/active`, picked by icon size (sm up to 20px, md 21–30px, lg bigger). Dropdown menu items use `--radius-menu-item`. The spacing scale is 5px-based to match the app's existing rhythm: --space-3xs (2px), --space-2xs (4px), --space-xs (5px), --space-sm (8px), --space-md (10px), --space-lg (15px), --space-xl (20px), --space-2xl (25px), --space-3xl (30px), --space-4xl (40px), --space-5xl (50px), --space-6xl (60px). Use these variables instead of hardcoded pixel values.

Media queries go in each component's co-located CSS file. Use `@media (max-width: 768px)` and `@media (max-width: 500px)`.

## Constraints

- Do not introduce new dependencies without asking first
- Do not touch functionality, Firebase service calls, or business logic — layout and styling only
- Do not convert CSS files to CSS modules or any other format
- Do not remove or rename existing CSS classes without confirming
- Bootstrap is globally imported — do not remove it, but prefer existing component CSS for layout work unless Bootstrap offers a better solution.
- Preserve all existing TypeScript types and component interfaces