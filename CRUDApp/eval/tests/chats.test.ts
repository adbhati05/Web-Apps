// Rules for chats/{chatId} and chats/{chatId}/messages/{messageId}.
import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, writeBatch, type Firestore } from 'firebase/firestore';
import { startEnv, clearAll, stopEnv, as, seed, now } from './helpers';

beforeAll(startEnv);
beforeEach(clearAll);
afterAll(stopEnv);

const validUser = (username: string) => ({ displayName: username, username, createdAt: now(), followerCount: 0, followingCount: 0 });

// A message doc's fields, and the preview the chat doc carries for it (the same fields plus which message it's a copy of).
type Msg = { senderId: string, text: string, createdAt: string, replyTo?: { messageId: string, senderId: string } };
const message = (senderId: string, text = 'nice fit', extra: Partial<Msg> = {}): Msg => ({ senderId, text, createdAt: now(), ...extra });
const previewOf = (messageId: string, msg: Msg) => ({ messageId, senderId: msg.senderId, text: msg.text, createdAt: msg.createdAt });

// An ISO timestamp `minutes` ago, for testing the 15 minute edit window (and future timestamps with a negative number).
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

// Mirrors chatService.sendMessage for a brand-new chat: the chat doc (with this message as its preview) and the message doc in one batch.
// Anything in `chat` overrides the chat doc's fields, so a test can break one at a time.
function firstMessageBatch(db: Firestore, chatId: string, sender: string, participants: string[], chat: Record<string, unknown> = {}, msg = message(sender)) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'chats', chatId), {
        participantIds: participants,
        createdAt: msg.createdAt,
        updatedAt: msg.createdAt,
        lastMessage: previewOf('m1', msg),
        lastRead: { [sender]: msg.createdAt },
        ...chat,
    });
    batch.set(doc(db, 'chats', chatId, 'messages', 'm1'), msg);
    return batch.commit();
}

// Mirrors chatService.sendMessage for an existing chat: the preview update and the message doc in one batch.
function nextMessageBatch(db: Firestore, chatId: string, messageId: string, msg: Msg, preview: Record<string, unknown> = { lastMessage: previewOf(messageId, msg), updatedAt: msg.createdAt }) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'chats', chatId), preview);
    batch.set(doc(db, 'chats', chatId, 'messages', messageId), msg);
    return batch.commit();
}

// Seeds an existing alice_bob chat: m1 from bob (older), then m2 from alice (the latest, so it's the one in the preview). createdAt for alice's message can be pushed back to test the edit window.
const seedChat = (aliceSentMinutesAgo = 1) => seed(async db => {
    const m1 = message('bob', 'hey', { createdAt: minutesAgo(30) });
    const m2 = message('alice', 'hi!', { createdAt: minutesAgo(aliceSentMinutesAgo) });
    await setDoc(doc(db, 'chats/alice_bob'), { participantIds: ['alice', 'bob'], createdAt: m1.createdAt, updatedAt: m2.createdAt, lastMessage: previewOf('m2', m2), lastRead: { alice: m2.createdAt } });
    await setDoc(doc(db, 'chats/alice_bob/messages/m1'), m1);
    await setDoc(doc(db, 'chats/alice_bob/messages/m2'), m2);
});

beforeEach(() => seed(async db => {
    await setDoc(doc(db, 'users/alice'), validUser('alice'));
    await setDoc(doc(db, 'users/bob'), validUser('bob'));
    await setDoc(doc(db, 'users/carol'), validUser('carol'));
}));

describe('starting a chat (first message)', () => {
    it('the first message batch (chat doc + message) succeeds', () =>
        assertSucceeds(firstMessageBatch(as('alice'), 'alice_bob', 'alice', ['alice', 'bob'])));

    it('cannot start a chat between two other people', () =>
        assertFails(firstMessageBatch(as('carol'), 'alice_bob', 'carol', ['alice', 'bob'], {}, message('carol'))));

    it('the chat id has to match the participants', () =>
        assertFails(firstMessageBatch(as('alice'), 'alice_bob', 'alice', ['alice', 'carol'])));

    it('participants have to be sorted', () =>
        assertFails(firstMessageBatch(as('alice'), 'bob_alice', 'alice', ['bob', 'alice'])));

    it('cannot start a chat with yourself', () =>
        assertFails(firstMessageBatch(as('alice'), 'alice_alice', 'alice', ['alice', 'alice'])));

    it('cannot start a chat with a user that doesn\'t exist', () =>
        assertFails(firstMessageBatch(as('alice'), 'alice_zed', 'alice', ['alice', 'zed'])));

    it('lastRead cannot hold anyone but the participants', () =>
        assertFails(firstMessageBatch(as('alice'), 'alice_bob', 'alice', ['alice', 'bob'], { lastRead: { carol: now() } })));

    it('the chat doc cannot carry extra fields', () =>
        assertFails(firstMessageBatch(as('alice'), 'alice_bob', 'alice', ['alice', 'bob'], { pinned: true })));

    it('a message cannot be sent into a chat that doesn\'t exist', () =>
        assertFails(setDoc(doc(as('alice'), 'chats/alice_bob/messages/m1'), message('alice'))));
});

