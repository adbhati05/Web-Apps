// Rules for posts/{postId}/comments/{commentId} and the comment's own likes subcollection.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
import { startEnv, clearAll, stopEnv, as, anon, seed, now, minutesAgo, validComment, validLike, seedPost, likeInBatch, commentInBatch, deleteCommentInBatch } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

// alice owns post p1, bob wrote comment c1 on it, carol is a third party.
const POST = 'p1';
const COMMENT = 'c1';
const commentRef = (uid: string) => doc(as(uid), 'posts', POST, 'comments', COMMENT);

// Every create goes through commentInBatch (the comment plus commentCount +1, like postService.addComment), so the counter isn't what rejects the failing cases below.
const addComment = (uid: string, data: Record<string, unknown>) => commentInBatch(as(uid), POST, COMMENT, data);

const seedComment = () => seed(db => setDoc(doc(db, 'posts', POST, 'comments', COMMENT), validComment('bob', COMMENT)));

beforeEach(() => seedPost(POST, 'alice', { commentCount: 1 }));

describe('comments read', () => {
    beforeEach(seedComment);

    it('signed-in users can read comments', () =>
        assertSucceeds(getDoc(doc(as('carol'), 'posts', POST, 'comments', COMMENT))));

    it('signed-out visitors cannot read them', () =>
        assertFails(getDoc(doc(anon(), 'posts', POST, 'comments', COMMENT))));
});

describe('comments create', () => {
    it('a valid comment as yourself with likeCount 0 (and the counter moving)', () =>
        assertSucceeds(addComment('carol', validComment('carol', COMMENT))));

    it('cannot comment as someone else', () =>
        assertFails(addComment('carol', validComment('bob', COMMENT))));

    it('signed-out visitors cannot comment', () =>
        assertFails(commentInBatch(anon(), POST, COMMENT, validComment('carol', COMMENT))));

    it('likeCount must start at 0', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), likeCount: 1 })));

    it('empty text is rejected', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), comment: '' })));

    it('text is capped at 500 characters', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), comment: 'x'.repeat(501) })));

    it('doc id must match the id field', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), id: 'other' })));

    it('editedAt cannot be set at creation', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), editedAt: now() })));

    // Comments are listed oldest first, so a client-chosen date could pin a comment to the top (1970) or the bottom (the future) forever.
    it('createdAt cannot be a client-chosen date in the future', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), createdAt: minutesAgo(-60) })));

    it('createdAt cannot be a client-chosen date in the past', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), createdAt: minutesAgo(60 * 24 * 365 * 56) })));

    it('username has to be a valid username (no oversized strings)', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), username: 'x'.repeat(1000) })));

    // The other half of the commentCount pairing: a comment can't exist without the counter moving, which also proves the post is real.
    it('a comment cannot be added without the post\'s commentCount moving', () =>
        assertFails(setDoc(commentRef('carol'), validComment('carol', COMMENT))));

    it('the counter has to move by exactly 1', () => {
        const db = as('carol');
        const batch = writeBatch(db);
        batch.set(doc(db, 'posts', POST, 'comments', COMMENT), validComment('carol', COMMENT));
        batch.update(doc(db, 'posts', POST), { commentCount: increment(2) });
        return assertFails(batch.commit());
    });

    it('cannot comment on a post that doesn\'t exist', () =>
        assertFails(commentInBatch(as('carol'), 'nope', COMMENT, validComment('carol', COMMENT))));
});

describe('comments update: like counter', () => {
    beforeEach(seedComment);

    const like = (uid: string, liking: boolean) => {
        const db = as(uid);
        return likeInBatch(db, doc(db, 'posts', POST, 'comments', COMMENT), doc(db, 'posts', POST, 'comments', COMMENT, 'likes', uid), uid, liking);
    };

    it('liking writes the like doc and moves the counter by +1 in one batch', () =>
        assertSucceeds(like('carol', true)));

    it('unliking deletes the like doc and moves the counter by -1', async () => {
        await seed(db => Promise.all([
            setDoc(doc(db, 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), validLike('carol')),
            updateDoc(doc(db, 'posts', POST, 'comments', COMMENT), { likeCount: 1 }),
        ]).then(() => undefined));
        await assertSucceeds(like('carol', false));
    });

    it('the counter cannot move without a like doc in the same batch', () =>
        assertFails(updateDoc(commentRef('carol'), { likeCount: 1 })));

    // Same loop as the post likes test: like in a batch, then delete just the like doc. The second step is denied.
    it('like-then-delete-the-like-doc cannot inflate the count', async () => {
        await assertSucceeds(like('carol', true));
        await assertFails(deleteDoc(doc(as('carol'), 'posts', POST, 'comments', COMMENT, 'likes', 'carol')));
    });
});

describe('comments update: author editing text', () => {
    beforeEach(seedComment);

    it('author can edit the text and stamp editedAt', () =>
        assertSucceeds(updateDoc(commentRef('bob'), { comment: 'edited', editedAt: now() })));

    it('editedAt must be included with the edit, so an edited comment is always marked', () =>
        assertFails(updateDoc(commentRef('bob'), { comment: 'edited' })));

    it('editedAt has to be the server\'s time', async () => {
        await assertFails(updateDoc(commentRef('bob'), { comment: 'edited', editedAt: minutesAgo(-60) }));
        await assertFails(updateDoc(commentRef('bob'), { comment: 'edited', editedAt: 'x'.repeat(1000) }));
    });

    it('an edit cannot touch likeCount', () =>
        assertFails(updateDoc(commentRef('bob'), { comment: 'edited', editedAt: now(), likeCount: 99 })));

    it('an edit cannot reassign uid', () =>
        assertFails(updateDoc(commentRef('bob'), { comment: 'edited', editedAt: now(), uid: 'carol' })));

    it('an edit cannot leave the text empty', () =>
        assertFails(updateDoc(commentRef('bob'), { comment: '', editedAt: now() })));

    it('a third party cannot edit it', () =>
        assertFails(updateDoc(commentRef('carol'), { comment: 'hijacked', editedAt: now() })));

    it('the post owner cannot edit someone else\'s comment (moderation is delete-only)', () =>
        assertFails(updateDoc(commentRef('alice'), { comment: 'hijacked', editedAt: now() })));
});

