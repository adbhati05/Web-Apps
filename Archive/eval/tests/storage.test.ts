// Rules for Storage (rules/storage.rules): profile pictures in profile/{uid}/ and post photos in posts/{uid}/.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, listAll, deleteObject } from 'firebase/storage';
import { startEnv, clearAll, stopEnv, storageAs, storageAnon, seedStorage } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

// A few bytes stand in for the picture: the rules only look at the declared content type and the size, never the contents.
const bytes = (size = 16) => new Uint8Array(size);
const jpeg = { contentType: 'image/jpeg' };

// Uploads as uid to path, the way storageService.uploadImage does (a compressed JPEG).
const upload = (uid: string, path: string, data = bytes(), metadata = jpeg) =>
    uploadBytes(ref(storageAs(uid), path), data, metadata);

describe('uploads', () => {
    it('the owner can upload a JPEG to their own profile and posts folders', async () => {
        await assertSucceeds(upload('alice', 'profile/alice/1.jpg'));
        await assertSucceeds(upload('alice', 'posts/alice/1.jpg'));
    });

    it('cannot upload into someone else\'s folder', () =>
        assertFails(upload('bob', 'posts/alice/1.jpg')));

    it('signed-out visitors cannot upload', () =>
        assertFails(uploadBytes(ref(storageAnon(), 'posts/alice/1.jpg'), bytes(), jpeg)));

    // Every upload is converted to JPEG first, so anything else didn't come from the app. SVG in particular can carry scripts.
    it('only JPEGs are accepted (not PNG or SVG)', async () => {
        await assertFails(upload('alice', 'posts/alice/1.png', bytes(), { contentType: 'image/png' }));
        await assertFails(upload('alice', 'posts/alice/1.svg', bytes(), { contentType: 'image/svg+xml' }));
    });

    it('profile pictures are capped at 2MB, post photos at 5MB', async () => {
        await assertFails(upload('alice', 'profile/alice/big.jpg', bytes(2 * 1024 * 1024)));
        await assertFails(upload('alice', 'posts/alice/big.jpg', bytes(5 * 1024 * 1024)));
    });

    // The boundary cases, so a cap that's too strict would show up here too.
    it('files just under the caps are accepted', async () => {
        await assertSucceeds(upload('alice', 'profile/alice/ok.jpg', bytes(2 * 1024 * 1024 - 1)));
        await assertSucceeds(upload('alice', 'posts/alice/ok.jpg', bytes(5 * 1024 * 1024 - 1)));
    });
});

describe('reading and deleting', () => {
    beforeEach(() => seedStorage(storage => uploadBytes(ref(storage, 'posts/alice/1.jpg'), bytes(), jpeg)));

    it('anyone, even signed out, can read a file (every <img> tag loads it)', () =>
        assertSucceeds(getBytes(ref(storageAnon(), 'posts/alice/1.jpg'))));

    it('nobody can list a folder, so a user\'s uploads can\'t be enumerated', async () => {
        await assertFails(listAll(ref(storageAnon(), 'posts/alice')));
        await assertFails(listAll(ref(storageAs('alice'), 'posts/alice')));
    });

    it('the owner can delete their file, others cannot', async () => {
        await assertFails(deleteObject(ref(storageAs('bob'), 'posts/alice/1.jpg')));
        await assertSucceeds(deleteObject(ref(storageAs('alice'), 'posts/alice/1.jpg')));
    });
});
