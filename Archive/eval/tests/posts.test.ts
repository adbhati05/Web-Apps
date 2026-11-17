// Rules for posts/{postId} and posts/{postId}/likes/{uid}.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, increment, collection } from 'firebase/firestore';
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
    beforeEach(() => seedPost(POST, 'alice'));

    it('signed-in users can read posts', () =>
        assertSucceeds(getDoc(doc(as('bob'), 'posts', POST))));

    // Every page that shows posts is behind the login, so signed-out reads would only serve scrapers.
    it('signed-out visitors cannot read posts', () =>
        assertFails(getDoc(doc(anon(), 'posts', POST))));

    it('signed-out visitors cannot list the posts collection', () =>
        assertFails(getDocs(collection(anon(), 'posts'))));
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

    // createdAt is what the feed sorts by, so it has to be the server's time (serverTimestamp()). Any client-chosen date could pin a post to the top or bury it.
    it('createdAt cannot be a client-chosen date in the future', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), createdAt: minutesAgo(-60) })));

    it('createdAt cannot be a client-chosen date in the past', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), createdAt: minutesAgo(60) })));

    // The two strings that got past the old ISO-string check (audit section 9.9): a negative hour count, and missing zero padding that sorts above every real date as text.
    it('createdAt cannot be a string, even one the old check accepted', async () => {
        await assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), createdAt: '9999-12-31T-70000000:00:00.000Z' }));
        await assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), createdAt: '2026-9-9T9:9:9' }));
    });

    it('updatedAt cannot be set at creation', () =>
        assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), updatedAt: now() })));

    // The stored username is the fallback shown when the author lookup fails, so it has to look like a real username (no 900KB strings).
    it('username has to be a valid username', async () => {
        await assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), username: 'x'.repeat(17) }));
        await assertFails(setDoc(doc(as('alice'), 'posts', POST), { ...validPost('alice', POST), username: 42 }));
    });
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
        assertFails(updateDoc(doc(as('alice'), 'posts', POST), { createdAt: minutesAgo(60 * 24 * 365) })));

    it('updatedAt has to be the server\'s time', async () => {
        await assertFails(updateDoc(doc(as('alice'), 'posts', POST), { caption: 'updated', updatedAt: minutesAgo(-60) }));
        await assertFails(updateDoc(doc(as('alice'), 'posts', POST), { caption: 'updated', updatedAt: { any: 'thing' } }));
    });

    it('owner cannot change the stored username (no posing as someone else)', () =>
        assertFails(updateDoc(doc(as('alice'), 'posts', POST), { username: 'bob' })));

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

    // The other direction (the like doc can't move without the counter), which is what stops one user from inflating or deflating the count in a loop.
    it('a like doc cannot be created without the counter moving', () =>
        assertFails(setDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob'), validLike('bob'))));

    it('a like doc cannot be deleted without the counter moving', async () => {
        await seed(db => Promise.all([
            setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')),
            updateDoc(doc(db, 'posts', POST), { likeCount: 1 }),
        ]).then(() => undefined));
        await assertFails(deleteDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob')));
    });

    // The exact loop from audit section 9.9: like in a batch, then delete just the like doc. The second step is now denied, so the count stays honest.
    it('like-then-delete-the-like-doc cannot inflate the count', async () => {
        await assertSucceeds(like('bob', true));
        await assertFails(deleteDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob')));
    });

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

    // Likes and unlikes always go through likeInBatch (the counter moves with them), so the like doc's own checks are what's being tested here.
    // likeData swaps in a broken like doc for bob's own likes/bob, and the target uid can be changed for the "someone else's uid" cases.
    const likeAs = (actor: string, target: string, likeData: Record<string, unknown> = validLike(target)) => {
        const db = as(actor);
        return likeInBatch(db, doc(db, 'posts', POST), doc(db, 'posts', POST, 'likes', target), target, true, likeData);
    };

    it('signed-in users can read (the feed checks did-I-like per post), signed-out visitors cannot', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')));
        await assertSucceeds(getDoc(doc(as('carol'), 'posts', POST, 'likes', 'bob')));
        await assertFails(getDoc(doc(anon(), 'posts', POST, 'likes', 'bob')));
    });

    it('a user can create their own like doc (with the counter)', () =>
        assertSucceeds(likeAs('bob', 'bob')));

    it('cannot create a like doc under another uid', () =>
        assertFails(likeAs('bob', 'carol')));

    it('uid field must match the doc id', () =>
        assertFails(likeAs('bob', 'bob', validLike('carol'))));

    it('no extra fields', () =>
        assertFails(likeAs('bob', 'bob', { ...validLike('bob'), weight: 10 })));

    it('createdAt has to be the server\'s time', () =>
        assertFails(likeAs('bob', 'bob', { ...validLike('bob'), createdAt: minutesAgo(-60) })));

    it('cannot be updated', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')));
        await assertFails(updateDoc(doc(as('bob'), 'posts', POST, 'likes', 'bob'), { createdAt: now() }));
    });

    it('owner can delete their like doc (with the counter), another user cannot', async () => {
        await seed(db => Promise.all([
            setDoc(doc(db, 'posts', POST, 'likes', 'bob'), validLike('bob')),
            updateDoc(doc(db, 'posts', POST), { likeCount: 1 }),
        ]).then(() => undefined));
        const carol = as('carol');
        await assertFails(likeInBatch(carol, doc(carol, 'posts', POST), doc(carol, 'posts', POST, 'likes', 'bob'), 'bob', false));
        const bob = as('bob');
        await assertSucceeds(likeInBatch(bob, doc(bob, 'posts', POST), doc(bob, 'posts', POST, 'likes', 'bob'), 'bob', false));
    });
});
