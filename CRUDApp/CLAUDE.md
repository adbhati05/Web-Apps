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
npm run deploy:rules  # Run the rules tests, then deploy Firestore + Storage rules to the dev project
```

The only tests are the security rules tests in `eval/tests/` (one file per area: `users`, `posts`, `comments`, `follows`, `chats`, `styleboard`, plus shared setup in `helpers.ts`), run with Vitest against the Firebase Emulator (`firebase.json` / `.firebaserc` at the root, project ID `demo-fitlog` so it never touches production). When a rule changes, add or update the matching test. There are no component or end-to-end tests.

## Environment

Firebase config is read from Vite env vars (`VITE_FIREBASE_*`) in `src/firebase.ts`. `.env.development` and `.env.production` exist locally but are gitignored — never commit them. If they're missing, the app cannot connect to Firebase.

Firebase projects (aliases in `.firebaserc`):
- `default` → `demo-fitlog`: emulator only (rules tests). Any `firebase` command without `--project` lands here, so nothing touches a real project by accident.
- `dev` → `fitlog-9ffc1` (FitLog Dev): the only real project so far. `.env.development` points at it, so `npm run dev` reads and writes real (dev) data. `npm run deploy:rules` runs the rules tests and, if they pass, deploys `rules/firestore.rules` and `rules/storage.rules` to it. Deploy rules this way, not by pasting into the console.
- `prod`: reserved, not created yet. Production gets its own Firebase project before launch: add it as `prod` in `.firebaserc`, add a separate `deploy:rules:prod` script, and fill `.env.production` (currently empty, so a production build has no Firebase config). Never point `dev` scripts or `.env.development` at the production project.

## Architecture

Three layers, top to bottom:

1. **Pages & routing** — `src/routes.tsx` defines a `createBrowserRouter` where all app pages (`Home`, `Post`, `Profile`, `Chat`, `StyleBoard`, `Settings` in `src/pages/`) are children of `ProtectedRoutes` (`src/auth/ProtectedRoutes.tsx`), which redirects unauthenticated users to `/login` and shows the full-screen `Loading` page while the auth state and profile load (see `status` below). Routes with URL params: `/profile/:username`, `/chat/:username`, `/settings/:section`. Only `/login`, `/signup`, and the catch-all `*` (404) are public. Every route uses `Error` (`src/pages/Error.tsx`) as its `errorElement`; it shows a 404 or a "Something went wrong" screen depending on `useRouteError()`.

2. **Contexts** — `App.tsx` wraps everything in `AlertProvider` (outermost) and `UserAuthProvider`:
   - `UserAuthProvider` (`src/auth/UserAuthContext.tsx`) — `useUserAuth()` gives `user` (the Firebase `User`), `userInfo` (the app's Firestore profile, see `UserInfo` in `src/types.ts`), `status` (`'loading' | 'signedOut' | 'ready' | 'noProfile' | 'error'`), `signUp`/`signIn`/`signOut`, and `deleteAccount`. Once Auth reports a user, the context keeps an `onSnapshot` listener on their user doc (`profileService.subscribeToUserInfo`), so edits to it (Settings, follows) show up everywhere on their own; no manual refresh is needed. `ProtectedRoutes` renders pages only when `status` is `'ready'` (`'loading'` shows `Loading`, `'signedOut'` redirects to `/login`, `'error'`/`'noProfile'` throw to the `Error` page, which then offers Sign out). Inside protected pages, use `useSignedInUser()`, which returns the non-null `UserInfo`, instead of checking `userInfo` for null.
   - `AlertProvider` (`src/alerts/AlertContext.tsx`) — components call `useAlert().showAlert(type, message)` with `'error' | 'warning' | 'success' | 'info'`. Renders `AlertStack` (toasts at the top of the screen, auto-dismissing). Errors and success updates are one system on purpose. Never use the browser's `alert()`.

3. **Services** — all Firebase access goes through the service objects in `src/services/`; components should not call Firestore/Storage APIs directly:
   - `auth.service.ts` — sign-up/sign-in/sign-out and Firestore user docs. Sign-up writes to two collections atomically via `writeBatch`: `users/{uid}` (profile) and `usernames/{username}` (lowercased, used to enforce unique usernames). Also the Account info actions: `reauthenticate`, `changeEmail` (`verifyBeforeUpdateEmail`), `changePassword`, `changeUsername` (one batch: claim new name, release old, update user doc), and `deleteAccount` (Firestore docs, then the Auth account).
   - `profile.service.ts` — `subscribeToUserInfo` (the auth context's listener on the signed-in user's doc), profile lookups by UID/username (with an in-memory `profileCache`; pass `fresh = true` to bypass it) and `updateProfile` for the owner-editable fields.
   - `post.service.ts` — CRUD on the `posts` collection plus likes and comments, which live in `posts/{id}/likes/{uid}` and `posts/{id}/comments/{commentId}` subcollections. The post doc carries denormalized `likeCount`/`commentCount` counters; like/comment mutations write the subcollection doc and the counter in one `writeBatch` (the security rules require this pairing — see `rules/firestore.rules`). Maintains an in-memory `postCache` Map — mutations must keep it in sync. `updatePost`/`deletePost` also notify `subscribeToPostChanges` listeners (in this tab only, not `onSnapshot`), which is how the feed and the profile grid drop or update a post edited from the overlay; any new list of posts should subscribe the same way.
   - `follow.service.ts` — `toggleFollow` writes both mirrored docs (`users/{target}/followers/{me}` and `users/{me}/following/{target}`) and both counters in one batch; also `isFollowing`, `getFollowers`, `getFollowing`.
   - `chat.service.ts` — one-to-one chats in `chats/{uidA_uidB}` (sorted UIDs) with `messages` subcollections. Uses `onSnapshot` listeners (`subscribeToChats`, `subscribeToMessages`, which return unsubscribe functions that must run in `useEffect` cleanup) instead of a cache. The chat doc is created with the first message. Every message write (send, edit, unsend) also updates the chat's `lastMessage` preview in the same batch when needed; the rules require this.
   - `archive.service.ts` / `fit.service.ts` — the style board, both private (owner-only rules) and both `onSnapshot`-based like chat. The archive (`users/{uid}/archive`) holds copies of pieces: favorites (doc ID `postId_pieceIndex`, so a piece can't be favorited twice) and the user's own pieces. Fits (`users/{uid}/fits`) hold an optional name plus five sections (`FIT_SECTIONS`: headwear, tops, bottoms, footwear, accessories) of copied pieces. Unnamed fits are labeled `Fit #n` by board position (`getFitLabel`).
   - `storage.service.ts` — image upload to Firebase Storage. Always compresses to JPEG via `browser-image-compression` first and uploads the compressed `File` directly; if compression fails it throws `ImageProcessingError`, whose message is safe to show users (pages check `instanceof` and show a generic message for any other error). Paths are `posts/{uid}/{timestamp}.jpg` and `profile/{uid}/{timestamp}.jpg`; every upload gets a unique path, so no cache-busting is needed. `deletePost` deletes the doc first, then the image as best-effort cleanup.

