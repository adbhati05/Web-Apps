import './PostFeed.css';
import PostCard from './PostCard';
import { postService } from '../services/post.service';
import { useState, useEffect } from 'react';
import type { Post } from '../types';

// For now I'll use placeholders in order to visualize how the card will look since I'm currently working on the post card's aesthetics. 
// Eventually, this component will fetch all posts from the database and display them in the feed.
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

    return (
        <div className="post-feed-container">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    username={post.username}
                    dateCreated={post.createdAt}
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