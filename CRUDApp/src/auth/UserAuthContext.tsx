import { createContext, useState, useEffect, useContext } from "react";
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../firebase';
import type { UserInfo } from '../types';
import { authService } from '../services/auth.service';

interface UserAuthProviderProps {
    children: React.ReactNode;
};

// Setting up an the interface holding the auth context data (so far it's just the necessary functions, user, and user info | most likely will be expanded in the future).
interface AuthContextData {
    user: User | null;          // Current authenticated user or null if not logged in.
    userInfo: UserInfo | null;  // Current user's info or null if don't exist.
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
};

// Initializing UserAuthContext with undefined as it will be populated later.
const UserAuthContext = createContext<AuthContextData | undefined>(undefined);

// This is a Provider component that wraps the entire app to provide authentication context to all child components via the children prop.
export const UserAuthProvider = ({children}: UserAuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    // TRY TO SET UP LOADING STATE HERE, DO MORE RESEARCH ON THIS AS IT COULD IMPROVE USER EXPERIENCE.
    // MOST LIKELY WILL NEED TO SET UP SOME UI THAT SHOWS LOADING STATE TO USER.

    // useEffect hook to set up authentication state listener. This runs once (via dependency array at the end) when the component mounts. Leveraging onAuthStateChanged from Firebase for this listener set up.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // This wrapping try-catch block tracks the auth state change via the auth state listener and catches any errors during the process.
            // When an error is caught, user/user info are set to null.
            try {
                // Checking if currentUser exists, if so, in another try-catch block, current user's info is fetched and the user is established via setUser and their info via setUserInfo.
                // If the user's info is not fetched successfully, it is registered as an error to the console and the user is set but with null info.
                if (currentUser) {
                    try {
                        const currentUserInfo = await authService.getUserInfo(currentUser.uid);
                        console.log("The logged in user state is: ", currentUser);
                        setUser(currentUser);
                        setUserInfo(currentUserInfo);
                    } catch (error) {
                        console.error("Error fetching user info: ", error);
                        setUser(currentUser);
                        setUserInfo(null);
                    }
                } else {
                    // User is not logged in/or authenticated for this case, so both user and user info are set to null.
                    setUser(null);
                    setUserInfo(null);
                }
            } catch (error) {
                console.error("Error occurred during auth state change: ", error);
                setUser(null);
                setUserInfo(null);
            }   
        });

        // Cleanup function to unsubscribe from the listener when component unmounts or re-renders (this prevents memory leaks ande ensures the listener is removed properly).
        return () => {
            unsubscribe();
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
        await authService.signUp(email, password, displayName, username);
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

    // This value object will be provided to all consuming components. It contains the current user state and all authentication functions.
    const value: AuthContextData = {
        user,
        userInfo,
        signUp,
        signIn,
        signOut
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