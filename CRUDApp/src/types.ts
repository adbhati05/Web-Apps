// Note that adding a question mark (?) after a prop name in an interface makes that prop optional.
export interface UserInfo {
    uid: string;
    email: string;
    username: string;
    createdAt: string;
    profilePicURL?: string;
}