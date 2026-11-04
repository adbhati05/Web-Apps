// Shared setup for the Firestore rules tests.
//
// How this works: the Firebase Emulator runs a throwaway Firestore on localhost (nothing here ever touches the real project). initializeTestEnvironment loads rules/firestore.rules into it,
// and each test then acts as a specific user (or as nobody) and asserts whether a read or write is allowed. assertSucceeds/assertFails only pass on an actual allow/deny from the rules,
// so a test that throws for any other reason (typo in a path, emulator not running) fails loudly instead of being mistaken for a permission result.
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { doc, setDoc, writeBatch, increment, type Firestore, type DocumentReference } from 'firebase/firestore';

let env: RulesTestEnvironment;

// Runs once per test file. The projectId has to match .firebaserc, and the demo- prefix is what tells the CLI this project doesn't exist online, so no login or real credentials are involved.
export async function startEnv() {
    env = await initializeTestEnvironment({
        projectId: 'demo-fitlog',
        firestore: {
            rules: readFileSync(fileURLToPath(new URL('../../rules/firestore.rules', import.meta.url)), 'utf8'),
            host: '127.0.0.1',
            port: 8080,
        },
    });
}

// Runs before every test so no test depends on data left behind by another.
export const clearAll = () => env.clearFirestore();

export const stopEnv = () => env.cleanup();

// The library hands back the older "compat" Firestore object, while the app (and these tests) use the modular API (doc(), setDoc(), writeBatch()).
// The modular functions unwrap compat objects at runtime, so the cast below only exists to satisfy TypeScript.
const modular = (ctx: { firestore(): unknown }) => ctx.firestore() as Firestore;

// A Firestore handle that acts as the given user, or as a signed-out visitor, with the rules enforced.
export const as = (uid: string) => modular(env.authenticatedContext(uid));
export const anon = () => modular(env.unauthenticatedContext());

// Writes test fixtures with the rules switched off, so a test can start from any state (a post that already has likes, someone else's comment, etc.) without having to earn it through the rules first.
export const seed = (fn: (db: Firestore) => Promise<void>) =>
    env.withSecurityRulesDisabled(ctx => fn(modular(ctx)));

export const now = () => new Date().toISOString();

// Fixtures that satisfy the create rules exactly. Tests break one field at a time from these to prove each check in the rules is really there.
export const validPost = (uid: string, postId: string) => ({
    id: postId,
    uid,
    username: uid,
    caption: 'fit check',
    pieces: [],
    hasDetails: false,
    createdAt: now(),
    imageURL: 'https://example.com/fit.jpg',
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

// Mirrors what postService.toggleLike / toggleCommentLike send: the like doc and the counter move together in one batch, which is the pairing the rules insist on.
// target is the post or comment being liked, likeRef is that target's likes/{uid} doc.
export function likeInBatch(db: Firestore, target: DocumentReference, likeRef: DocumentReference, uid: string, liking: boolean) {
    const batch = writeBatch(db);
    if (liking) {
        batch.set(likeRef, validLike(uid));
        batch.update(target, { likeCount: increment(1) });
    } else {
        batch.delete(likeRef);
        batch.update(target, { likeCount: increment(-1) });
    }
    return batch.commit();
}
