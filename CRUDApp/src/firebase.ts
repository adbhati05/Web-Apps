import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // This will allow me to use a Firebase database.
import { getAuth } from "firebase/auth"; // This will allow me to set up user-auth for the site (including hashing).
import { getStorage } from "firebase/storage"; // This will allow me to have storage for whenever a user makes a post, etc).

// Initializing the Firebase configuration object with all the details from the project overview.
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initializing Firebase by passing in the const above into initializeApp.
const app = initializeApp(firebaseConfig);

// Exporting the Firestore database, auth service, and storage service so that I can achieve CRUD operations, user authentication, and file storage.
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);