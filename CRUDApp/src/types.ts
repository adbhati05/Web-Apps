// Note that adding a question mark (?) after a prop name in an interface makes that prop optional.
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

export interface Post {
    id: string; // Unique identifier for each post.
    uid: string; // Which user this post belongs to.
    username: string; // Display name or username of the poster.
    caption: string;
    pieces: PieceDetail[]; // Array of details objects.
    createdAt: string;
    updatedAt?: string;
    imageURL: string;
    likes?: string[]; // Array of user UIDs who liked the post.
    commentsCount?: number;
}