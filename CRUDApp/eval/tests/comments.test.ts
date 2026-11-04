// Rules for posts/{postId}/comments/{commentId} and the comment's own likes subcollection.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { startEnv, clearAll, stopEnv, as, anon, seed, now, validComment, validLike, seedPost, likeInBatch } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

// alice owns post p1, bob wrote comment c1 on it, carol is a third party.
const POST = 'p1';
const COMMENT = 'c1';
const commentRef = (uid: string) => doc(as(uid), 'posts', POST, 'comments', COMMENT);

const seedComment = () => seed(db => setDoc(doc(db, 'posts', POST, 'comments', COMMENT), validComment('bob', COMMENT)));

beforeEach(() => seedPost(POST, 'alice', { commentCount: 1 }));

describe('comments read', () => {
    it('comments are public, so signed-out visitors can read them', async () => {
        await seedComment();
        await assertSucceeds(getDoc(doc(anon(), 'posts', POST, 'comments', COMMENT)));
    });
});

describe('comments create', () => {
    it('a valid comment as yourself with likeCount 0', () =>
        assertSucceeds(setDoc(commentRef('carol'), validComment('carol', COMMENT))));

    it('cannot comment as someone else', () =>
        assertFails(setDoc(commentRef('carol'), validComment('bob', COMMENT))));

    it('signed-out visitors cannot comment', () =>
        assertFails(setDoc(doc(anon(), 'posts', POST, 'comments', COMMENT), validComment('carol', COMMENT))));

    it('likeCount must start at 0', () =>
        assertFails(setDoc(commentRef('carol'), { ...validComment('carol', COMMENT), likeCount: 1 })));

    it('empty text is rejected', () =>
        assertFails(setDoc(commentRef('carol'), { ...validComment('carol', COMMENT), comment: '' })));

    it('text is capped at 500 characters', () =>
        assertFails(setDoc(commentRef('carol'), { ...validComment('carol', COMMENT), comment: 'x'.repeat(501) })));

    it('doc id must match the id field', () =>
        assertFails(setDoc(commentRef('carol'), { ...validComment('carol', COMMENT), id: 'other' })));

    it('editedAt cannot be set at creation', () =>
        assertFails(setDoc(commentRef('carol'), { ...validComment('carol', COMMENT), editedAt: now() })));
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
});

describe('comments update: author editing text', () => {
    beforeEach(seedComment);

    it('author can edit the text and stamp editedAt', () =>
        assertSucceeds(updateDoc(commentRef('bob'), { comment: 'edited', editedAt: now() })));

    it('editedAt must be included with the edit, so an edited comment is always marked', () =>
        assertFails(updateDoc(commentRef('bob'), { comment: 'edited' })));

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

    it('author can delete their comment', () =>
        assertSucceeds(deleteDoc(commentRef('bob'))));

    it('post owner can delete any comment on their post (moderation)', () =>
        assertSucceeds(deleteDoc(commentRef('alice'))));

    it('a third party cannot delete it', () =>
        assertFails(deleteDoc(commentRef('carol'))));

    it('signed-out visitors cannot delete it', () =>
        assertFails(deleteDoc(doc(anon(), 'posts', POST, 'comments', COMMENT))));
});

describe('posts/{postId}/comments/{commentId}/likes/{uid}', () => {
    beforeEach(seedComment);
    const likeRef = (actor: string, target: string) => doc(as(actor), 'posts', POST, 'comments', COMMENT, 'likes', target);

    it('anyone can read', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), validLike('carol')));
        await assertSucceeds(getDoc(doc(anon(), 'posts', POST, 'comments', COMMENT, 'likes', 'carol')));
    });

    it('a user can create their own like doc', () =>
        assertSucceeds(setDoc(likeRef('carol', 'carol'), validLike('carol'))));

    it('cannot create a like doc under another uid', () =>
        assertFails(setDoc(likeRef('carol', 'bob'), validLike('bob'))));

    it('cannot be updated', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), validLike('carol')));
        await assertFails(updateDoc(likeRef('carol', 'carol'), { createdAt: now() }));
    });

    it('owner can delete their like doc, others cannot', async () => {
        await seed(db => setDoc(doc(db, 'posts', POST, 'comments', COMMENT, 'likes', 'carol'), validLike('carol')));
        await assertFails(deleteDoc(likeRef('bob', 'carol')));
        await assertSucceeds(deleteDoc(likeRef('carol', 'carol')));
    });
});
