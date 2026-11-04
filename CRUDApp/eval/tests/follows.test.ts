// Rules for users/{uid}/followers/{followerUid} and users/{uid}/following/{followedUid}, plus the two counters they're bound to.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, writeBatch, increment, type Firestore } from 'firebase/firestore';
import { startEnv, clearAll, stopEnv, as, anon, seed, now } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

const validUser = (username: string) => ({ displayName: username, username, createdAt: now(), followerCount: 0, followingCount: 0 });
const followDoc = (uid: string) => ({ uid, createdAt: now() });

// Mirrors followService.toggleFollow: both follow docs and both counters in one batch. Anything in `skip` is left out of the batch, so a test can drop one of the four writes and prove the rules notice.
type Part = 'following' | 'follower' | 'myCount' | 'theirCount';
function followBatch(db: Firestore, me: string, target: string, following: boolean, skip: Part[] = []) {
    const batch = writeBatch(db);
    const followingRef = doc(db, 'users', me, 'following', target);
    const followerRef = doc(db, 'users', target, 'followers', me);
    const delta = following ? 1 : -1;

    if (!skip.includes('following')) {
        if (following) batch.set(followingRef, followDoc(target));
        else batch.delete(followingRef);
    }
    if (!skip.includes('follower')) {
        if (following) batch.set(followerRef, followDoc(me));
        else batch.delete(followerRef);
    }
    if (!skip.includes('myCount')) batch.update(doc(db, 'users', me), { followingCount: increment(delta) });
    if (!skip.includes('theirCount')) batch.update(doc(db, 'users', target), { followerCount: increment(delta) });
    return batch.commit();
}

// Seeds bob already following alice, with the counters to match.
const seedFollow = () => seed(async db => {
    await setDoc(doc(db, 'users/bob/following/alice'), followDoc('alice'));
    await setDoc(doc(db, 'users/alice/followers/bob'), followDoc('bob'));
    await setDoc(doc(db, 'users/alice'), { ...validUser('alice'), followerCount: 1 });
    await setDoc(doc(db, 'users/bob'), { ...validUser('bob'), followingCount: 1 });
});

beforeEach(() => seed(async db => {
    await setDoc(doc(db, 'users/alice'), validUser('alice'));
    await setDoc(doc(db, 'users/bob'), validUser('bob'));
}));

describe('follow', () => {
    it('the full follow batch succeeds', () =>
        assertSucceeds(followBatch(as('bob'), 'bob', 'alice', true)));

    it('cannot follow on someone else\'s behalf', () =>
        assertFails(followBatch(as('carol'), 'bob', 'alice', true)));

    it('cannot follow yourself', () =>
        assertFails(followBatch(as('alice'), 'alice', 'alice', true)));

    it('cannot follow twice', async () => {
        await seedFollow();
        await assertFails(followBatch(as('bob'), 'bob', 'alice', true));
    });

    it('following doc alone is rejected (mirror follower doc missing)', () =>
        assertFails(followBatch(as('bob'), 'bob', 'alice', true, ['follower'])));

    it('follower doc alone is rejected (mirror following doc missing)', () =>
        assertFails(followBatch(as('bob'), 'bob', 'alice', true, ['following'])));

    it('cannot skip your own following counter', () =>
        assertFails(followBatch(as('bob'), 'bob', 'alice', true, ['myCount'])));

    it('cannot skip the target\'s follower counter', () =>
        assertFails(followBatch(as('bob'), 'bob', 'alice', true, ['theirCount'])));

    it('follow docs cannot carry extra fields', () => {
        const db = as('bob');
        const batch = writeBatch(db);
        batch.set(doc(db, 'users/bob/following/alice'), { ...followDoc('alice'), note: 'hi' });
        batch.set(doc(db, 'users/alice/followers/bob'), followDoc('bob'));
        batch.update(doc(db, 'users/bob'), { followingCount: increment(1) });
        batch.update(doc(db, 'users/alice'), { followerCount: increment(1) });
        return assertFails(batch.commit());
    });

    it('follow docs must hold the other user\'s uid', () => {
        const db = as('bob');
        const batch = writeBatch(db);
        batch.set(doc(db, 'users/bob/following/alice'), followDoc('carol'));
        batch.set(doc(db, 'users/alice/followers/bob'), followDoc('bob'));
        batch.update(doc(db, 'users/bob'), { followingCount: increment(1) });
        batch.update(doc(db, 'users/alice'), { followerCount: increment(1) });
        return assertFails(batch.commit());
    });
});

describe('unfollow', () => {
    beforeEach(seedFollow);

    it('the full unfollow batch succeeds', () =>
        assertSucceeds(followBatch(as('bob'), 'bob', 'alice', false)));

    it('cannot unfollow on someone else\'s behalf', () =>
        assertFails(followBatch(as('carol'), 'bob', 'alice', false)));

    it('cannot leave the mirror doc behind', () =>
        assertFails(followBatch(as('bob'), 'bob', 'alice', false, ['follower'])));

    it('cannot skip either counter', async () => {
        await assertFails(followBatch(as('bob'), 'bob', 'alice', false, ['myCount']));
        await assertFails(followBatch(as('bob'), 'bob', 'alice', false, ['theirCount']));
    });

    it('the followed user cannot remove the follow (only the follower can)', () =>
        assertFails(followBatch(as('alice'), 'bob', 'alice', false)));
});

describe('read and update', () => {
    beforeEach(seedFollow);

    it('signed-in users can read followers and following', async () => {
        await assertSucceeds(getDoc(doc(as('carol'), 'users/alice/followers/bob')));
        await assertSucceeds(getDoc(doc(as('carol'), 'users/bob/following/alice')));
    });

    it('signed-out visitors cannot read them', () =>
        assertFails(getDoc(doc(anon(), 'users/alice/followers/bob'))));

    it('follow docs cannot be updated', () =>
        assertFails(setDoc(doc(as('bob'), 'users/bob/following/alice'), followDoc('alice'))));
});
