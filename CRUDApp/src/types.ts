// Note that adding a question mark (?) after a prop name in an interface makes that prop optional.

// This will represent each user in the database.
export interface UserInfo {
    uid: string; // Unique identifier for each user.
    email: string;
    displayName: string; // This will hold the inputted username when user signs up.
    username: string; // This will be used to be added to a collection to ensure no duplicate usernames.
    createdAt: string;
    profilePicURL?: string;
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
// Likes and comments live in subcollections (posts/{id}/likes and posts/{id}/comments) so a popular post
// can't blow past Firestore's 1MiB document limit and the feed doesn't download every like/comment.
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

// This will represent each doc in a post's likes subcollection. The doc ID is the liker's UID,
// which is what lets the security rules enforce one like per user, toggling your own like only.
export interface Like {
    uid: string; // Who liked the post (same as the doc ID).
    createdAt: string;
}

// This will represent each doc in a post's comments subcollection.
// (No postId field needed — the parent post is implied by the subcollection path.)
export interface Comment {
    id: string; // Unique identifier for each comment, allowing users to comment multiple times.
    uid: string; // Which user made the comment.
    username: string;
    comment: string;
    createdAt: string;
}