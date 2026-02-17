// This will be include all Firebase functionality necessary for post operations.
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { storageService } from './storage.service';
import { authService } from './auth.service';
import type { Post, PieceDetail, UserInfo } from '../types';

const postCache = new Map<string, Post>();

// TO-DO: Update Google Cloud to include payment details so I can set up storage bucket.
// TO-DO: include logic for comments in the future, but for now I'll just keep a count of comments in the post document and implement comment functionality later on.
// TO-DO: Implement pagination (do research on this) for fetching posts in the future, especially as the number of posts grows. For now, I'll just fetch all posts and sort them by creation date.

export const postService = {
    async createPost(
        caption: string,
        pieces: PieceDetail[],
        imageURL: string,
        userInfo: UserInfo
    ): Promise<Post> {
        // Upload the image to Firebase Storage
        const uploadedImageURL = await storageService.uploadPostImage(imageURL, userInfo.uid);

        // Prepare the post object (types.ts defines the Post interface)
        const postRef = doc(collection(db, "posts"));
        const post: Post = {
            id: postRef.id,
            uid: userInfo.uid,
            username: userInfo.username,
            caption,
            pieces,
            createdAt: new Date().toISOString(),
            imageURL: uploadedImageURL,
            likes: [],
            commentsCount: 0
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
        const { getDocs, query, orderBy } = await import('firebase/firestore');
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

    async updatePost(postId: string, updates: Partial<Post>): Promise<void> {
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
        await deleteDoc(doc(db, "posts", post.id));

        // Remove from cache
        postCache.delete(post.id);
    },

    // Toggles a like on a post. Implement liking feature in the UI later, allowing users to like/unlike posts. This function will add/remove the user's UID from the post's likes array in Firestore.
    async toggleLike(postId: string, userId: string): Promise<void> {
        const post = await this.getPost(postId);
        if (!post) throw new Error("Post not found");

        const likes = post.likes || [];
        const isLiked = likes.includes(userId);
        const newLikes = isLiked
            ? likes.filter(uid => uid !== userId)
            : [...likes, userId];

        await this.updatePost(postId, { likes: newLikes });
    }
};