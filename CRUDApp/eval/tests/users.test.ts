// Rules for users/{uid} and usernames/{username}.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
import { startEnv, clearAll, stopEnv, as, anon, seed, now } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

describe('users/{uid}', () => {
    // A user doc exactly as authService.signUp writes it now (no email, counters at 0).
    const validUser = (username: string, extra: Record<string, unknown> = {}) => ({ displayName: username, username, createdAt: now(), followerCount: 0, followingCount: 0, ...extra });
    const claim = (uid: string, username: string) => ({ uid, username, createdAt: now() });

    // Mirrors signUp: the username claim and the user doc go in one batch, which is what lets the create rule check the claim with getAfter().
    const signUpBatch = (uid: string, username: string, userData: Record<string, unknown> = validUser(username)) => {
        const db = as(uid);
        const batch = writeBatch(db);
        batch.set(doc(db, 'usernames', username), claim(uid, username));
        batch.set(doc(db, 'users', uid), userData);
        return batch.commit();
    };

    describe('read', () => {
        beforeEach(() => seed(db => setDoc(doc(db, 'users/alice'), validUser('alice'))));

        it('owner can read their own doc', () =>
            assertSucceeds(getDoc(doc(as('alice'), 'users/alice'))));

        it('another signed-in user can read it (profiles are public to signed-in users)', () =>
            assertSucceeds(getDoc(doc(as('bob'), 'users/alice'))));

        it('signed-out visitors cannot read it', () =>
            assertFails(getDoc(doc(anon(), 'users/alice'))));
    });

    describe('create', () => {
        it('the sign-up batch (username claim + user doc) succeeds', () =>
            assertSucceeds(signUpBatch('alice', 'alice')));

        it('cannot create a doc for another uid', () => {
            const db = as('bob');
            const batch = writeBatch(db);
            batch.set(doc(db, 'usernames', 'alice'), claim('bob', 'alice'));
            batch.set(doc(db, 'users', 'alice'), validUser('alice'));
            return assertFails(batch.commit());
        });

        it('cannot create a doc under a username you never claimed', () =>
            assertFails(setDoc(doc(as('alice'), 'users/alice'), validUser('alice'))));

        it('cannot create a doc under a username someone else claimed', async () => {
            await seed(db => setDoc(doc(db, 'usernames/bob'), claim('bob', 'bob')));
            await assertFails(setDoc(doc(as('alice'), 'users/alice'), validUser('bob')));
        });

        it('email is no longer allowed on the doc', () =>
            assertFails(signUpBatch('alice', 'alice', validUser('alice', { email: 'alice@example.com' }))));

        it('counters must start at 0', () =>
            assertFails(signUpBatch('alice', 'alice', validUser('alice', { followerCount: 1000 }))));

        it('displayName is capped at 30 characters', () =>
            assertFails(signUpBatch('alice', 'alice', validUser('alice', { displayName: 'x'.repeat(31) }))));
    });

    describe('update case #1: owner editing their profile', () => {
        beforeEach(() => seed(db => setDoc(doc(db, 'users/alice'), validUser('alice'))));

        it('owner can edit displayName, bio, and profilePicURL', () =>
            assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { displayName: 'Ally', bio: 'fits only', profilePicURL: 'https://example.com/me.jpg' })));

        it('another user cannot edit it', () =>
            assertFails(updateDoc(doc(as('bob'), 'users/alice'), { bio: 'hijacked' })));

        it('bio is capped at 150 characters', () =>
            assertFails(updateDoc(doc(as('alice'), 'users/alice'), { bio: 'x'.repeat(151) })));

        it('displayName cannot be emptied', () =>
            assertFails(updateDoc(doc(as('alice'), 'users/alice'), { displayName: '' })));

        it('username is frozen (it has its own claim doc)', () =>
            assertFails(updateDoc(doc(as('alice'), 'users/alice'), { username: 'alicia' })));

        it('owner cannot set their own follower count', () =>
            assertFails(updateDoc(doc(as('alice'), 'users/alice'), { followerCount: 1000 })));

        it('owner cannot sneak a counter change into a profile edit', () =>
            assertFails(updateDoc(doc(as('alice'), 'users/alice'), { bio: 'hi', followerCount: 1 })));

        it('owner cannot add email back onto the doc', () =>
            assertFails(updateDoc(doc(as('alice'), 'users/alice'), { email: 'alice@example.com' })));
    });

    // Positive tests for case #2 (the full follow/unfollow batch) live in follows.test.ts.
    describe('update case #2: follower counter', () => {
        beforeEach(() => seed(db => setDoc(doc(db, 'users/alice'), validUser('alice'))));

        it('cannot move without a follower doc in the same batch', () =>
            assertFails(updateDoc(doc(as('bob'), 'users/alice'), { followerCount: increment(1) })));

        it('cannot move by more than 1', () =>
            assertFails(updateDoc(doc(as('bob'), 'users/alice'), { followerCount: increment(2) })));

        it('cannot drop while the caller\'s follower doc still exists', async () => {
            await seed(async db => {
                await setDoc(doc(db, 'users/alice/followers/bob'), { uid: 'bob', createdAt: now() });
                await updateDoc(doc(db, 'users/alice'), { followerCount: 1 });
            });
            await assertFails(updateDoc(doc(as('bob'), 'users/alice'), { followerCount: increment(-1) }));
        });
    });

    describe('update case #3: following counter', () => {
        beforeEach(() => seed(db => setDoc(doc(db, 'users/alice'), validUser('alice'))));

        // Pins the known gap from the rules comment: this counter isn't bound to a follow doc yet.
        it('owner can move it by 1 (not bound to a follow doc, see rules comment)', () =>
            assertSucceeds(updateDoc(doc(as('alice'), 'users/alice'), { followingCount: increment(1) })));

        it('cannot go below 0', () =>
            assertFails(updateDoc(doc(as('alice'), 'users/alice'), { followingCount: increment(-1) })));

        it('cannot jump by more than 1', () =>
            assertFails(updateDoc(doc(as('alice'), 'users/alice'), { followingCount: increment(5) })));

        it('another user cannot move it', () =>
            assertFails(updateDoc(doc(as('bob'), 'users/alice'), { followingCount: increment(1) })));
    });

    describe('update case #4: owner changing their username', () => {
        beforeEach(() => seed(async db => {
            await setDoc(doc(db, 'users/alice'), validUser('alice'));
            await setDoc(doc(db, 'usernames/alice'), claim('alice', 'alice'));
        }));

        // Mirrors authService.changeUsername: claim the new name, give up the old one, point the user doc at the new one. Anything in `skip` is left out of the batch.
        const renameBatch = (newName: string, skip: ('claim' | 'release' | 'user')[] = []) => {
            const db = as('alice');
            const batch = writeBatch(db);
            if (!skip.includes('claim')) batch.set(doc(db, 'usernames', newName), claim('alice', newName));
            if (!skip.includes('release')) batch.delete(doc(db, 'usernames', 'alice'));
            if (!skip.includes('user')) batch.update(doc(db, 'users', 'alice'), { username: newName });
            return batch.commit();
        };

        it('the full rename batch succeeds', () =>
            assertSucceeds(renameBatch('alicia')));

        it('cannot switch to a name without claiming it', () =>
            assertFails(renameBatch('alicia', ['claim'])));

        it('cannot keep the old claim while switching (no holding two names)', () =>
            assertFails(renameBatch('alicia', ['release'])));

        it('cannot switch to a name someone else already claimed', async () => {
            await seed(db => setDoc(doc(db, 'usernames/bob'), claim('bob', 'bob')));
            const db = as('alice');
            const batch = writeBatch(db);
            batch.delete(doc(db, 'usernames', 'alice'));
            batch.update(doc(db, 'users', 'alice'), { username: 'bob' });
            await assertFails(batch.commit());
        });

        it('cannot sneak another field into the rename', () => {
            const db = as('alice');
            const batch = writeBatch(db);
            batch.set(doc(db, 'usernames', 'alicia'), claim('alice', 'alicia'));
            batch.delete(doc(db, 'usernames', 'alice'));
            batch.update(doc(db, 'users', 'alice'), { username: 'alicia', followerCount: 1000 });
            return assertFails(batch.commit());
        });

        it('another user cannot rename you', async () => {
            const db = as('bob');
            await assertFails(updateDoc(doc(db, 'users', 'alice'), { username: 'bob' }));
        });
    });

    describe('delete', () => {
        beforeEach(() => seed(db => setDoc(doc(db, 'users/alice'), validUser('alice'))));

        it('owner can delete their doc', () =>
            assertSucceeds(deleteDoc(doc(as('alice'), 'users/alice'))));

        // Mirrors authService.deleteUser, which deleteAccount calls before removing the Auth account.
        it('the account deletion batch (user doc + username claim) succeeds', async () => {
            await seed(db => setDoc(doc(db, 'usernames/alice'), claim('alice', 'alice')));
            const db = as('alice');
            const batch = writeBatch(db);
            batch.delete(doc(db, 'users', 'alice'));
            batch.delete(doc(db, 'usernames', 'alice'));
            await assertSucceeds(batch.commit());
        });

        it('another user cannot delete it', () =>
            assertFails(deleteDoc(doc(as('bob'), 'users/alice'))));
    });
});

