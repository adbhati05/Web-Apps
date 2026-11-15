// Rules for posts/{postId} and posts/{postId}/likes/{uid}.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
import { startEnv, clearAll, stopEnv, as, anon, seed, now, minutesAgo, storageURL, validPost, validLike, seedPost, likeInBatch } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

// alice owns post p1 throughout. bob and carol are other signed-in users.
const POST = 'p1';

// A piece exactly as PostDescription sends it: all five fields, with '' for details that weren't filled in.
const piece = (extra: Record<string, unknown> = {}) => ({ name: 'Black Denim Jacket', price: '$80', size: 'M', materials: 'Denim', dateAcquired: '', ...extra });

// alice creating p1 with the given fields overriding the valid post.
const createPost = (overrides: Record<string, unknown>) =>
    setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), ...overrides });

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

    // createdAt is what the feed sorts by, so a post dated in the future would stay pinned to the top.
    it('createdAt cannot be in the future', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), createdAt: minutesAgo(-60) })));

    it('createdAt has to be an ISO timestamp', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), createdAt: 'tomorrow' })));

    it('a device clock a couple of minutes fast is still allowed (5 minute allowance)', () =>
        assertSucceeds(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), createdAt: minutesAgo(-2) })));

    it('a createdAt in the past is allowed (posts made offline are sent late)', () =>
        assertSucceeds(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), createdAt: minutesAgo(60 * 24) })));
});

// Each piece is checked field by field (pieceValid in the rules), at all 8 possible positions.
describe('posts/{postId} create: pieces', () => {
    it('pieces with details succeed (empty details are fine)', () =>
        assertSucceeds(createPost({ pieces: [piece(), piece({ name: 'White Sneakers', price: '', size: '', materials: '' })], hasDetails: true })));

    it('a piece with just a name succeeds', () =>
        assertSucceeds(createPost({ pieces: [{ name: 'shirt' }] })));

    it('8 valid pieces succeed (the most a post can have)', () =>
        assertSucceeds(createPost({ pieces: Array(8).fill(piece()) })));

    it('a piece name cannot be empty', () =>
        assertFails(createPost({ pieces: [piece({ name: '' })] })));

    it('a piece name is capped at 100 characters', () =>
        assertFails(createPost({ pieces: [piece({ name: 'x'.repeat(101) })] })));

    it('a detail is capped at 100 characters', () =>
        assertFails(createPost({ pieces: [piece({ materials: 'x'.repeat(101) })] })));

    it('details have to be strings', () =>
        assertFails(createPost({ pieces: [piece({ price: 80 })] })));

    it('a piece cannot carry extra fields', () =>
        assertFails(createPost({ pieces: [piece({ link: 'https://example.com' })] })));

    it('a piece has to be a map, not a plain string', () =>
        assertFails(createPost({ pieces: ['Black Denim Jacket'] })));

    // Rules have no loops, so each position is its own line in piecesValid. This proves the last one is there too.
    it('a bad piece in the 8th spot is caught too', () =>
        assertFails(createPost({ pieces: [...Array(7).fill(piece()), piece({ name: '' })] })));
});

// The image has to be in alice's own posts/ folder in the app's Storage bucket (isOwnStorageURL in the rules).
describe('posts/{postId} create: imageURL', () => {
    it('an image in your own posts folder succeeds', () =>
        assertSucceeds(createPost({ imageURL: storageURL('posts', 'alice', 'other.jpg') })));

    it('an image on another site is rejected (a tracking pixel, for instance)', () =>
        assertFails(createPost({ imageURL: 'https://example.com/fit.jpg' })));

    it('an image in someone else\'s folder is rejected', () =>
        assertFails(createPost({ imageURL: storageURL('posts', 'bob') })));

    it('an image in your profile folder is rejected (posts use the posts folder)', () =>
        assertFails(createPost({ imageURL: storageURL('profile', 'alice') })));

    it('a lookalike domain is rejected', () =>
        assertFails(createPost({ imageURL: storageURL('posts', 'alice').replace('googleapis.com', 'googleapis.com.evil.example') })));

    it('another Firebase project\'s bucket is rejected', () =>
        assertFails(createPost({ imageURL: storageURL('posts', 'alice').replace('fitlog-9ffc1', 'someone-else') })));
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

    it('owner cannot change the image to one on another site', () =>
        assertFails(updateDoc(doc(as('alice'), 'posts', POST), { imageURL: 'https://example.com/fit.jpg' })));

    it('owner cannot change the pieces to invalid ones', () =>
        assertFails(updateDoc(doc(as('alice'), 'posts', POST), { pieces: [piece({ name: 'x'.repeat(101) })] })));

    // Pieces and the image are only checked when they change, so a post written before these checks existed can still be edited.
    it('a caption edit still works on an older post whose image is outside the bucket', async () => {
        await seedPost(POST, 'alice', { likeCount: 3, commentCount: 2, imageURL: 'https://example.com/old.jpg' });
        await assertSucceeds(updateDoc(doc(as('alice'), 'posts', POST), { caption: 'updated', updatedAt: now() }));
    });
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

    it('createdAt cannot be in the future', () =>
        assertFails(setDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob'), { ...validLike('bob'), createdAt: minutesAgo(-60) })));

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
