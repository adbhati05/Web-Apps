// Note that adding a question mark (?) after a prop name in an interface makes that prop optional.

// This will represent each user in the database.
// Followers and following live in subcollections (users/{uid}/followers and users/{uid}/following) rather than arrays here, for the same reason likes and comments do on posts.
export interface UserInfo {
    uid: string; // Unique identifier for each user.
    // No email field: user docs are readable by every signed-in user, so it would be public. Firebase Auth already stores it (auth.currentUser.email).
    displayName: string; // This will hold the inputted username when user signs up.
    username: string; // This will be used to be added to a collection to ensure no duplicate usernames.
    createdAt: string;
    profilePicURL?: string;
    bio?: string; // Optional since sign-up doesn't set it, profile editing will.
    followerCount?: number; // Denormalized counts of the followers/following subcollections, kept in sync by the security rules like the post counters.
    followingCount?: number; // Both are set to 0 at sign-up, but stay optional since user docs made before this change don't have them yet.
}

// This will represent each details object that contains information such as name, price, size, materials, etc.
export interface PieceDetail {
    name: string;
    price?: string;
    size?: string;
    materials?: string;
    dateAcquired?: string;
}

// This will represent each post in the database.
// Likes and comments live in subcollections (posts/{id}/likes and posts/{id}/comments) so a popular post can't blow past Firestore's 1MiB document limit and the feed doesn't download every like/comment.
// The post doc only carries denormalized counters, which the security rules keep in sync with the subcollections.
export interface Post {
    id: string; // Unique identifier for each post.
    uid: string; // Which user this post belongs to.
    username: string; // Display name or username of the poster.
    caption: string;
    pieces: PieceDetail[]; // Array of details objects.
    hasDetails: boolean; // Will be used to render different post cards whether the post has details or not.
    createdAt: string;
    updatedAt?: string;
    imageURL: string;
    likeCount: number; // Denormalized count of docs in the likes subcollection.
    commentCount: number; // Denormalized count of docs in the comments subcollection.
}

// This will represent each doc in a likes subcollection. The doc ID is the liker's UID, which is what lets the security rules enforce one like per user, toggling your own like only.
// The same shape is reused for post likes (posts/{id}/likes) and comment likes (posts/{id}/comments/{id}/likes).
export interface Like {
    uid: string; // Who liked the post or comment (same as the doc ID).
    createdAt: string;
}

// This will represent each doc in a post's comments subcollection.
// (No postId field needed, the parent post is implied by the subcollection path.)
export interface Comment {
    id: string; // Unique identifier for each comment, allowing users to comment multiple times.
    uid: string; // Which user made the comment.
    username: string;
    comment: string;
    createdAt: string;
    editedAt?: string; // Only set once the author edits the comment, which is what the UI uses to mark it as edited.
    likeCount: number; // Denormalized count of docs in this comment's own likes subcollection, same pattern as the post's counters above.
}

// This will represent each doc in a user's followers or following subcollection (users/{uid}/followers/{followerUid} and users/{uid}/following/{followedUid}).
// Same idea as Like: the doc ID is the other user's UID, which is what lets the rules pin who may create or delete it, and one follow/unfollow writes both mirrored docs in a single batch.
export interface Follow {
    uid: string; // The other user in the relationship (same as the doc ID).
    createdAt: string;
}

// The slice of the latest message copied onto its chat doc, written in the same batch as the message itself, so the chat list can render a row without loading any messages.
// It's a copy of the message doc's fields, which is what the rules check to tie the two together. Editing or unsending the latest message updates this copy in the same batch.
export interface MessagePreview {
    messageId: string; // Which message this is a copy of, so the rules can tell when an edit or unsend has to update the preview too.
    senderId: string;
    text: string; // Emptied when the message is unsent, so the chat list never shows unsent text.
    createdAt: string;
    editedAt?: string; // Copied over when the latest message is edited.
    unsent?: boolean; // Set when the latest message is unsent, so the list can say so instead of showing an empty preview.
}

// Which message a reply is replying to. Deliberately no copy of the original's text: the quote above the reply is looked up from the original message itself, so editing or unsending the original updates (or hides) the quote too.
export interface MessageReply {
    messageId: string;
    senderId: string; // Who sent the original, so the quote can say "Replying to you" or "Replying to them" even before the original has loaded.
}

// This will represent each doc in the chats collection. For one-to-one chats the doc ID is the two participant UIDs sorted and joined, so the same pair can never end up with two chats.
// Messages live in chats/{id}/messages, so this doc only carries what the list view needs.
// A chat doc is only created along with its first message (see chatService.sendMessage), so opening someone's chat without sending anything doesn't leave an empty chat in their list.
export interface Chat {
    id: string; // The doc ID (uidA_uidB). Not stored as a field, it's filled in from the doc when reading.
    participantIds: string[]; // Sorted. Queried with array-contains to find the current user's chats, and what the rules check for the list query.
    createdAt: string;
    updatedAt: string; // Bumped with every message (always equal to lastMessage.createdAt) so the list can be ordered by recent activity.
    lastMessage: MessagePreview; // Always present, since the doc is created with the first message.
    lastRead: Record<string, string>; // Each participant's UID mapped to when they last opened the chat. Unread is just lastMessage.createdAt > lastRead[uid], and marking a chat read is one write instead of one per message. It also drives the "Seen" label under your last message.
}

// This will represent each doc in a chat's messages subcollection.
// (No chatId field, the parent chat is implied by the subcollection path, same as Comment.)
export interface Message {
    id: string; // The doc ID. Not stored as a field, it's filled in from the doc when reading.
    senderId: string; // The rules require this to be the caller's own UID.
    text: string; // 1-1000 characters, enforced by the rules.
    createdAt: string; // ISO string like everything else for now; see the timestamps decision in planning/brainstorming.txt.
    editedAt?: string; // Only set once the sender edits the message (allowed for 15 minutes after sending), which is what the UI uses to mark it as edited.
    replyTo?: MessageReply; // Only set when the message is a reply to another one.
}
