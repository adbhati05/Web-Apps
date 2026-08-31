import './PostFeed.css';
import PostCard from './PostCard';
import { postService } from '../services/post.service';
import { auth } from '../firebase';
import { useState, useEffect } from 'react';
import type { Post } from '../types';

// This component fetches all posts from the database and displays them in the feed.
const PostFeed = ({ onCommentClick }: { onCommentClick: (post: Post) => void }) => {
    // Setting up a posts object that will hold all the posts from the Firestore collection and then be used to render each PostCard component.
    const [posts, setPosts] = useState<Post[]>([]);

    // Tracks which of the fetched posts the current user has liked (post ID -> liked?). Likes live in
    // each post's likes subcollection now, so this is looked up per post instead of read off the post doc.
    const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

    // Setting up state variables for loading and error.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Defining and calling an async function to fetch all the posts via getPosts from postService and populate the posts state variable.
        const fetchPosts = async () => {
            try {
                const posts = await postService.getPosts();

                // For each post, check (in parallel) whether the current user has a doc in its likes subcollection. 
                // TO-DO: once pagination exists, a single collection-group query on likes (where uid == mine) could replace these per-post reads.
                const currentUserId = auth.currentUser?.uid;
                const likedFlags: Record<string, boolean> = {};
                if (currentUserId) {
                    const flags = await Promise.all(
                        posts.map(post => postService.hasLiked(post.id, currentUserId))
                    );
                    posts.forEach((post, index) => { likedFlags[post.id] = flags[index]; });
                }

                setPosts(posts);
                setLikedByMe(likedFlags);
                setLoading(false);
            } catch (error) {
                setError(error as string);
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    // Formats a date string into a readable format like "March 14, 2026".
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="post-feed-container">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    postId={post.id}
                    username={post.username}
                    dateCreated={formatDate(post.createdAt)}
                    caption={post.caption}
                    imageURL={post.imageURL}
                    likeCount={post.likeCount || 0}
                    initiallyLiked={likedByMe[post.id] || false}
                    pieces={post.pieces || []}
                    hasDetails={post.hasDetails}
                    onCommentClick={() => onCommentClick(post)}
                />
            ))}
        </div>
    );
}

export default PostFeed;