Shared data shapes (`UserInfo`, `Post`, `PieceDetail`, `Like`, `Comment`, `CommentPiece`, `Follow`, `Chat`, `MessagePreview`, `MessageReply`, `Message`, `ArchivedPiece`, `FitSection`, `FitPiece`, `Fit`) live in `src/types.ts`. Timestamps are ISO strings, not Firestore Timestamps. They come from the writer's device, so every create rule checks `createdAt` with `isNotFuture` (`rules/firestore.rules`): it must parse as ISO and be at most 5 minutes ahead of the server's clock. Past dates are allowed, and updates freeze `createdAt`, so any new collection with a `createdAt` should use the same helper on create. Shared input checks (`getUsernameError`, `getEmailError`, `getPasswordError`) live in `src/utils/validation.ts`, used by both sign-up and the Account info settings. Every input length/count limit (`USERNAME_MIN/MAX`, `DISPLAY_NAME_MAX`, `BIO_MAX`, `CAPTION_MAX`, `PIECES_MAX`, `PIECE_FIELD_MAX`, `COMMENT_MAX`, `MESSAGE_MAX`, `FIT_NAME_MAX`, `FIT_SECTION_MAX`) lives in `src/utils/limits.ts`; each mirrors a check in `rules/firestore.rules`, so change the constant, the rule, and its test together, and never hardcode a `maxLength` number. Image URLs on posts and profiles must be in the owner's own folder in the app's Storage bucket (`isOwnStorageURL` in the rules). `copyPiece` (`src/utils/pieces.ts`) copies a piece's fields wherever a piece is copied (archive, fits, comments about a piece).

Security rules live in `rules/firestore.rules` and `rules/storage.rules`. They are the source of truth and are deployed with `npm run deploy:rules` (see Environment) — keep them in sync with any service-layer change to data shapes or write patterns.

## Conventions

- Components are function components in `.tsx` files with a co-located `.css` file of the same name (plain CSS, no CSS modules). Bootstrap is imported globally in `main.tsx`. There is no component library (MUI was removed).
- A `Post` has `hasDetails` toggling whether its `pieces: PieceDetail[]` (name, price, size, materials) are rendered — post cards branch on this.
- Pieces render through `PieceItem` everywhere (post cards, comments about a piece, the archive): with `actions` the name is a button opening a menu of them (post cards: Favorite/Comment; archive: Remove), without them it's plain text (comments about a piece are display only). A piece with details gets a chevron to show them. Popups use the shared `Modal` (backdrop, Escape and outside-click to close, scroll lock, `modal-button` footer buttons; modals can stack, and Escape only closes the top one). Two kinds:
  - **Form modals** (creating or editing something, like adding a piece or planning a fit): keep the header X and have no Cancel button; the footer holds the primary action (Save, Add).
  - **Confirmation modals** (asking the user to confirm an action, especially a destructive one, like deleting a fit): `size="sm"`, `showCloseButton={false}`, a short message, and a footer with exactly two choices, Cancel (plain `modal-button`) and the action (`modal-button-danger` when destructive, labeled with the verb, e.g. Delete). Escape and clicking outside still act as Cancel.
- Your own posts get `PostMenu` (Edit/Delete): three lines next to the date on feed cards and left of the X in the post overlay. It owns the Edit post form (`EditPostOverlay`, caption and pieces; the photo can't be changed) and the delete confirmation; callers only render it when `post.uid` is the signed-in user's.
- Feedback: failed actions and successful updates go through `showAlert` (see Contexts above). Settings forms keep field-specific errors inline next to the field; their successes are alerts. Auth forms use `noValidate` and check fields themselves so the browser's validation bubbles never show.
- Logging goes through `src/utils/logger.ts`, never `console.*` directly: `logError(message, error, context?)` for real failures (always printed, and the one place to plug in error reporting later), `logDebug(...)` for dev-only logs. `context` is for small non-sensitive values like an ID; never pass a whole user object or a token.
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