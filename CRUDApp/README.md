# FitLog

A social fashion app for posting outfits, breaking down the pieces in them, and interacting with other people's fits. Built with React 19, TypeScript, Vite, and Firebase.

**Status: work in progress.** Posting, the home feed, likes, comments, profiles, following, chat, and account settings work end to end. The style board is next (see [Currently in development](#currently-in-development)).

---

## Features

### Working today

- **Accounts.** Email/password sign-up and sign-in through Firebase Auth. Each account has a display name and a unique, lowercased username. Uniqueness is enforced server-side: the username is claimed in a `usernames` collection in the same atomic batch that creates the user doc, and the security rules make username docs create-only, so two people racing for the same name can't both win.
- **Posting.** Upload a photo, write a caption, and optionally attach details for each piece in the outfit (name, price, size, materials, date acquired). Images are compressed in the browser before upload, so a post photo lands at roughly 0.6 MB rather than a full-size camera file.
- **Home feed.** Every post, newest first, in a single-column feed. Posts with piece details render them in an expandable accordion under the caption.
- **Likes.** One like per user per post, toggled optimistically in the UI and reconciled with the server. The count is denormalized onto the post doc and kept honest by the security rules.
- **Comments.** Clicking the comment icon on a post opens an overlay with the photo on one side and the post info, a comment box, and a scrollable comment list on the other. Comments can be liked (same mechanics as post likes), edited by their author, and deleted by their author or by the post's owner. Comments are capped at 500 characters, both in the input and in the rules.
- **Profiles.** An Instagram-style profile page at `/profile` (yours) and `/profile/:username` (anyone's): picture, username, post/follower/following counts, display name, bio, and a three-column grid of posts that open in the comment overlay. Your own profile has Edit profile and Styleboard buttons; anyone else's has Follow and Message. Every post, comment, and the top bar show the author's real picture and link to their profile.
- **Following.** Follow and unfollow from anyone's profile, updated optimistically. Each follow is two mirrored docs (one under each user) plus both counters, written in one batch, and the rules won't accept any of the four writes without the others.
- **Chat.** One-to-one messages at `/chat` and `/chat/:username`, updating live for both people. The right sidebar lists your chats (newest first, unread ones bolded with a dot) and the people you follow you haven't messaged yet. Messages show as bubbles with timestamps on gaps, the other person's picture, and "Seen"/"Sent" under your latest message. Hovering a message lets you reply to it (with a quote of the original), and your own can be edited for 15 minutes after sending or unsent at any time.
- **Settings.** Account info (change username, email via a verification link, or password; see when the account was created; delete the account after confirming your password) and Edit profile (picture, display name, bio). On mobile it works like Instagram's settings: a list of options, each opening its own screen.
- **Feedback.** Alerts in the app's own style replace every browser alert, for both errors and successful updates. Loading states use a shared spinner, the app shows a loading page while it checks your sign-in, and unknown URLs or crashes get a styled error page.
- **Responsive layout.** Desktop, tablet, and mobile layouts. The comment overlay switches from side-by-side to stacked below 768px and goes full-screen below 500px. Chat shows one pane at a time below 900px.

### Present but not wired to UI yet

- Post editing and deletion (`postService.updatePost` / `deletePost` exist, no buttons for them).
- Followers/following lists (`followService.getFollowers` / `getFollowing` exist, the counts aren't clickable yet).

---

## Pages

All routes except `/login`, `/signup`, and the 404 sit behind `ProtectedRoutes`, which redirects signed-out users to the login page (and shows a loading page while it checks). The left sidebar links to Home, Style Board, Post, Profile, and Chat.

| Route | Page | State |
|---|---|---|
| `/` | Home: feed, comment overlay, right sidebar placeholder | Working |
| `/post` | Create a post | Working |
| `/profile`, `/profile/:username` | Profile: yours, or anyone's by username | Working |
| `/chat`, `/chat/:username` | Chat: your chats on the right, the open chat in the middle | Working |
| `/styleboard` | Style board | Stub, in development |
| `/settings`, `/settings/:section` | Settings: Account info and Edit profile | Working |
| `/login`, `/signup` | Auth | Working |
| anything else | 404 page | Working |

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

Design tokens (colors, type scale, a 5px-based spacing scale, radii, and three button sizes with matching radii) live as CSS custom properties in `src/App.css` and are used everywhere instead of hardcoded values.

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
│   ├── alerts/              # AlertContext: useAlert().showAlert(type, message), the app-wide alerts
│   ├── auth/                # UserAuthContext, ProtectedRoutes, Login/SignUp cards
│   ├── components/          # Reusable UI: TopBar, sidebars, feed and post pieces, PostOverlay, Comment, profile pieces, settings forms, ChatList/ChatThread/MessageBubble, AlertStack, LoadingSpinner
│   ├── pages/               # One route-level screen per file, plus Loading and Error
│   ├── services/            # All Firebase access lives here; components never call Firestore/Storage directly
│   │   ├── auth.service.ts      # Sign-up/in/out, plus username/email/password changes and account deletion
│   │   ├── post.service.ts      # Posts, likes, comments, comment likes
│   │   ├── storage.service.ts   # Image compression + upload
│   │   ├── profile.service.ts   # Profile lookups (cached) and profile edits
│   │   ├── follow.service.ts    # Follow/unfollow (mirrored docs + counters in one batch)
│   │   └── chat.service.ts      # Live chats and messages (onSnapshot), send/edit/unsend, read state
│   ├── utils/
│   │   └── validation.ts    # Username/email/password checks shared by sign-up and Settings
│   ├── firebase.ts          # Firebase initialization from env vars
│   ├── routes.tsx
│   └── types.ts             # Shared interfaces for every Firestore document shape
├── CLAUDE.md / AGENTS.md    # Guidance for AI coding assistants working in this repo
└── planning/                # Local planning notes (gitignored)
```

The app is three layers: pages and routing on top, the contexts in the middle (`useUserAuth()` gives any component the Firebase user, their profile doc, and sign-in/out; `useAlert()` shows alerts), and the service objects at the bottom.

---

## Data model

Timestamps are ISO strings everywhere, not Firestore `Timestamp`s.

```
users/{uid}                                   UserInfo (carries followerCount + followingCount)
users/{uid}/followers/{followerUid}           Follow   doc ID = the follower's UID
users/{uid}/following/{followedUid}           Follow   doc ID = the followed user's UID
usernames/{username}                          { uid, username, createdAt }   create-only, enforces uniqueness
posts/{postId}                                Post (carries likeCount + commentCount)
posts/{postId}/likes/{uid}                    Like   doc ID = liker's UID
posts/{postId}/comments/{commentId}           Comment (carries its own likeCount)
posts/{postId}/comments/{commentId}/likes/{uid}   Like
chats/{uidA_uidB}                             Chat   doc ID = the two UIDs sorted and joined; carries a lastMessage preview + lastRead map
chats/{chatId}/messages/{messageId}           Message (optional replyTo pointing at another message)
```

Likes, comments, follows, and messages are subcollections rather than arrays on the parent, so a popular post can't hit Firestore's 1 MiB document limit and nothing downloads every like or message. The counters on the parent doc are denormalized, and every like/comment/follow mutation writes the subcollection doc and the counter together in one `writeBatch`. The rules require that pairing: a counter can only move by 1, and only when the same batch creates or deletes the matching subcollection doc. Chats work the same way with their `lastMessage` preview: sending, editing, or unsending the latest message updates the preview in the same batch, so the chat list never shows stale or unsent text.

Storage paths are `posts/{uid}/{timestamp}.jpg` and `profile/{uid}/{timestamp}.jpg`. Both are public-read, owner-only write, image-only, and size-capped.

---

## Security rules

`rules/firestore.rules` and `rules/storage.rules` are the source of truth. The Firebase CLI is installed as a dev dependency for the emulator, but `.firebaserc` only points at the demo project, so after any change the rules are still pasted into the Firebase console and published by hand. Any service-layer change to a document shape or write pattern has to land in the rules at the same time, since the rules validate exact field sets on every write.

Highlights:

- Everything is denied unless a `match` block allows it, and subcollections need their own nested blocks.
- Writes are split into `create` / `update` / `delete` with per-operation field validation. Multiple `allow update` cases are additive, so each one pins its own allowed field set with `diff().affectedKeys().hasOnly([...])`.
- Like counters are bound to the caller's own like doc via `exists()` / `existsAfter()`, so they can't drift.
- User docs are readable by any signed-in user, which is why they hold no email. Creating one requires owning the matching username claim, checked with `getAfter()` inside the sign-up batch. Renaming has to claim the new name and release the old one in the same batch, and a username claim can only be released by a rename or an account deletion.
- Follows: each follow doc requires its mirror doc and its counter to move in the same batch, and you can't follow yourself.
- Chats: the chat ID has to equal the two participants' sorted UIDs, so the ID alone proves who's in it (which lets message reads skip a billed `get()` on the chat). Each participant can only set their own `lastRead` key. Messages can be edited by their sender for 15 minutes (checked against the server clock) and unsent at any time, and replies have to point at a real message in the same chat.
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

**The style board** (`/styleboard`): the baseline functionality and design, the same way profiles, following, and chat were built. The Styleboard button on your own profile already links there.

Profiles, following, and chat are done. Chat ended up with one-to-one chats in `chats/{uidA_uidB}`, live updates through `onSnapshot`, a `lastMessage` preview so the chat list never loads messages, a per-participant `lastRead` map for unread dots and "Seen", and message replies, editing, and unsending.

---

## Roadmap

- Post editing and deletion UI.
- Followers/following lists (clicking the counts on a profile).
- Chat: a "typing..." indicator, loading older messages (only the latest 50 load now), message reactions, and deleting chats.
- Feed pagination and a single collection-group query for "which of these did I like" instead of one read per post. Search, with pagination.
- Comment replies, shown under each comment in an accordion.
- Cloud Functions for the things client rules can't cover: cleaning up orphaned likes/comments when a post is deleted, fuller account deletion (posts, follows, chats, and images), server-side counter integrity for comments, the chat preview, and push notifications. The plan lives in the project's planning notes.
- Deploying rules with the Firebase CLI instead of console copy-paste.

## Known issues

- `npm run lint` reports three errors in older code: an `any` in `PostDescription.tsx` and two `as const` suggestions in `storage.service.ts`.
- Deleting an account removes the profile and the login, but leaves the user's posts, comments, likes, follow docs, chats, and images behind (and other users' follower/following counts stay inflated) until the account deletion Cloud Function exists.
- The piece-details accordion on post cards bounces when expanding/collapsing.
- The upload field sometimes needs the image picked twice before the preview appears.