describe('sending messages', () => {
    beforeEach(() => seedChat());

    it('a participant can send a message (preview + message batch)', () =>
        assertSucceeds(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('bob'))));

    it('a non-participant cannot send a message', () =>
        assertFails(nextMessageBatch(as('carol'), 'alice_bob', 'm3', message('carol'))));

    it('cannot send a message as someone else', () =>
        assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('alice'))));

    it('a message cannot be sent without its preview moving with it', () =>
        assertFails(setDoc(doc(as('bob'), 'chats/alice_bob/messages/m3'), message('bob'))));

    it('the preview has to copy the message\'s text', () => {
        const msg = message('bob');
        return assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', msg, { lastMessage: { ...previewOf('m3', msg), text: 'something else' }, updatedAt: msg.createdAt }));
    });

    it('the preview has to point at the message being sent', () => {
        const msg = message('bob');
        return assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', msg, { lastMessage: previewOf('m1', msg), updatedAt: msg.createdAt }));
    });

    it('updatedAt has to match the preview\'s timestamp', () => {
        const msg = message('bob');
        return assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', msg, { lastMessage: previewOf('m3', msg), updatedAt: '2000-01-01T00:00:00.000Z' }));
    });

    it('empty messages are rejected', () =>
        assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('bob', ''))));

    it('messages are capped at 1000 characters', () =>
        assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('bob', 'x'.repeat(1001)))));

    it('createdAt cannot be far in the future (it would stretch the edit window)', () =>
        assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('bob', 'from the future', { createdAt: minutesAgo(-60) }))));

    it('createdAt has to be an ISO timestamp', () =>
        assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('bob', 'hi', { createdAt: 'yesterday' }))));

    // Pins the known gap from the rules comment: the preview can move without a message doc (the message id is client-generated, so there's no fixed path to check).
    it('a participant can move the preview alone (not bound to a message doc, see rules comment)', () => {
        const msg = message('bob');
        return assertSucceeds(updateDoc(doc(as('bob'), 'chats/alice_bob'), { lastMessage: previewOf('m3', msg), updatedAt: msg.createdAt }));
    });
});

describe('replies', () => {
    beforeEach(() => seedChat());

    it('can reply to a message in the same chat', () =>
        assertSucceeds(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('bob', 'agreed', { replyTo: { messageId: 'm2', senderId: 'alice' } }))));

    it('cannot reply to a message that doesn\'t exist', () =>
        assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('bob', 'agreed', { replyTo: { messageId: 'nope', senderId: 'alice' } }))));

    it('the reply has to name the original\'s real sender', () =>
        assertFails(nextMessageBatch(as('bob'), 'alice_bob', 'm3', message('bob', 'agreed', { replyTo: { messageId: 'm2', senderId: 'bob' } }))));
});

describe('editing messages', () => {
    // Mirrors chatService.editMessage. m2 is the latest message, so the preview moves with it.
    const editLatest = (db: Firestore, text: string, previewText = text) => {
        const editedAt = now();
        const batch = writeBatch(db);
        batch.update(doc(db, 'chats/alice_bob/messages/m2'), { text, editedAt });
        batch.update(doc(db, 'chats/alice_bob'), { 'lastMessage.text': previewText, 'lastMessage.editedAt': editedAt });
        return batch.commit();
    };

    it('the sender can edit their latest message within 15 minutes (message + preview batch)', async () => {
        await seedChat(5);
        await assertSucceeds(editLatest(as('alice'), 'hi! (edited)'));
    });

    it('cannot edit after 15 minutes', async () => {
        await seedChat(20);
        await assertFails(editLatest(as('alice'), 'too late'));
    });

    it('cannot edit the latest message without updating the preview', async () => {
        await seedChat(5);
        await assertFails(updateDoc(doc(as('alice'), 'chats/alice_bob/messages/m2'), { text: 'sneaky', editedAt: now() }));
    });

    it('the preview has to get the same new text', async () => {
        await seedChat(5);
        await assertFails(editLatest(as('alice'), 'real text', 'different preview'));
    });

    it('cannot edit someone else\'s message', async () => {
        await seedChat(5);
        await assertFails(updateDoc(doc(as('alice'), 'chats/alice_bob/messages/m1'), { text: 'changed', editedAt: now() }));
    });

    it('an edit can only change the text (not who sent it or when)', async () => {
        await seedChat(5);
        const db = as('alice');
        const editedAt = now();
        const batch = writeBatch(db);
        batch.update(doc(db, 'chats/alice_bob/messages/m2'), { text: 'hi', editedAt, createdAt: now() });
        batch.update(doc(db, 'chats/alice_bob'), { 'lastMessage.text': 'hi', 'lastMessage.editedAt': editedAt });
        await assertFails(batch.commit());
    });

    // An older message isn't in the preview, so editing it is just the one write. Seeded fresh so it's inside the window.
    it('editing an older message doesn\'t need the preview', async () => {
        await seedChat();
        await seed(db => setDoc(doc(db, 'chats/alice_bob/messages/m0'), message('alice', 'older', { createdAt: minutesAgo(3) })));
        await assertSucceeds(updateDoc(doc(as('alice'), 'chats/alice_bob/messages/m0'), { text: 'older (edited)', editedAt: now() }));
    });
});

