import './PostFeed.css';
import PostCard from './PostCard';
import { postService } from '../services/post.service';
import { useState, useEffect } from 'react';
import type { Post } from '../types';

// This component fetches all posts from the database and displays them in the feed.
const PostFeed = () => {
    // Setting up a posts object that will hold all the posts from the Firestore collection and then be used to render each PostCard component.
    const [posts, setPosts] = useState<Post[]>([]);

    // Setting up state variables for loading and error.
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Defining and calling an async function to fetch all the posts via getPosts from postService and populate the posts state variable.
        const fetchPosts = async () => {
            try {
                const posts = await postService.getPosts();
                setPosts(posts);
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
                    likes={post.likes || []}
                    comments={post.comments || []}
                    pieces={post.pieces || []}
                    hasDetails={post.hasDetails}
                />
            ))}
        </div>
    );
}

export default PostFeed;