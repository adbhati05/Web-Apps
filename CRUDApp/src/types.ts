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
    likes?: string[]; // Array of user UIDs who liked the post.
    comments?: Comment[]; // Array of comment objects.
}

// This will represent each comment belonging to posts.
export interface Comment {
    id: string; // Unique identifier for each comment, allowing users to comment multiple times.
    postId: string; // Which post this comment belongs to.
    uid: string; // Which user made the comment.
    username: string;
    comment: string;
    createdAt: string;
}