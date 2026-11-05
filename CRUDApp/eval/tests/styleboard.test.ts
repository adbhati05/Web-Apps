// Rules for the style board: users/{uid}/archive/{pieceId} and users/{uid}/fits/{fitId}.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection } from 'firebase/firestore';
import { startEnv, clearAll, stopEnv, as, seed, now, seedPost } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

// bob owns post p1, which has one detailed piece. alice is the one building her style board.
const pieces = [{ name: 'Black Denim Jacket', price: '$80', size: 'M', materials: 'Denim', dateAcquired: '' }];
beforeEach(() => seedPost('p1', 'bob', { pieces, hasDetails: true }));

// Mirrors archiveService.favoritePiece: a copy of bob's piece, under the ID p1_0.
const favorite = (extra: Record<string, unknown> = {}) => ({
    ...pieces[0], hasDetails: true, source: 'favorite', fromUid: 'bob', fromUsername: 'bob', postId: 'p1', pieceIndex: 0, createdAt: now(), ...extra,
});

// Mirrors archiveService.addOwnPiece.
const ownPiece = (extra: Record<string, unknown> = {}) => ({
    name: 'White Sneakers', hasDetails: false, source: 'own', fromUid: 'alice', fromUsername: 'alice', createdAt: now(), ...extra,
});

// Mirrors fitService.createFit.
const fit = (extra: Record<string, unknown> = {}) => ({
    name: 'Date night',
    sections: { headwear: [], tops: [{ archiveId: 'p1_0', ...pieces[0], hasDetails: true, fromUsername: 'bob' }], bottoms: [], footwear: [], accessories: [] },
    createdAt: now(),
    ...extra,
});

describe('archive: favorites', () => {
    it('you can favorite a piece from a post into your own archive', () =>
        assertSucceeds(setDoc(doc(as('alice'), 'users/alice/archive/p1_0'), favorite())));

    it('cannot favorite into someone else\'s archive', () =>
        assertFails(setDoc(doc(as('carol'), 'users/alice/archive/p1_0'), favorite())));

    it('the doc ID has to be postId_pieceIndex', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/archive/random'), favorite())));

    it('the piece name has to match the post', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/archive/p1_0'), favorite({ name: 'Fake Jacket' }))));

    it('it has to credit the post\'s real owner', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/archive/p1_0'), favorite({ fromUid: 'carol' }))));

    it('the piece index has to exist on the post', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/archive/p1_5'), favorite({ pieceIndex: 5 }))));

    it('cannot favorite the same piece twice (an existing doc can\'t be overwritten)', async () => {
        await seed(db => setDoc(doc(db, 'users/alice/archive/p1_0'), favorite()));
        await assertFails(setDoc(doc(as('alice'), 'users/alice/archive/p1_0'), favorite()));
    });
});

describe('archive: your own pieces', () => {
    it('you can add your own piece', () =>
        assertSucceeds(setDoc(doc(as('alice'), 'users/alice/archive/own1'), ownPiece())));

    it('your own piece has to say it\'s from you', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/archive/own1'), ownPiece({ fromUid: 'bob' }))));

    it('your own piece cannot claim to come from a post', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/archive/own1'), ownPiece({ postId: 'p1' }))));

    it('the name cannot be empty or over 100 characters', async () => {
        await assertFails(setDoc(doc(as('alice'), 'users/alice/archive/own1'), ownPiece({ name: '' })));
        await assertFails(setDoc(doc(as('alice'), 'users/alice/archive/own2'), ownPiece({ name: 'x'.repeat(101) })));
    });

    it('details are capped at 100 characters', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/archive/own1'), ownPiece({ hasDetails: true, price: 'x'.repeat(101) }))));
});

describe('archive: reading, editing, removing', () => {
    beforeEach(() => seed(db => setDoc(doc(db, 'users/alice/archive/own1'), ownPiece())));

    it('the owner can read their archive', () =>
        assertSucceeds(getDocs(collection(as('alice'), 'users/alice/archive'))));

    it('nobody else can read it (the style board is private)', async () => {
        await assertFails(getDocs(collection(as('bob'), 'users/alice/archive')));
        await assertFails(getDoc(doc(as('bob'), 'users/alice/archive/own1')));
    });

    it('archived pieces cannot be edited', () =>
        assertFails(updateDoc(doc(as('alice'), 'users/alice/archive/own1'), { name: 'Black Sneakers' })));

    it('the owner can remove a piece, others cannot', async () => {
        await assertFails(deleteDoc(doc(as('bob'), 'users/alice/archive/own1')));
        await assertSucceeds(deleteDoc(doc(as('alice'), 'users/alice/archive/own1')));
    });
});

describe('fits', () => {
    it('you can plan a fit on your own board', () =>
        assertSucceeds(setDoc(doc(as('alice'), 'users/alice/fits/f1'), fit())));

    it('the name is optional', () => {
        // Same fit with the name left out entirely (fitService.createFit skips the field when there's no name).
        const unnamed: Record<string, unknown> = fit();
        delete unnamed.name;
        return assertSucceeds(setDoc(doc(as('alice'), 'users/alice/fits/f1'), unnamed));
    });

    it('the name is capped at 40 characters', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/fits/f1'), fit({ name: 'x'.repeat(41) }))));

    it('sections can only be the five parts of an outfit', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/fits/f1'), fit({ sections: { ...fit().sections, outerwear: [] } }))));

    it('a section holds at most 10 pieces', () =>
        assertFails(setDoc(doc(as('alice'), 'users/alice/fits/f1'), fit({ sections: { ...fit().sections, accessories: Array(11).fill(fit().sections.tops[0]) } }))));

    it('cannot plan a fit on someone else\'s board, or read theirs', async () => {
        await assertFails(setDoc(doc(as('bob'), 'users/alice/fits/f1'), fit()));
        await seed(db => setDoc(doc(db, 'users/alice/fits/f1'), fit()));
        await assertFails(getDocs(collection(as('bob'), 'users/alice/fits')));
    });

    it('the owner can edit a fit, but createdAt stays frozen and updatedAt is required', async () => {
        const original = fit();
        await seed(db => setDoc(doc(db, 'users/alice/fits/f1'), original));
        await assertSucceeds(setDoc(doc(as('alice'), 'users/alice/fits/f1'), { ...original, name: 'Brunch', updatedAt: now() }));
        await assertFails(setDoc(doc(as('alice'), 'users/alice/fits/f1'), { ...original, name: 'Brunch' }));
        await assertFails(setDoc(doc(as('alice'), 'users/alice/fits/f1'), { ...original, createdAt: '2000-01-01T00:00:00.000Z', updatedAt: now() }));
    });

    it('the owner can delete a fit, others cannot', async () => {
        await seed(db => setDoc(doc(db, 'users/alice/fits/f1'), fit()));
        await assertFails(deleteDoc(doc(as('bob'), 'users/alice/fits/f1')));
        await assertSucceeds(deleteDoc(doc(as('alice'), 'users/alice/fits/f1')));
    });
});