describe('unsending messages', () => {
    beforeEach(() => seedChat(60));

    // Mirrors chatService.unsendMessage. m2 is the latest message, so the preview is emptied and marked unsent with it.
    const unsendLatest = (db: Firestore, preview: Record<string, unknown> = { 'lastMessage.text': '', 'lastMessage.unsent': true }) => {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'chats/alice_bob/messages/m2'));
        batch.update(doc(db, 'chats/alice_bob'), preview);
        return batch.commit();
    };

    it('the sender can unsend their latest message at any time (message + preview batch)', () =>
        assertSucceeds(unsendLatest(as('alice'))));

    it('cannot unsend the latest message without clearing the preview', () =>
        assertFails(deleteDoc(doc(as('alice'), 'chats/alice_bob/messages/m2'))));

    it('the preview\'s text has to be emptied', () =>
        assertFails(unsendLatest(as('alice'), { 'lastMessage.unsent': true })));

    it('cannot unsend someone else\'s message', () =>
        assertFails(deleteDoc(doc(as('alice'), 'chats/alice_bob/messages/m1'))));

    it('the preview cannot be marked unsent while the message still exists', () =>
        assertFails(updateDoc(doc(as('alice'), 'chats/alice_bob'), { 'lastMessage.text': '', 'lastMessage.unsent': true })));

    it('the other participant cannot touch your preview', () =>
        assertFails(updateDoc(doc(as('bob'), 'chats/alice_bob'), { 'lastMessage.text': '', 'lastMessage.unsent': true })));

    it('unsending an older message doesn\'t need the preview', async () => {
        await seed(db => setDoc(doc(db, 'chats/alice_bob/messages/m0'), message('alice', 'older', { createdAt: minutesAgo(90) })));
        await assertSucceeds(deleteDoc(doc(as('alice'), 'chats/alice_bob/messages/m0')));
    });
});

describe('reading', () => {
    beforeEach(() => seedChat());

    it('participants can read the chat and its messages', async () => {
        await assertSucceeds(getDoc(doc(as('bob'), 'chats/alice_bob')));
        await assertSucceeds(getDocs(collection(as('bob'), 'chats', 'alice_bob', 'messages')));
    });

    it('non-participants cannot read the chat or its messages', async () => {
        await assertFails(getDoc(doc(as('carol'), 'chats/alice_bob')));
        await assertFails(getDocs(collection(as('carol'), 'chats', 'alice_bob', 'messages')));
    });

    // chatService.sendMessage checks whether the chat exists before the first message, so a participant has to be able to read one that isn't there yet.
    it('a participant can check for a chat that doesn\'t exist yet', () =>
        assertSucceeds(getDoc(doc(as('alice'), 'chats/alice_carol'))));

    it('the chat list query (participantIds array-contains me) succeeds', () =>
        assertSucceeds(getDocs(query(collection(as('bob'), 'chats'), where('participantIds', 'array-contains', 'bob')))));

    it('listing every chat without that filter is denied', () =>
        assertFails(getDocs(collection(as('bob'), 'chats'))));
});

describe('read state and deleting', () => {
    beforeEach(() => seedChat());

    it('a participant can mark the chat read for themselves', () =>
        assertSucceeds(updateDoc(doc(as('bob'), 'chats/alice_bob'), { 'lastRead.bob': now() })));

    it('cannot mark it read on the other participant\'s behalf', () =>
        assertFails(updateDoc(doc(as('bob'), 'chats/alice_bob'), { 'lastRead.alice': now() })));

    it('a non-participant cannot add themselves to lastRead', () =>
        assertFails(updateDoc(doc(as('carol'), 'chats/alice_bob'), { 'lastRead.carol': now() })));

    it('chats cannot be deleted yet', () =>
        assertFails(deleteDoc(doc(as('alice'), 'chats/alice_bob'))));
});
