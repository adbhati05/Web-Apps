// Note that adding a question mark (?) after a prop name in an interface makes that prop optional.
export interface UserInfo {
    uid: string;
    email: string;
    displayName: string;
    username: string;
    createdAt: string;
    profilePicURL?: string;
}

export interface PostInfo {
    uid: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    imageURL?: string;
    likes: number;
    comments: number;
}