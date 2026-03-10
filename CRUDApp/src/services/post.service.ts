// This will be include all Firebase functionality necessary for post operations.
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { storageService } from './storage.service';
import { authService } from './auth.service';
import type { Post, PieceDetail, UserInfo } from '../types';

// TO-DO: include logic for comments in the future, but for now I'll just keep a count of comments in the post document and implement comment functionality later on.
// TO-DO: Implement a like/unlike feature for posts as well as the ability to update them.
// TO-DO: Implement pagination (do research on this) for fetching posts in the future, especially as the number of posts grows. For now, I'll just fetch all posts and sort them by creation date.
// TO-DO: Figure out how to make the folders in storage bucket not be random strings of characters, but instead something more organized and user-friendly (like the user's Username or UID).

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

        // Prepare the post object (types.ts defines the Post interface)
        const postRef = doc(collection(db, "posts"));
        const post: Post = {
            id: postRef.id,
            uid: userInfo.uid,
            username: userInfo.username,
            caption,
            pieces,
            hasDetails,
            createdAt: new Date().toISOString(),
            imageURL: uploadedImageURL,
            likes: [], // Initializing the post with an empty array (since no post will start with likes).
            comments: [] // Initializnig the post with an empty array of comments (since no post will start with comments).
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

        // Setting up the likes array and checking if the user has already liked the post
        const likes = post.likes || [];
        const isLiked = likes.includes(userId);
        const newLikes = isLiked
            ? likes.filter(uid => uid !== userId)
            : [...likes, userId];

        // Update post with new likes array
        await this.updatePost(postId, { likes: newLikes });
    },

    // Adds a comment to a post (and in Firestore). Implement commenting feature in the UI later, allowing users to comment on posts.
    async addComment(postId: string, comment: string, userInfo: UserInfo): Promise<void> {
        const post = await this.getPost(postId);
        if (!post) throw new Error("Post not found");

        // Setting up the comments array
        const comments = post.comments || [];

        // Creating a new comment object with a unique ID and adding it to the subcollection of comments that each post will have
        const newComments = [...comments, { id: doc(collection(db, "posts", postId, "comments")).id, postId, uid: userInfo.uid, username: userInfo.username, comment, createdAt: new Date().toISOString() }];

        // Update post with new comments array
        await this.updatePost(postId, { comments: newComments });
    },

    async deleteComment(postId: string, commentId: string): Promise<void> {
        const post = await this.getPost(postId);
        if (!post) throw new Error("Post not found");

        // Setting up the comments array and removing the comment with the given ID
        const comments = post.comments || [];
        const newComments = comments.filter(comment => comment.id !== commentId);

        // Removing the comment from the subcollection
        await deleteDoc(doc(db, "posts", postId, "comments", commentId));

        // Update post with new comments array
        await this.updatePost(postId, { comments: newComments });
    }
};