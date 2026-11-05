// This will include all Firebase functionality for the style board's planned fits (users/{uid}/fits).
// Fits are private like the archive, and also use an onSnapshot listener so the board updates on its own after a fit is added, edited, or deleted.
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Fit, FitSection } from '../types';

// The five parts of an outfit with the labels the fit form and fit cards show, in order from head to toe (accessories last).
export const FIT_SECTIONS: { key: FitSection, label: string }[] = [
    { key: 'headwear', label: 'Headwear' },
    { key: 'tops', label: 'Tops' },
    { key: 'bottoms', label: 'Bottoms' },
    { key: 'footwear', label: 'Footwear' },
    { key: 'accessories', label: 'Accessories' },
];

// The most pieces one section can hold, same cap as the rules.
export const FIT_SECTION_MAX = 10;

// The longest a fit's name can be, same cap as the rules.
export const FIT_NAME_MAX = 40;

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
            const fits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fit));
            fits.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            onChange(fits);
        }, onError);
    },

    // Adds a new fit to the user's board. The name is optional; a fit without one is shown as "Fit #" plus its spot on the board.
    async createFit(myUid: string, name: string, sections: Fit['sections']): Promise<void> {
        await setDoc(doc(collection(db, "users", myUid, "fits")), { // Auto-generated ID.
            ...(name && { name }),
            sections,
            createdAt: new Date().toISOString()
        });
    },

    // Saves changes to an existing fit. The whole doc is written again (which is how clearing the name removes it), keeping the original createdAt, since that decides the fit's spot on the board.
    async updateFit(myUid: string, fit: Fit, name: string, sections: Fit['sections']): Promise<void> {
        await setDoc(doc(db, "users", myUid, "fits", fit.id), {
            ...(name && { name }),
            sections,
            createdAt: fit.createdAt,
            updatedAt: new Date().toISOString()
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
