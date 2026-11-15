// This will include all Firebase functionality for following/unfollowing users.
// A follow is stored twice, once on each side (users/{target}/followers/{me} and users/{me}/following/{target}), so either user's list is one subcollection read. Both counters on the user docs move in the same batch, which the security rules require.
import { doc, getDoc, getDocs, collection, writeBatch, increment } from 'firebase/firestore';
import { db } from '../firebase';
import type { Follow } from '../types';

export const followService = {
    // Checks whether myUid currently follows targetUid by looking for the doc in my own following subcollection.
    async isFollowing(myUid: string, targetUid: string): Promise<boolean> {
        const followingDoc = await getDoc(doc(db, "users", myUid, "following", targetUid));
        return followingDoc.exists();
    },

    // Follows or unfollows targetUid and returns the NEW state (true = now following). Same atomic batch pattern as postService.toggleLike, just with two docs and two counters instead of one of each.
    async toggleFollow(myUid: string, targetUid: string): Promise<boolean> {
        const myUserRef = doc(db, "users", myUid);
        const targetUserRef = doc(db, "users", targetUid);
        const followingRef = doc(db, "users", myUid, "following", targetUid);
        const followerRef = doc(db, "users", targetUid, "followers", myUid);

        // Asking the server (not the cache) whether the follow exists, so a stale UI can't double-follow or double-unfollow.
        const followingDoc = await getDoc(followingRef);
        const batch = writeBatch(db);
        let nowFollowing: boolean;

        if (followingDoc.exists()) {
            // Unfollow: remove both docs, decrement both counters.
            batch.delete(followingRef);
            batch.delete(followerRef);
            batch.update(myUserRef, { followingCount: increment(-1) });
            batch.update(targetUserRef, { followerCount: increment(-1) });
            nowFollowing = false;
        } else {
            // Follow: each doc holds the OTHER user's UID (same as its doc ID), increment both counters.
            const createdAt = new Date().toISOString();
            batch.set(followingRef, { uid: targetUid, createdAt });
            batch.set(followerRef, { uid: myUid, createdAt });
            batch.update(myUserRef, { followingCount: increment(1) });
            batch.update(targetUserRef, { followerCount: increment(1) });
            nowFollowing = true;
        }

        await batch.commit();
        return nowFollowing;
    },

    // Fetches everyone who follows uid. Each Follow only holds a UID, so pair this with profileService.getProfilesByUids to show names and pictures.
    async getFollowers(uid: string): Promise<Follow[]> {
        const querySnapshot = await getDocs(collection(db, "users", uid, "followers"));
        return querySnapshot.docs.map(doc => doc.data() as Follow);
    },

    // Fetches everyone uid follows. Same shape as getFollowers.
    async getFollowing(uid: string): Promise<Follow[]> {
        const querySnapshot = await getDocs(collection(db, "users", uid, "following"));
        return querySnapshot.docs.map(doc => doc.data() as Follow);
    }
};
