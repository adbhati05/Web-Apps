// Rules for posts/{postId} and posts/{postId}/likes/{uid}.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
import { startEnv, clearAll, stopEnv, as, anon, seed, now, validPost, validLike, seedPost, likeInBatch } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

// alice owns post p1 throughout. bob and carol are other signed-in users.
const POST = 'p1';

describe('posts/{postId} read', () => {
    it('the feed is public, so signed-out visitors can read posts', async () => {
        await seedPost(POST, 'alice');
        await assertSucceeds(getDoc(doc(anon(), 'posts', POST)));
    });
});

describe('posts/{postId} create', () => {
    it('a valid post as yourself with both counters at 0', () =>
        assertSucceeds(setDoc(doc(as('alice'), 'posts', POST), validPost('alice', POST))));

    it('cannot post as someone else', () =>
        assertFails(setDoc(doc(as('bob'), 'posts', POST), validPost('alice', POST))));

    it('signed-out visitors cannot post', () =>
        assertFails(setDoc(doc(anon(), 'posts', POST), validPost('alice', POST))));

    it('counters must start at 0', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), likeCount: 50 })));

    it('doc id must match the id field', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), id: 'somethingElse' })));

    it('caption is capped at 500 characters', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), caption: 'x'.repeat(501) })));

    it('at most 8 pieces', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), pieces: Array(9).fill({ name: 'shirt' }) })));

    it('no extra fields', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), featured: true })));

    it('hasDetails must be a boolean', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), hasDetails: 'yes' })));
});

describe('posts/{postId} update: owner editing content', () => {
    // Seeded with likes so the "counters stay frozen" checks are meaningful.
    beforeEach(() => seedPost(POST, 'alice', { likeCount: 3, commentCount: 2 }));

    it('owner can edit the caption', () =>
        assertSucceeds(updateDoc(doc(as('alice'), 'posts', POST), { caption: 'updated', updatedAt: now() })));

    it('non-owner cannot edit it', () =>
        assertFails(updateDoc(doc(as('bob'), 'posts', POST), { caption: 'hijacked' })));

    it('owner cannot reassign the post to another uid', () =>
        assertFails(updateDoc(doc(as('alice'), 'posts', POST), { uid: 'bob' })));

    it('owner cannot backdate createdAt', () =>
        assertFails(updateDoc(doc(as('alice'), 'posts', POST), { createdAt: '2020-01-01T00:00:00.000Z' })));

    it('owner cannot bump the counters while editing content', () =>
        assertFails(updateDoc(doc(as('alice'), 'posts', POST), { caption: 'updated', likeCount: 999 })));
});

describe('posts/{postId} update: like counter', () => {
    beforeEach(() => seedPost(POST, 'alice'));

    const like = (uid: string, liking: boolean) => {
        const db = as(uid);
        return likeInBatch(db, doc(db, 'posts', POST), doc(db, 'posts', POST, 'likes', uid), uid, liking);
    };

    it('liking writes the like doc and moves the counter by +1 in one batch', () =>
        assertSucceeds(like('bob', true)));

    it('unliking deletes the like doc and moves the counter by -1', async () => {
        await seed(db => Promise.all([
            setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')),
            updateDoc(doc(db, 'posts', POST), { likeCount: 1 }),
        ]).then(() => undefined));
        await assertSucceeds(like('bob', false));
    });

    it('the counter cannot move without a like doc in the same batch', () =>
        assertFails(updateDoc(doc(as('bob'), 'posts', POST), { likeCount: 1 })));

    it('the counter cannot jump by more than 1, even with a like doc', () => {
        const db = as('bob');
        const batch = writeBatch(db);
        batch.set(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob'));
        batch.update(doc(db, 'posts', POST), { likeCount: increment(2) });
        return assertFails(batch.commit());
    });

    it('cannot like the same post twice', async () => {
        await seed(db => Promise.all([
            setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')),
            updateDoc(doc(db, 'posts', POST), { likeCount: 1 }),
        ]).then(() => undefined));
        await assertFails(like('bob', true));
    });

    it('cannot unlike a post you never liked', () =>
        assertFails(like('bob', false)));

    it('cannot move the counter by writing a like doc under someone else\'s uid', () => {
        const db = as('bob');
        const batch = writeBatch(db);
        batch.set(doc(db, 'posts', POST, 'likes', 'carol'), validLike('carol'));
        batch.update(doc(db, 'posts', POST), { likeCount: increment(1) });
        return assertFails(batch.commit());
    });
});

describe('posts/{postId} update: comment counter', () => {
    beforeEach(() => seedPost(POST, 'alice'));

    // This pins the known gap: the comment id is client-generated, so the rules can't tie the counter to a comment doc the way they tie likeCount to the like doc.
    // If this test ever starts failing, the Cloud Function from to-do Section 3 has probably landed and the rule should be tightened to match.
    it('+1 succeeds on its own (not bound to a comment doc, see to-do)', () =>
        assertSucceeds(updateDoc(doc(as('bob'), 'posts', POST), { commentCount: 1 })));

    it('cannot go below 0', () =>
        assertFails(updateDoc(doc(as('bob'), 'posts', POST), { commentCount: -1 })));

    it('cannot jump by more than 1', () =>
        assertFails(updateDoc(doc(as('bob'), 'posts', POST), { commentCount: 2 })));

    it('cannot change the counter and the caption in the same write', () =>
        assertFails(updateDoc(doc(as('alice'), 'posts', POST), { commentCount: 1, caption: 'sneaky' })));
});

describe('posts/{postId} delete', () => {
    beforeEach(() => seedPost(POST, 'alice'));

    it('owner can delete their post', () =>
        assertSucceeds(deleteDoc(doc(as('alice'), 'posts', POST))));

    it('another user cannot delete it', () =>
        assertFails(deleteDoc(doc(as('bob'), 'posts', POST))));

    it('signed-out visitors cannot delete it', () =>
        assertFails(deleteDoc(doc(anon(), 'posts', POST))));
});

describe('posts/{postId}/likes/{uid}', () => {
    beforeEach(() => seedPost(POST, 'alice'));

    it('anyone can read (the feed checks did-I-like per post)', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')));
        await assertSucceeds(getDoc(doc(anon(), 'posts', POST, 'likes', 'bob')));
    });

    it('a user can create their own like doc', () =>
        assertSucceeds(setDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob'), validLike('bob'))));

    it('cannot create a like doc under another uid', () =>
        assertFails(setDoc(doc(as('bob'), 'posts', POST, 'likes', 'carol'), validLike('carol'))));

    it('uid field must match the doc id', () =>
        assertFails(setDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob'), validLike('carol'))));

    it('no extra fields', () =>
        assertFails(setDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob'), { ...validLike('bob'), weight: 10 })));

    it('cannot be updated', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')));
        await assertFails(updateDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob'), { createdAt: now() }));
    });

    it('owner can delete their like doc', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')));
        await assertSucceeds(deleteDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob')));
    });

    it('another user cannot delete it', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')));
        await assertFails(deleteDoc(doc(as('carol'), 'posts', POST, 'likes', 'bob')));
    });
});
