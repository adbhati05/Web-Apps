import { createContext, useState, useEffect, useContext, useRef } from "react";
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../firebase';
import type { UserInfo } from '../types';
import { authService } from '../services/auth.service';
import { profileService } from '../services/profile.service';
import { logError } from '../utils/logger';

interface UserAuthProviderProps {
    children: React.ReactNode;
};

// Setting up an the interface holding the auth context data (so far it's just the necessary functions, user, and user info | most likely will be expanded in the future).
interface AuthContextData {
    user: User | null;          // Current authenticated user or null if not logged in.
    userInfo: UserInfo | null;  // Current user's info or null if don't exist.
    status: AuthContextState;   // Current auth state (loading, signedOut, ready, noProfile, error).
    signUp: (                   // Rest of the data here are function signatures for auth process.
        email: string,
        password: string,
        displayName: string,
        username: string
    ) => Promise<void>;
    signIn: (
        email: string,
        password: string
    ) => Promise<void>;
    signOut: () => Promise<void>;
    deleteAccount: (currentPassword: string) => Promise<void>; // Goes through the context (not straight to authService) so the listener knows the user doc is about to disappear on purpose.
};

// Setting up possible states for the auth context data, which will be used to prevent a sign-up race condition where new accounts start with null userInfo.
// 'loading' - Firebase hasn't determined who's signed in yet or the profile is still loading
// 'signedOut' - No user is signed in
// 'ready' - User is signed in and the profile (userInfo) is loaded
// 'noProfile' - User is signed in but the profile (userInfo) is not found
// 'error' - Profile couldn't be loaded
export type AuthContextState = 'loading' | 'signedOut' | 'ready' | 'noProfile' | 'error';

// Initializing UserAuthContext with undefined as it will be populated later.
const UserAuthContext = createContext<AuthContextData | undefined>(undefined);

// This is a Provider component that wraps the entire app to provide authentication context to all child components via the children prop.
export const UserAuthProvider = ({children}: UserAuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [status, setStatus] = useState<AuthContextState>('loading'); // Initializing with 'loading' state since upon render, Firebase hasn't yet reported whether anyone is signed in.

    // This ref is used to track whether the user is is in the process of signing up or not.
    const signingUp = useRef(false);

    // Same idea as signingUp, for account deletion: the user doc is deleted before the Auth account, so for a moment the user is signed in with no doc. That's expected, not a missing profile.
    const deletingAccount = useRef(false);

    // Set when the listener skips a missing doc because of one of the two flags above. If the operation then fails partway, the profile really is gone, so the catch blocks use this to report 'noProfile'.
    const skippedMissingDoc = useRef(false);

    // useEffect hook to set up authentication state listener leveraging onAuthStateChanged from Firebase. Depending on the current user state reported by Firebase, status will be updated accordingly
    useEffect(() => {
        // Setting up listener on the signed-in user's doc. It's replaced every time the signed-in user changes, so it lives here where both the auth callback and cleanup can access it.
        let unsubscribeUserDoc: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            // Whoever was signed in previously, their listener is no longer needed.
            unsubscribeUserDoc?.();
            unsubscribeUserDoc = null;

            setUser(currentUser);

            // If no user is signed in, userInfo and status is set accordingly.
            if (!currentUser) {
                setUserInfo(null);
                setStatus('signedOut');
                return;
            }

            setStatus('loading');

            // Subscribing to the signed-in user's doc to get their profile info.
            unsubscribeUserDoc = profileService.subscribeToUserInfo(currentUser.uid, 
                (info) => {
                    // Exiting if their doc doesn't exist and the user is in the process of signing up or deleting their account (the missing doc is expected then).
                    if (!info && (signingUp.current || deletingAccount.current)) {
                        skippedMissingDoc.current = true;
                        return;
                    }
                    skippedMissingDoc.current = false;

                    // Otherwise setting status conditionally based on whether the doc exists or not and setting userInfo to the doc's data.
                    setUserInfo(info);
                    setStatus(info ? 'ready' : 'noProfile');
                },
                (error) => {
                    // On sign-out (or right after account deletion), Firestore can reject the listener for losing access before onAuthStateChanged has unsubscribed it. Nobody's signed in by then, so it's not a real error.
                    if (!auth.currentUser) return;

                    // Setting state and userInfo to null when an error occurs while fetching the signed-in user's doc.
                    logError("Failed to load user profile", error);
                    setUserInfo(null);
                    setStatus('error');
                }
            );
        });

        return () => {
            unsubscribeAuth();
            unsubscribeUserDoc?.();
        };
    }, []);
           
    // Leveraging authService to set up signUp function. Will do the same for signIn and signOut functions.
    // For now keep these functions simple, but later on if errors need to be handled, try-catch blocks can be added.
    const signUp = async (
        email: string,
        password: string,
        displayName: string,
        username: string
    ) => {
        // Setting signingUp ref to true since when this function is invoked, the user is signing up.
        signingUp.current = true;

        // Wrapping the signUp function in a try-catch block to handle any unexpected errors that may occur.
        // Here, the status is set to 'noProfile' if the user doc cannot be constructed after sign-up (error occurred).
        try {
            await authService.signUp(email, password, displayName, username);
        } catch (error) {
            if (auth.currentUser) setStatus('noProfile');
            throw error;
        } finally {
            signingUp.current = false;
        }
    };

    const signIn = async (
        email: string,
        password: string
    ) => {
        await authService.signIn(email, password);
    };

    const signOut = async () => {
        await authService.signOut();
    }

    const deleteAccount = async (currentPassword: string) => {
        deletingAccount.current = true;
        skippedMissingDoc.current = false;

        try {
            await authService.deleteAccount(currentPassword);
        } catch (error) {
            // A wrong password fails before anything is deleted, so nothing changes. But if the doc was deleted and the Auth account wasn't, the user is now signed in without a profile.
            if (auth.currentUser && skippedMissingDoc.current) {
                setUserInfo(null);
                setStatus('noProfile');
            }
            throw error; // AccountInfoForm still shows its inline error.
        } finally {
            deletingAccount.current = false;
        }
    };

    // This value object will be provided to all consuming components. It contains the current user state and all authentication functions.
    const value: AuthContextData = {
        user,
        userInfo,
        status,
        signUp,
        signIn,
        signOut,
        deleteAccount
    };

    // Returning the Provider component with the value prop and ensuring children components will have access to the authentication context.
    return(
        <UserAuthContext.Provider value={value}>
            {children}
        </UserAuthContext.Provider>
    );
};

// Custom hook to easily access the authentication context for convenience.
export const useUserAuth = (): AuthContextData => {
    // Making sure to throw an error if context is undefined, which will happen if useUserAuth is called outside of UserAuthProvider.
    const context = useContext(UserAuthContext);
    if (!context) throw new Error("useUserAuth must be used within a UserAuthProvider");
    return context;
}

// For pages and components inside ProtectedRoutes. ProtectedRoutes only renders them once status is 'ready', so the profile is always loaded there, and this hook gives it back as UserInfo (never null).
// That way they don't need their own "userInfo is null" checks. Calling it anywhere else (the login page, for instance) throws, since there's no guarantee there.
export const useSignedInUser = (): UserInfo => {
    const { userInfo } = useUserAuth();
    if (!userInfo) throw new Error("useSignedInUser was called outside ProtectedRoutes, where the profile isn't guaranteed to be loaded.");
    return userInfo;
};
