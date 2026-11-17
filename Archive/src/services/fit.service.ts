// This will include all Firebase functionality for the style board's planned fits (users/{uid}/fits).
// Fits are private like the archive, and also use an onSnapshot listener so the board updates on its own after a fit is added, edited, or deleted.
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { docData } from '../utils/timestamps';
import type { Fit, FitSection } from '../types';

// The five parts of an outfit with the labels the fit form and fit cards show, in order from head to toe (accessories last).
export const FIT_SECTIONS: { key: FitSection, label: string }[] = [
    { key: 'headwear', label: 'Headwear' },
    { key: 'tops', label: 'Tops' },
    { key: 'bottoms', label: 'Bottoms' },
    { key: 'footwear', label: 'Footwear' },
    { key: 'accessories', label: 'Accessories' },
];

// What a fit is called on the board: its name if it has one, otherwise "Fit #" plus its position (the first fit after the plus button is Fit #1, the next is Fit #2, and so on).
// Since the number comes from the fit's spot on the board, deleting a fit renumbers the unnamed ones after it.
export const getFitLabel = (fit: Fit, index: number): string => fit.name || `Fit #${index + 1}`;

// A fit with nothing in it yet, what the fit form starts from.
export const emptySections = (): Fit['sections'] => ({ headwear: [], tops: [], bottoms: [], footwear: [], accessories: [] });

export const fitService = {
    // Listens to the user's fits and calls onChange with all of them, oldest first, since that's the order they fill the board (Fit #1 sits right after the plus button).
    // Returns the unsubscribe function, which the page has to call in its useEffect cleanup.
    subscribeToFits(uid: string, onChange: (fits: Fit[]) => void, onError: (error: Error) => void): () => void {
        return onSnapshot(collection(db, "users", uid, "fits"), (snapshot) => {
            const fits = snapshot.docs.map(doc => ({ id: doc.id, ...docData(doc) } as Fit));
            fits.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            onChange(fits);
        }, onError);
    },

    // Adds a new fit to the user's board. The name is optional; a fit without one is shown as "Fit #" plus its spot on the board.
    async createFit(myUid: string, name: string, sections: Fit['sections']): Promise<void> {
        await setDoc(doc(collection(db, "users", myUid, "fits")), { // Auto-generated ID.
            ...(name && { name }),
            sections,
            createdAt: serverTimestamp()
        });
    },

    // Saves changes to an existing fit. Only the name, sections, and updatedAt are sent, so createdAt (which decides the fit's spot on the board) stays exactly as stored, which the rules require.
    // Clearing the name removes the field (deleteField), so the fit goes back to being labeled by its position.
    async updateFit(myUid: string, fit: Fit, name: string, sections: Fit['sections']): Promise<void> {
        await updateDoc(doc(db, "users", myUid, "fits", fit.id), {
            name: name || deleteField(),
            sections,
            updatedAt: serverTimestamp()
        });
    },

    async deleteFit(myUid: string, fitId: string): Promise<void> {
        await deleteDoc(doc(db, "users", myUid, "fits", fitId));
    },

    // Deletes all of the user's fits, used by authService.deleteAccount alongside archiveService.deleteAll.
    async deleteAll(myUid: string): Promise<void> {
        const snapshot = await getDocs(collection(db, "users", myUid, "fits"));
        const batch = writeBatch(db);
        snapshot.docs.forEach(fitDoc => batch.delete(fitDoc.ref));
        await batch.commit();
    }
};
