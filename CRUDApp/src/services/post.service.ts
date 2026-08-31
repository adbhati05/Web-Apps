// This will be include all Firebase functionality necessary for post operations.
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, increment, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { storageService } from './storage.service';
import type { Post, Comment, UserInfo, PieceDetail } from '../types';

// TO-DO: Implement pagination (do research on this) for fetching posts in the future, especially as the number of posts grows. For now, I'll just fetch all posts and sort them by creation date.
// TO-DO: Figure out how to make the folders in storage bucket not be random strings of characters, but instead something more organized and user-friendly (like the user's Username or UID).

// The fields on a post that its owner is allowed to edit after creation. Everything else (uid,
// createdAt, the counters) is frozen by the security rules, so the service doesn't accept them either.
export type PostContentUpdate = Partial<Pick<Post, 'caption' | 'pieces' | 'hasDetails' | 'imageURL'>>;

const postCache = new Map<string, Post>();

export const postService = {
    async createPost(
        caption: string,
        pieces: PieceDetail[],
        hasDetails: boolean,
        imageURL: string,
        userInfo: UserInfo
    ): Promise<Post> {
        // Upload the image to Firebase Storage
        const uploadedImageURL = await storageService.uploadPostImage(imageURL, userInfo.uid);

        // Prepare the post object (types.ts defines the Post interface).
        // The security rules require uid to match the signed-in user and both counters to start at 0.
        const postRef = doc(collection(db, "posts"));
        const post: Post = {
            id: postRef.id,
            uid: userInfo.uid,
            username: userInfo.displayName,
            caption,
            pieces,
            hasDetails,
            createdAt: new Date().toISOString(),
            imageURL: uploadedImageURL,
            likeCount: 0, // Likes live in the posts/{id}/likes subcollection; this is just the denormalized count.
            commentCount: 0 // Same for comments (posts/{id}/comments subcollection).
        };

        // Save to Firestore
        await setDoc(postRef, post);

        // Update cache (optional but can speed up subsequent reads)
        postCache.set(post.id, post);

        return post;
    },

    async getPost(postId: string): Promise<Post | null> {
        // If the post is in the cache, return it immediately to avoid unnecessary Firestore reads.
        if (postCache.has(postId)) {
            return postCache.get(postId)!;
        }

        const postDoc = await getDoc(doc(db, "posts", postId));
        if (!postDoc.exists()) return null;

        const post = { id: postDoc.id, ...postDoc.data() } as Post;
        postCache.set(postId, post);
        return post;
    },

    async getPosts(): Promise<Post[]> {
        // Note: For a real app, you'd use a query with ordering and pagination. Look into this for future improvements.
        // Implementing basic fetch for now.
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const posts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Post));

        // Update cache
        posts.forEach(post => postCache.set(post.id, post));

        return posts;
    },

    // Content-only updates by the post's owner. The security rules reject attempts to change uid/createdAt or the like/comment counters through this path, and the PostContentUpdate type keeps the client honest about that.
    async updatePost(postId: string, updates: PostContentUpdate): Promise<void> {
        const postRef = doc(db, "posts", postId);
        const updatedAt = new Date().toISOString();

        // Once update UI is set up, make sure it aligns with the logic with updates being a partial Post object that only includes the fields that need to be updated.
        await updateDoc(postRef, {
            ...updates,
            updatedAt
        });

        // Update cache if it exists
        if (postCache.has(postId)) {
            const currentPost = postCache.get(postId)!;
            postCache.set(postId, { ...currentPost, ...updates, updatedAt });
        }
    },

    async deletePost(post: Post): Promise<void> {
        // Delete image from Storage
        try {
            await storageService.deleteImage(post.imageURL);
        } catch (error) {
            console.error("Failed to delete image, proceeding with post deletion:", error);
        }

        // Delete document from Firestore
        // Note: this orphans the likes/comments subcollection docs (a client can't delete a wholesubcollection). They become unreachable garbage; proper cleanup needs a Cloud Function (see to-do.txt).
        await deleteDoc(doc(db, "posts", post.id));

        // Remove from cache
        postCache.delete(post.id);
    },

    // Checks whether a user has liked a post, by checking the existence of their doc (doc ID = their UID) in the post's likes subcollection.
    async hasLiked(postId: string, userId: string): Promise<boolean> {
        const likeDoc = await getDoc(doc(db, "posts", postId, "likes", userId));
        return likeDoc.exists();
    },

    // Toggles a like on a post and returns the NEW liked state (true = now liked). The like doc write and the counter change are committed in one atomic batch. 
    // The security rules actually require this (they only allow the counter to move when the same batch creates/deletes the caller's own like doc), so the count can never drift from reality.
    async toggleLike(postId: string, userId: string): Promise<boolean> {
        const postRef = doc(db, "posts", postId);
        const likeRef = doc(db, "posts", postId, "likes", userId);

        // Asking the server (not the cache) whether the like doc exists, so a stale UI can't
        // double-like or double-unlike.
        const likeDoc = await getDoc(likeRef);
        const batch = writeBatch(db);
        let nowLiked: boolean;

        if (likeDoc.exists()) {
            // Unlike: remove the like doc, decrement the counter.
            batch.delete(likeRef);
            batch.update(postRef, { likeCount: increment(-1) });
            nowLiked = false;
        } else {
            // Like: create the like doc (ID = the liker's UID), increment the counter.
            batch.set(likeRef, { uid: userId, createdAt: new Date().toISOString() });
            batch.update(postRef, { likeCount: increment(1) });
            nowLiked = true;
        }

        await batch.commit();

        // Keep the cached post's counter in sync.
        if (postCache.has(postId)) {
            const currentPost = postCache.get(postId)!;
            postCache.set(postId, { ...currentPost, likeCount: currentPost.likeCount + (nowLiked ? 1 : -1) });
        }

        return nowLiked;
    },

    // Fetches a post's comments (oldest first) from its comments subcollection.
    async getComments(postId: string): Promise<Comment[]> {
        const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
    },

    // Adds a comment doc to the post's comments subcollection and bumps the denormalized counter in the same atomic batch. Returns the new comment so the UI can append it without refetching.
    async addComment(postId: string, comment: string, userInfo: UserInfo): Promise<Comment> {
        const postRef = doc(db, "posts", postId);
        const commentRef = doc(collection(db, "posts", postId, "comments")); // Auto-generated ID.

        const newComment: Comment = {
            id: commentRef.id,
            uid: userInfo.uid,
            username: userInfo.username,
            comment,
            createdAt: new Date().toISOString()
        };

        const batch = writeBatch(db);
        batch.set(commentRef, newComment);
        batch.update(postRef, { commentCount: increment(1) });
        await batch.commit();

        // Keep the cached post's counter in sync.
        if (postCache.has(postId)) {
            const currentPost = postCache.get(postId)!;
            postCache.set(postId, { ...currentPost, commentCount: currentPost.commentCount + 1 });
        }

        return newComment;
    },

    // Deletes a comment doc and decrements the counter atomically. The security rules allow this for the comment's author and for the post's owner (moderation).
    async deleteComment(postId: string, commentId: string): Promise<void> {
        const postRef = doc(db, "posts", postId);
        const commentRef = doc(db, "posts", postId, "comments", commentId);

        const batch = writeBatch(db);
        batch.delete(commentRef);
        batch.update(postRef, { commentCount: increment(-1) });
        await batch.commit();

        // Keep the cached post's counter in sync.
        if (postCache.has(postId)) {
            const currentPost = postCache.get(postId)!;
            postCache.set(postId, { ...currentPost, commentCount: currentPost.commentCount - 1 });
        }
    }
};
