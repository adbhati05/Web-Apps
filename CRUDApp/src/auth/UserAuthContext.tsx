import { createContext, useState, useEffect, useContext } from "react";
import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from '../firebase';

interface UserAuthProviderProps {
    children: React.ReactNode;
};

// Set up a TypeScript type defining the structure of the authentication context.
type AuthContextData = {
    user: User | null;          // Current authenticated user or null if not logged in.
    logIn: typeof logIn;        // Function to log in a user.
    signUp: typeof signUp;      // Function to sign up a new user.
    logOut: typeof logOut;      // Function to log out the current user.
};

const logIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
};

const signUp = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

const logOut = () => {
    signOut(auth);
};

// App's auth context which contains the default values and structure for the context and will be used to share authentication state across the entire app.
export const UserAuthContext = createContext<AuthContextData>({
    user: null,
    logIn,
    signUp,
    logOut
});

// This is a Provider component that wraps the entire app to provide authentication context to all child components via the children prop.
export const UserAuthProvider = ({children}: UserAuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);

    // useEffect hook to set up authentication state listener. This runs once (via dependency array at the end) when the component mounts.
    useEffect(() => {
        // Leveraging onAuthStateChanged from Firebase for this listener. If the user is signed in, user state will be logged and then updated via setUser function from above useState hook. If not, then user state will be set to null.
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("The logged in user state is: ", user);
                setUser(user);
            } else {
                setUser(null);
            }
        });

        // Cleanup function to unsubscribe from the listener when component unmounts or re-renders (this prevents memory leaks ande ensures the listener is removed properly).
        return () => {
            unsubscribe();
        };
    }, []); 

    // This value object will be provided to all consuming components. It contains the current user state and all authentication functions.
    const value: AuthContextData = {
        user,
        logIn,
        signUp,
        logOut
    };

    // Returning the Provider component with the value prop and ensuring children components will have access to the authentication context.
    return(
        <UserAuthContext.Provider value={value}>
            {children}
        </UserAuthContext.Provider>
    );
};

// Custom hook to easily access the authentication context for convenience.
export const useUserAuth = () => {
    return useContext(UserAuthContext);
}