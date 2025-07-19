// This file will contain the Firebase auth service functions (like signIn, signUp, logOut, etc)
// Make sure to migrate some of the code from UserAuthContext.tsx to here.
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';

export const authService = {
    logIn: (email: string, password: string) => {
        return signInWithEmailAndPassword(auth, email, password);
    },

    signUp: (email: string, password: string) => {
        return createUserWithEmailAndPassword(auth, email, password);
    },

    logOut: () => {
        return signOut(auth);
    }
}
