# FitLog

A social fashion app for posting outfits, breaking down the pieces in them, and interacting with other people's fits. Built with React 19, TypeScript, Vite, and Firebase.

**Status: work in progress.** Posting, the home feed, likes, and comments work end to end. Profiles, following, and chat are the next pieces (see [Currently in development](#currently-in-development)).

---

## Features

### Working today

- **Accounts.** Email/password sign-up and sign-in through Firebase Auth. Each account has a display name and a unique, lowercased username. Uniqueness is enforced server-side: the username is claimed in a `usernames` collection in the same atomic batch that creates the user doc, and the security rules make username docs create-only, so two people racing for the same name can't both win.
- **Posting.** Upload a photo, write a caption, and optionally attach details for each piece in the outfit (name, price, size, materials, date acquired). Images are compressed in the browser before upload, so a post photo lands at roughly 0.6 MB rather than a full-size camera file.
- **Home feed.** Every post, newest first, in a single-column feed. Posts with piece details render them in an expandable accordion under the caption.
- **Likes.** One like per user per post, toggled optimistically in the UI and reconciled with the server. The count is denormalized onto the post doc and kept honest by the security rules.
- **Comments.** Clicking the comment icon on a post opens an overlay with the photo on one side and the post info, a comment box, and a scrollable comment list on the other. Comments can be liked (same mechanics as post likes), edited by their author, and deleted by their author or by the post's owner. Comments are capped at 500 characters, both in the input and in the rules.
- **Responsive layout.** Desktop, tablet, and mobile layouts. The comment overlay switches from side-by-side to stacked below 768px and goes full-screen below 500px.

### Present but not wired to UI yet

- Post editing and deletion (`postService.updatePost` / `deletePost` exist, no buttons for them).
- Account deletion (`authService.deleteUser`, same situation).
- Profile picture upload (`storageService.uploadProfileImage` exists, everything shows a placeholder for now).

---

## Pages

All routes except `/login` and `/signup` sit behind `ProtectedRoutes`, which redirects signed-out users to the login page. The left sidebar links to the first five.

| Route | Page | State |
|---|---|---|
| `/` | Home: feed, comment overlay, right sidebar placeholder | Working |
| `/post` | Create a post | Working |
| `/profile` | Profile | Stub |
| `/chat` | Chat | Stub, in development |
| `/styleboard` | Style board | Stub |
| `/settings` | Settings | Stub |
| `/login`, `/signup` | Auth | Working |

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript, plain CSS (one `.css` file next to each component) |
| Routing | React Router 7 (`createBrowserRouter`) |
| Build | Vite 6 with the SWC React plugin |
| Backend | Firebase: Auth, Firestore, Storage |
| Images | `browser-image-compression` |
| Styling helpers | Bootstrap (globally imported), MUI (accordion), `react-icons` |
| Lint | ESLint flat config with `typescript-eslint` and `react-hooks` |

Design tokens (colors, type scale, a 5px-based spacing scale, radii, control sizes) live as CSS custom properties in `src/App.css` and are used everywhere instead of hardcoded values.

---

## Project structure

```
CRUDApp/
├── rules/
│   ├── firestore.rules      # Firestore security rules (source of truth, mirrored into the console)
│   └── storage.rules        # Storage security rules
├── eval/
│   ├── vitest.config.ts
│   └── tests/               # Firestore rules tests (run on the local emulator)
├── firebase.json / .firebaserc   # Emulator config, points at rules/
├── src/
│   ├── auth/                # UserAuthContext, ProtectedRoutes, Login/SignUp cards
│   ├── components/          # Reusable UI: TopBar, sidebars, PostFeed, PostCard, PostOverlay, Comment, upload/description fields
│   ├── pages/               # One route-level screen per file
│   ├── services/            # All Firebase access lives here; components never call Firestore/Storage directly
│   │   ├── auth.service.ts
│   │   ├── post.service.ts      # Posts, likes, comments, comment likes
│   │   ├── storage.service.ts   # Image compression + upload
│   │   ├── profile.service.ts   # Planned (empty)
│   │   ├── follow.service.ts    # Planned (empty)
│   │   └── chat.service.ts      # Planned (empty)
│   ├── firebase.ts          # Firebase initialization from env vars
│   ├── routes.tsx
│   └── types.ts             # Shared interfaces for every Firestore document shape
├── CLAUDE.md / AGENTS.md    # Guidance for AI coding assistants working in this repo
└── planning/                # Local planning notes (gitignored)
```

The app is three layers: pages and routing on top, the auth context (`useUserAuth()` gives any component the Firebase user, their profile doc, and sign-in/out) in the middle, and the service objects at the bottom.

---

## Data model

Timestamps are ISO strings everywhere, not Firestore `Timestamp`s.

```
users/{uid}                                   UserInfo
usernames/{username}                          { uid, username, createdAt }   create-only, enforces uniqueness
posts/{postId}                                Post (carries likeCount + commentCount)
posts/{postId}/likes/{uid}                    Like   doc ID = liker's UID
posts/{postId}/comments/{commentId}           Comment (carries its own likeCount)
posts/{postId}/comments/{commentId}/likes/{uid}   Like
```

Likes and comments are subcollections rather than arrays on the post, so a popular post can't hit Firestore's 1 MiB document limit and the feed never downloads every like. The counters on the parent doc are denormalized, and every like/comment mutation writes the subcollection doc and the counter together in one `writeBatch`. The rules require that pairing: a counter can only move by 1, and only when the same batch creates or deletes the matching subcollection doc.

Storage paths are `posts/{uid}/{timestamp}.jpg` and `profile/{uid}/{timestamp}.jpg`. Both are public-read, owner-only write, image-only, and size-capped.

---

## Security rules

`rules/firestore.rules` and `rules/storage.rules` are the source of truth. The Firebase CLI is installed as a dev dependency for the emulator, but `.firebaserc` only points at the demo project, so after any change the rules are still pasted into the Firebase console and published by hand. Any service-layer change to a document shape or write pattern has to land in the rules at the same time, since the rules validate exact field sets on every write.

Highlights:

- Everything is denied unless a `match` block allows it, and subcollections need their own nested blocks.
- Writes are split into `create` / `update` / `delete` with per-operation field validation. Multiple `allow update` cases are additive, so each one pins its own allowed field set with `diff().affectedKeys().hasOnly([...])`.
- Like counters are bound to the caller's own like doc via `exists()` / `existsAfter()`, so they can't drift.
- User docs are readable by any signed-in user, which is why they hold no email. Creating one requires owning the matching username claim, checked with `getAfter()` inside the sign-up batch.
- Comment deletion is allowed for the author or the post owner (moderation). The post-owner check is ordered last because it costs a billed `get()`.

---

## Getting started

**Prerequisites:** Node 18+, a Firebase project with Auth (email/password), Firestore, and Storage enabled.

```sh
npm install
```

Create `.env.development` (and `.env.production` for builds) in `CRUDApp/` with your Firebase web app config. These files are gitignored.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

Paste `rules/firestore.rules` and `rules/storage.rules` into the Firebase console and publish them. Then:

```sh
npm run dev       # Vite dev server
npm run build     # tsc -b, then a production build into dist/
npm run preview   # serve the production build locally
npm run lint      # ESLint
```

### Testing

The security rules have a test suite that runs against the local Firebase Emulator, so nothing touches the real project. Java is required (the Firestore emulator is a jar, downloaded on first run).

```sh
npm run test:rules   # starts the emulator, runs eval/tests/*.test.ts, shuts it down
npm run emulators    # just the emulator, for running vitest in watch mode from eval/
```

`firebase.json` and `.firebaserc` at the project root configure the emulator and point it at `rules/`. The project ID there is `demo-fitlog`: the `demo-` prefix tells the CLI the project doesn't exist online, so no login is needed and nothing can reach production. Tests live in `eval/tests/`, one file per collection, and each one acts as specific users and asserts what the rules allow or deny. There are no component or end-to-end tests yet.

---

## Currently in development

**Chat / direct messaging**, along with the two things it depends on: user profiles and following.

The three services already exist as empty files (`profile.service.ts`, `follow.service.ts`, `chat.service.ts`), and the interfaces are defined in `src/types.ts`:

- `UserInfo` gains `bio`, `followerCount`, and `followingCount`.
- `Follow` for the mirrored `users/{uid}/followers` and `users/{uid}/following` subcollections, written together in one batch like everything else.
- `Conversation`, with a `participantIds` array queried by `array-contains`, a `lastMessage` preview so the list view never loads messages, and a per-participant `lastRead` map so marking a thread read is one write.
- `Message`, in a `conversations/{id}/messages` subcollection. One-to-one conversations use a deterministic ID built from the two sorted UIDs, so a pair of users can never end up with two threads.

Rough order of work:

1. ~~Rework the `users` rules so other signed-in users can read profiles.~~ Done: `email` is off the user doc (Firebase Auth keeps it), user docs are readable by any signed-in user, and writes are split into create, profile-edit, and counter cases.
2. Profile page: view and edit your own profile, view others'.
3. Follow / unfollow, with counters enforced by the rules the same way like counts are.
4. Conversation creation, real-time messages via `onSnapshot`, and the chat UI.
5. Later: pagination, unread indicators, blocking, and who-can-message-whom controls.

---

## Roadmap

- Style board and saved posts (the `/styleboard` route).
- Profile pictures in the top bar, on posts, and on comments (the upload path exists, nothing displays them yet).
- Post editing and deletion UI.
- Feed pagination and a single collection-group query for "which of these did I like" instead of one read per post.
- Cloud Functions for the things client rules can't cover: cleaning up orphaned likes/comments when a post is deleted, full account deletion, and server-side counter integrity for comments.
- Shared error / success / warning message components, plus loading and empty states for the feed.
- Deploying rules with the Firebase CLI instead of console copy-paste.

## Known issues

- `npm run build` currently fails type-checking on a few unused variables (`ProtectedRoutes.tsx`, `PostFeed.tsx`). `npx vite build` skips the check and builds fine. Fixing these is tied to the loading/error state work above.
- The feed's loading and error states are tracked but not rendered, so a failed fetch looks like an empty feed.
- The piece-details accordion on post cards bounces when expanding/collapsing.
- The upload field sometimes needs the image picked twice before the preview appears.