describe('usernames/{username}', () => {
    const claim = (uid: string, username: string, extra: Record<string, unknown> = {}) => ({ uid, username, createdAt: now(), ...extra });

    it('anyone, even signed out, can read (the sign-up form checks availability before login)', async () => {
        await seed(db => setDoc(doc(db, 'usernames/alice'), claim('alice', 'alice')));
        await assertSucceeds(getDoc(doc(anon(), 'usernames/alice')));
    });

    it('a user can claim a username for themselves', () =>
        assertSucceeds(setDoc(doc(as('alice'), 'usernames/alice'), claim('alice', 'alice'))));

    it('cannot claim a username on behalf of another uid', () =>
        assertFails(setDoc(doc(as('bob'), 'usernames/alice'), claim('alice', 'alice'))));

    it('doc id must match the username field', () =>
        assertFails(setDoc(doc(as('alice'), 'usernames/alice'), claim('alice', 'alicia'))));

    it('doc id must be lowercase', () =>
        assertFails(setDoc(doc(as('alice'), 'usernames/Alice'), claim('alice', 'Alice'))));

    it('no extra fields', () =>
        assertFails(setDoc(doc(as('alice'), 'usernames/alice'), claim('alice', 'alice', { admin: true }))));

    // Overwriting an existing doc counts as an update, and updates are hardcoded false, so the second person to claim a name loses even if they never read it first.
    it('an existing claim cannot be overwritten, so a race for the same name has exactly one winner', async () => {
        await seed(db => setDoc(doc(db, 'usernames/alice'), claim('alice', 'alice')));
        await assertFails(setDoc(doc(as('bob'), 'usernames/alice'), claim('bob', 'alice')));
    });

    it('cannot be updated, even by its owner', async () => {
        await seed(db => setDoc(doc(db, 'usernames/alice'), claim('alice', 'alice')));
        await assertFails(updateDoc(doc(as('alice'), 'usernames/alice'), { createdAt: now() }));
    });

    it('owner can delete their claim (how a rename works: delete the old doc, create the new one)', async () => {
        await seed(db => setDoc(doc(db, 'usernames/alice'), claim('alice', 'alice')));
        await assertSucceeds(deleteDoc(doc(as('alice'), 'usernames/alice')));
    });

    it('another user cannot delete it', async () => {
        await seed(db => setDoc(doc(db, 'usernames/alice'), claim('alice', 'alice')));
        await assertFails(deleteDoc(doc(as('bob'), 'usernames/alice')));
    });

    // Otherwise the profile would keep showing a username that someone else is free to claim.
    it('owner cannot delete their claim while their profile still uses it', async () => {
        await seed(async db => {
            await setDoc(doc(db, 'usernames/alice'), claim('alice', 'alice'));
            await setDoc(doc(db, 'users/alice'), { displayName: 'alice', username: 'alice', createdAt: now(), followerCount: 0, followingCount: 0 });
        });
        await assertFails(deleteDoc(doc(as('alice'), 'usernames/alice')));
    });
});
