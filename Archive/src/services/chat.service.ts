// This will include all Firebase functionality necessary for one-to-one chats: the chat list, the messages in a chat, sending, and read state.
// Unlike posts and profiles there's no cache here. Chats use onSnapshot listeners, which push every change (from either person) as it happens, so the listener itself is the source of truth.
// NOTE: onSnapshot returns an unsubscribe function. Whatever component starts a listener has to call it in its useEffect cleanup, otherwise the listener keeps running (and billing reads) after the component is gone.
import { collection, doc, getDoc, onSnapshot, query, where, orderBy, limitToLast, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Chat, Message, MessagePreview, MessageReply } from '../types';

// How many of the most recent messages a chat loads. Older ones need pagination (see the to-do list).
const MESSAGE_LIMIT = 50;

// How long after sending a message its sender can still edit it. The rules enforce the same window, this is just so the UI can hide the Edit option once it's passed.
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export const chatService = {
    // Builds the chat ID for two users: their UIDs sorted and joined with an underscore. Sorting is what makes it the same ID no matter who opens the chat first.
    getChatId(uidA: string, uidB: string): string {
        return [uidA, uidB].sort().join('_');
    },

    // Listens to every chat the user is in and calls onChange with the full list (most recent activity first) whenever any of them changes.
    // The list is sorted here rather than with orderBy in the query, since array-contains + orderBy on another field would need a composite index (same approach as getPostsByUser).
    subscribeToChats(myUid: string, onChange: (chats: Chat[]) => void, onError: (error: Error) => void): () => void {
        const q = query(collection(db, "chats"), where("participantIds", "array-contains", myUid));

        return onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));

            // ISO strings sort correctly as plain strings, so localeCompare is enough to order them by time.
            chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            onChange(chats);
        }, onError);
    },

    // Listens to the latest messages in a chat (oldest first, so they render top to bottom) and calls onChange whenever one is added.
    // It's fine to listen to a chat that doesn't exist yet (nobody has sent a message): the rules only check the chat ID, so this just returns an empty list until the first message arrives.
    subscribeToMessages(chatId: string, onChange: (messages: Message[]) => void, onError: (error: Error) => void): () => void {
        const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"), limitToLast(MESSAGE_LIMIT));

        return onSnapshot(q, (snapshot) => {
            onChange(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
        }, onError);
    },

    // Fetches a single message, used to show the quote above a reply when the original is older than the messages loaded by subscribeToMessages. Returns null if it no longer exists (unsent).
    async getMessage(chatId: string, messageId: string): Promise<Message | null> {
        const messageDoc = await getDoc(doc(db, "chats", chatId, "messages", messageId));
        return messageDoc.exists() ? ({ id: messageDoc.id, ...messageDoc.data() } as Message) : null;
    },

    // Sends a message from myUid to otherUid, optionally as a reply to another message. The message doc and the chat's latest-message preview are written in one atomic batch, which is what the rules require (the preview has to be a copy of the message).
    // The first message also creates the chat doc itself, so a chat only shows up in someone's list once there's actually something in it.
    // There's no optimistic update needed in the UI: Firestore fires the listeners above with local writes right away, before the server confirms them.
    async sendMessage(myUid: string, otherUid: string, text: string, replyTo?: MessageReply): Promise<void> {
        const chatId = this.getChatId(myUid, otherUid);
        const chatRef = doc(db, "chats", chatId);
        const messageRef = doc(collection(db, "chats", chatId, "messages")); // Auto-generated ID, created up front so the preview can point at it.

        const createdAt = new Date().toISOString();
        const preview: MessagePreview = { messageId: messageRef.id, senderId: myUid, text, createdAt };
        const message: Omit<Message, 'id'> = { senderId: myUid, text, createdAt, ...(replyTo && { replyTo }) };

        // Asking the server whether the chat exists yet, since creating and updating it are different writes (and different rules).
        // If both people send their very first message at the same moment, the second batch fails (the create turns into an update the rules don't allow), and simply sending again works.
        const chatDoc = await getDoc(chatRef);
        const batch = writeBatch(db);

        if (chatDoc.exists()) {
            batch.update(chatRef, { lastMessage: preview, updatedAt: createdAt });
        } else {
            batch.set(chatRef, {
                participantIds: [myUid, otherUid].sort(),
                createdAt,
                updatedAt: createdAt,
                lastMessage: preview,
                lastRead: { [myUid]: createdAt } // The sender has obviously seen their own first message.
            });
        }

        batch.set(messageRef, message);
        await batch.commit();
    },

    // Edits one of your own messages (the rules only allow this within 15 minutes of sending, see EDIT_WINDOW_MS).
    // If it's the chat's latest message, the preview gets the new text in the same batch, otherwise the chat list would keep showing the old text. updatedAt isn't touched, so an edit doesn't bump the chat to the top of the list.
    async editMessage(chat: Chat, messageId: string, text: string): Promise<void> {
        const editedAt = new Date().toISOString();
        const batch = writeBatch(db);

        batch.update(doc(db, "chats", chat.id, "messages", messageId), { text, editedAt });
        if (chat.lastMessage.messageId === messageId) {
            batch.update(doc(db, "chats", chat.id), { lastMessage: { ...chat.lastMessage, text, editedAt } });
        }

        await batch.commit();
    },

    // Unsends (deletes) one of your own messages, at any time. Same idea as editMessage: if it's the chat's latest message, the preview is emptied and marked unsent in the same batch, so its text disappears from the chat list too.
    // If the other person sends something in the moment between, the batch fails (the preview is no longer yours to change), and unsending again works since the preview no longer points at this message.
    async unsendMessage(chat: Chat, messageId: string): Promise<void> {
        const batch = writeBatch(db);

        batch.delete(doc(db, "chats", chat.id, "messages", messageId));
        if (chat.lastMessage.messageId === messageId) {
            const { senderId, createdAt } = chat.lastMessage;
            batch.update(doc(db, "chats", chat.id), { lastMessage: { messageId, senderId, text: '', createdAt, unsent: true } });
        }

        await batch.commit();
    },

    // Marks a chat as read for myUid by setting only their own key in lastRead. The "lastRead.uid" dot path updates that one key without touching the other participant's, which the rules check.
    // upTo is the latest message's createdAt. Timestamps come from each device's own clock (D5 in planning/brainstorming.txt), so if the sender's clock runs ahead of mine, "now" could be EARLIER than their message.
    // Taking whichever is later makes sure the chat always ends up counted as read, instead of looking unread forever (and re-marking itself on every snapshot).
    async markRead(chatId: string, myUid: string, upTo: string): Promise<void> {
        const now = new Date().toISOString();
        await updateDoc(doc(db, "chats", chatId), { [`lastRead.${myUid}`]: now > upTo ? now : upTo });
    }
};
