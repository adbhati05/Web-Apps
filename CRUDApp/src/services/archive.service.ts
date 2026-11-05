// This will include all Firebase functionality for the style board's archive: the pieces a user has favorited from posts or added themselves (users/{uid}/archive).
// The archive is private (only its owner can read or write it, see the archive rules), and like chats it uses an onSnapshot listener, so the archive side bar updates on its own when a piece is added or removed.
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { copyPiece } from '../utils/pieces';
import type { ArchivedPiece, PieceDetail, Post } from '../types';

export const archiveService = {
    // Builds the archive doc ID for a favorited piece: the post's ID and the piece's index joined with an underscore.
    // Since an existing doc can't be overwritten (the rules only allow creating archive docs), this is what stops the same piece from being favorited twice.
    getFavoriteId(postId: string, pieceIndex: number): string {
        return `${postId}_${pieceIndex}`;
    },

    // Listens to the user's archive and calls onChange with every piece (newest first) whenever it changes. Returns the unsubscribe function, which the page has to call in its useEffect cleanup.
    subscribeToArchive(uid: string, onChange: (pieces: ArchivedPiece[]) => void, onError: (error: Error) => void): () => void {
        return onSnapshot(collection(db, "users", uid, "archive"), (snapshot) => {
            const pieces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArchivedPiece));

            // ISO strings sort correctly as plain strings, same as the chat list.
            pieces.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            onChange(pieces);
        }, onError);
    },

    // Favorites one of a post's pieces into the user's archive. Returns false (without writing anything) if that piece is already there, so the UI can say so instead of showing an error.
    // fromUsername is the post owner's current username (the feed has it from the author lookup), which is what the archive shows under the piece's name.
    async favoritePiece(myUid: string, post: Post, pieceIndex: number, fromUsername: string): Promise<boolean> {
        const pieceRef = doc(db, "users", myUid, "archive", this.getFavoriteId(post.id, pieceIndex));
        if ((await getDoc(pieceRef)).exists()) return false;

        // The rules check this copy against the real post (same owner, same name at this index, same details setting).
        await setDoc(pieceRef, {
            ...copyPiece(post.pieces[pieceIndex], post.hasDetails),
            hasDetails: post.hasDetails,
            source: 'favorite',
            fromUid: post.uid,
            fromUsername,
            postId: post.id,
            pieceIndex,
            createdAt: new Date().toISOString()
        });
        return true;
    },

    // Adds one of the user's own pieces to their archive (from the Add piece overlay in the archive side bar). The user is the owner, so the piece is "from" them.
    async addOwnPiece(myUid: string, myUsername: string, piece: PieceDetail, hasDetails: boolean): Promise<void> {
        await setDoc(doc(collection(db, "users", myUid, "archive")), { // Auto-generated ID.
            ...copyPiece(piece, hasDetails),
            hasDetails,
            source: 'own',
            fromUid: myUid,
            fromUsername: myUsername,
            createdAt: new Date().toISOString()
        });
    },

    // Removes a piece from the user's archive. Fits that already use it keep their own copy, so they don't change.
    async removePiece(myUid: string, pieceId: string): Promise<void> {
        await deleteDoc(doc(db, "users", myUid, "archive", pieceId));
    },

    // Deletes the user's whole archive, used by authService.deleteAccount so a deleted account doesn't leave its style board behind.
    async deleteAll(myUid: string): Promise<void> {
        const snapshot = await getDocs(collection(db, "users", myUid, "archive"));
        const batch = writeBatch(db);
        snapshot.docs.forEach(pieceDoc => batch.delete(pieceDoc.ref));
        await batch.commit();
    }
};