describe('comments delete', () => {
    beforeEach(seedComment);

    it('author can delete their comment (with the counter)', () =>
        assertSucceeds(deleteCommentInBatch(as('bob'), POST, COMMENT)));

    it('post owner can delete any comment on their post (moderation)', () =>
        assertSucceeds(deleteCommentInBatch(as('alice'), POST, COMMENT)));

    it('a comment cannot be deleted without the counter moving', () =>
        assertFails(deleteDoc(commentRef('bob'))));

    it('a third party cannot delete it', () =>
        assertFails(deleteCommentInBatch(as('carol'), POST, COMMENT)));

    it('signed-out visitors cannot delete it', () =>
        assertFails(deleteCommentInBatch(anon(), POST, COMMENT)));
});

describe('posts/{postId}/comments/{commentId}/likes/{uid}', () => {
    beforeEach(seedComment);

    // Same idea as likeAs in posts.test.ts: the like always goes with its counter, so only the like doc's own checks can reject it.
    const likeAs = (actor: string, target: string, likeData: Record<string, unknown> = validLike(target)) => {
        const db = as(actor);
        return likeInBatch(db, doc(db, 'posts', POST, 'comments', COMMENT), doc(db, 'posts', POST, 'comments', COMMENT, 'likes', target), target, true, likeData);
    };
    const unlikeAs = (actor: string, target: string) => {
        const db = as(actor);
        return likeInBatch(db, doc(db, 'posts', POST, 'comments', COMMENT), doc(db, 'posts', POST, 'comments', COMMENT, 'likes', target), target, false);
    };

    it('signed-in users can read, signed-out visitors cannot', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), validLike('carol')));
        await assertSucceeds(getDoc(doc(as('bob'), 'posts', POST, 'comments', COMMENT, 'likes', 'carol')));
        await assertFails(getDoc(doc(anon(), 'posts', POST, 'comments', COMMENT, 'likes', 'carol')));
    });

    it('a user can create their own like doc (with the counter)', () =>
        assertSucceeds(likeAs('carol', 'carol')));

    it('cannot create a like doc under another uid', () =>
        assertFails(likeAs('carol', 'bob')));

    it('a like doc cannot be created without the counter moving', () =>
        assertFails(setDoc(doc(as('carol'), 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), validLike('carol'))));

    it('createdAt has to be the server\'s time', () =>
        assertFails(likeAs('carol', 'carol', { ...validLike('carol'), createdAt: minutesAgo(-60) })));

    it('cannot be updated', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), validLike('carol')));
        await assertFails(updateDoc(doc(as('carol'), 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), { createdAt: now() }));
    });

    it('owner can delete their like doc (with the counter), others cannot', async () => {
        await seed(db => Promise.all([
            setDoc(doc(db, 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), validLike('carol')),
            updateDoc(doc(db, 'posts', POST, 'comments', COMMENT), { likeCount: 1 }),
        ]).then(() => undefined));
        await assertFails(unlikeAs('bob', 'carol'));
        await assertSucceeds(unlikeAs('carol', 'carol'));
    });
});

// Comments about one specific piece of the post (picked with the piece's Comment option). The piece is a copy of the post's piece, checked against the real post.
describe('comments about a piece', () => {
    const pieces = [{ name: 'Black Denim Jacket', price: '$80', size: 'M', materials: 'Denim', dateAcquired: '' }];
    const piece = { pieceIndex: 0, ...pieces[0], hasDetails: true };

    beforeEach(() => seedPost(POST, 'alice', { commentCount: 1, pieces, hasDetails: true }));

    it('a comment about a piece of the post succeeds', () =>
        assertSucceeds(addComment('carol', { ...validComment('carol', COMMENT), piece })));

    it('the piece name has to match the post\'s piece at that index', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), piece: { ...piece, name: 'Made-up Jacket' } })));

    it('the piece index has to exist on the post', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), piece: { ...piece, pieceIndex: 5 } })));

    it('the details setting has to match the post', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), piece: { ...piece, hasDetails: false } })));

    it('the piece cannot carry extra fields', () =>
        assertFails(addComment('carol', { ...validComment('carol', COMMENT), piece: { ...piece, color: 'black' } })));

    // A non-string detail would crash the piece when it's expanded (PieceItem prints each detail), and an oversized one bloats every load of the comments.
    it('the piece\'s details have to be strings of at most 100 characters', async () => {
        await assertFails(addComment('carol', { ...validComment('carol', COMMENT), piece: { ...piece, price: { boom: true } } }));
        await assertFails(addComment('carol', { ...validComment('carol', COMMENT), piece: { ...piece, materials: 'x'.repeat(101) } }));
    });

    it('editing the comment cannot change its piece', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'comments', COMMENT), { ...validComment('bob', COMMENT), piece }));
        await assertFails(updateDoc(commentRef('bob'), { comment: 'edited', editedAt: now(), piece: { ...piece, name: 'Other' } }));
    });
});
