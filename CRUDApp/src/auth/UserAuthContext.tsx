import { createContext, useState, useEffect, useContext } from "react";
import type { User } from "firebase/auth";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

interface IUserAuthProviderProps {
    children: React.ReactNode;
};

type AuthContextData = {
    user: User | null;
    logIn: typeof logIn;
    signUp: typeof signUp;
    logOut: typeof logOut;
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

export const UserAuthContext = createContext<AuthContextData>({
    user: null,
    logIn,
    signUp,
    logOut
});

export const UserAuthProvider: React.FunctionComponent<IUserAuthProviderProps> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("The logged in user state is: ", user);
                setUser(user);
            }

            return () => {
                unsubscribe();
            }
        });
    });

    const value: AuthContextData = {
        user,
        logIn,
        signUp,
        logOut
    };

    return(
        <UserAuthContext.Provider value={value}>
            {children}
        </UserAuthContext.Provider>
    );
};

export const useUserAuth = () => {
    return useContext(UserAuthContext);
}