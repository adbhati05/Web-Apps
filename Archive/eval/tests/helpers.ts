// Shared setup for the Firestore and Storage rules tests.
//
// How this works: the Firebase Emulator runs a throwaway Firestore on localhost (nothing here ever touches the real project). initializeTestEnvironment loads rules/firestore.rules (and rules/storage.rules into the Storage emulator),
// and each test then acts as a specific user (or as nobody) and asserts whether a read or write is allowed. assertSucceeds/assertFails only pass on an actual allow/deny from the rules,
// so a test that throws for any other reason (typo in a path, emulator not running) fails loudly instead of being mistaken for a permission result.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { doc, setDoc, writeBatch, increment, serverTimestamp, Timestamp, type Firestore, type DocumentReference } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

let env: RulesTestEnvironment;

// Runs once per test file. The projectId has to match .firebaserc, and the demo- prefix is what tells the CLI this project doesn't exist online, so no login or real credentials are involved.
export async function startEnv() {
    env = await initializeTestEnvironment({
        projectId: 'demo-archive',
        firestore: {
            rules: readFileSync(fileURLToPath(new URL('../../rules/firestore.rules', import.meta.url)), 'utf8'),
            host: '127.0.0.1',
            port: 8080,
        },
        storage: {
            rules: readFileSync(fileURLToPath(new URL('../../rules/storage.rules', import.meta.url)), 'utf8'),
            host: '127.0.0.1',
            port: 9199,
        },
    });
}

// Runs before every test so no test depends on data left behind by another.
export const clearAll = () => Promise.all([env.clearFirestore(), env.clearStorage()]).then(() => undefined);

export const stopEnv = () => env.cleanup();

// The library hands back the older "compat" Firestore object, while the app (and these tests) use the modular API (doc(), setDoc(), writeBatch()).
// The modular functions unwrap compat objects at runtime, so the cast below only exists to satisfy TypeScript.
const modular = (ctx: { firestore(): unknown }) => ctx.firestore() as Firestore;

// A Firestore handle that acts as the given user, or as a signed-out visitor, with the rules enforced.
export const as = (uid: string) => modular(env.authenticatedContext(uid));
export const anon = () => modular(env.unauthenticatedContext());

// The same idea for Storage (storage.test.ts). Same compat-to-modular cast as above.
export const storageAs = (uid: string) => env.authenticatedContext(uid).storage() as unknown as FirebaseStorage;
export const storageAnon = () => env.unauthenticatedContext().storage() as unknown as FirebaseStorage;
export const seedStorage = (fn: (storage: FirebaseStorage) => Promise<unknown>) =>
    env.withSecurityRulesDisabled(ctx => fn(ctx.storage() as unknown as FirebaseStorage).then(() => undefined));

// Writes test fixtures with the rules switched off, so a test can start from any state (a post that already has likes, someone else's comment, etc.) without having to earn it through the rules first.
export const seed = (fn: (db: Firestore) => Promise<void>) =>
    env.withSecurityRulesDisabled(ctx => fn(modular(ctx)));

// What the services send for every createdAt/updatedAt/editedAt/lastRead: Firestore fills it in with the server's time, which is the only value the rules accept (isNow).
// Every serverTimestamp() in one batch resolves to the same time, so a message and its chat preview built from the same now() still match.
export const now = () => serverTimestamp();

// A fixed Timestamp `minutes` ago (negative = in the future). Used two ways: to seed docs that were written earlier (a message past its 15 minute edit window),
// and to prove a client-chosen date is rejected wherever the rules expect the server's time.
export const minutesAgo = (minutes: number) => Timestamp.fromDate(new Date(Date.now() - minutes * 60 * 1000));

// A download URL shaped exactly like what getDownloadURL() returns for a file in the app's Storage bucket, in folder/uid/ (posts/alice/..., profile/alice/...).
// The rules only accept image URLs like this (isOwnStorageURL), so fixtures use it, and tests change the folder or uid to prove someone else's folder is rejected.
export const storageURL = (folder: 'posts' | 'profile', uid: string, file = 'fit.jpg') =>
    `https://firebasestorage.googleapis.com/v0/b/fitlog-9ffc1.firebasestorage.app/o/${folder}%2F${uid}%2F${file}?alt=media&token=test-token`;

// Fixtures that satisfy the create rules exactly. Tests break one field at a time from these to prove each check in the rules is really there.
export const validPost = (uid: string, postId: string) => ({
    id: postId,
    uid,
    username: uid,
    caption: 'fit check',
    pieces: [],
    hasDetails: false,
    createdAt: now(),
    imageURL: storageURL('posts', uid),
    likeCount: 0,
    commentCount: 0,
});

export const validComment = (uid: string, commentId: string) => ({
    id: commentId,
    uid,
    username: uid,
    comment: 'clean fit',
    createdAt: now(),
    likeCount: 0,
});

export const validLike = (uid: string) => ({ uid, createdAt: now() });

// Seeds a post owned by ownerUid, with any field overridden (likeCount: 3, for instance).
export const seedPost = (postId: string, ownerUid: string, overrides: Record<string, unknown> = {}) =>
    seed(db => setDoc(doc(db, 'posts', postId), { ...validPost(ownerUid, postId), ...overrides }));

// Mirrors what postService.toggleLike / toggleCommentLike send: the like doc and the counter move together in one batch, which is the pairing the rules insist on (in both directions).
// target is the post or comment being liked, likeRef is that target's likes/{uid} doc. likeData swaps in a different like doc, so a test can break one field while the batch stays valid.
export function likeInBatch(db: Firestore, target: DocumentReference, likeRef: DocumentReference, uid: string, liking: boolean, likeData: Record<string, unknown> = validLike(uid)) {
    const batch = writeBatch(db);
    if (liking) {
        batch.set(likeRef, likeData);
        batch.update(target, { likeCount: increment(1) });
    } else {
        batch.delete(likeRef);
        batch.update(target, { likeCount: increment(-1) });
    }
    return batch.commit();
}

// Mirrors postService.addComment: the comment doc and the post's commentCount (+1) in one batch, which the rules require.
// Tests that break one field of the comment go through this too, so the counter isn't what rejects them.
export function commentInBatch(db: Firestore, postId: string, commentId: string, data: Record<string, unknown>) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'posts', postId, 'comments', commentId), data);
    batch.update(doc(db, 'posts', postId), { commentCount: increment(1) });
    return batch.commit();
}

// Mirrors postService.deleteComment: the comment doc goes and commentCount drops by 1 in the same batch.
export function deleteCommentInBatch(db: Firestore, postId: string, commentId: string) {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'posts', postId, 'comments', commentId));
    batch.update(doc(db, 'posts', postId), { commentCount: increment(-1) });
    return batch.commit();
}
