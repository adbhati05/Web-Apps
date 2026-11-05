import './PostFeed.css';
import PostCard from './PostCard';
import LoadingSpinner from './LoadingSpinner';
import { postService } from '../services/post.service';
import { profileService } from '../services/profile.service';
import { archiveService } from '../services/archive.service';
import { useAlert } from '../alerts/AlertContext';
import { auth } from '../firebase';
import { useState, useEffect } from 'react';
import type { Post, UserInfo } from '../types';

// This component fetches all posts from the database and displays them in the feed.
// onPieceCommentClick is the Comment option in a piece's menu: it opens the post overlay like onCommentClick does, but with that piece attached to the comment box.
interface PostFeedProps {
    onCommentClick: (post: Post) => void,
    onPieceCommentClick?: (post: Post, pieceIndex: number) => void,
}

const PostFeed = ({ onCommentClick, onPieceCommentClick }: PostFeedProps) => {
    // Setting up a posts object that will hold all the posts from the Firestore collection and then be used to render each PostCard component.
    const [posts, setPosts] = useState<Post[]>([]);

    // Tracks which of the fetched posts the current user has liked (post ID -> liked?). Likes live in
    // each post's likes subcollection now, so this is looked up per post instead of read off the post doc.
    const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

    // Each post's author profile (UID -> profile). Posts only store the author's uid and username, so this is where the profile picture and the link to their profile come from.
    const [authors, setAuthors] = useState<Record<string, UserInfo>>({});

    const { showAlert } = useAlert();

    // Setting up state variables for loading and error. error is a simple flag, since what went wrong only matters for the console (the user just sees "Couldn't load posts").
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

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

                // getProfilesByUids never throws (failed lookups are just skipped), so a missing profile only means that card falls back to the placeholder picture.
                const postAuthors = await profileService.getProfilesByUids(posts.map(post => post.uid));

                setPosts(posts);
                setLikedByMe(likedFlags);
                setAuthors(postAuthors);
                setLoading(false);
            } catch (error) {
                // Before, a failed fetch looked exactly like an empty feed. Now it's logged and the feed says so.
                console.error("Failed to load posts:", error);
                setError(true);
                setLoading(false);
            }
        };

        fetchPosts();
    }, []);

    // The Favorite option in a piece's menu: copies that piece into the signed-in user's style board archive.
    // The archive shows who the piece is from, so the post author's live username is used when their profile has loaded (same as the card's header), falling back to the one stored on the post.
    const handlePieceFavorite = async (post: Post, pieceIndex: number) => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        try {
            const added = await archiveService.favoritePiece(currentUserId, post, pieceIndex, authors[post.uid]?.username ?? post.username);
            showAlert(added ? 'success' : 'info', added ? "Added to your archive." : "That piece is already in your archive.");
        } catch (error) {
            console.error("Failed to favorite piece:", error);
            showAlert('error', "Couldn't add that piece to your archive. Try again.");
        }
    };

    // Formats a date string into a readable format like "March 14, 2026".
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Loading, error, and empty feeds each get their own message instead of a blank feed.
    if (loading) return <LoadingSpinner label="Loading posts..." />;
    if (error) return <p className="post-feed-message">Couldn't load posts. Try reloading the page.</p>;
    if (posts.length === 0) return <p className="post-feed-message">No posts yet. Be the first to share a fit!</p>;

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
                    author={authors[post.uid]}
                    onCommentClick={() => onCommentClick(post)}
                    onPieceFavorite={(pieceIndex) => handlePieceFavorite(post, pieceIndex)}
                    onPieceComment={onPieceCommentClick && ((pieceIndex) => onPieceCommentClick(post, pieceIndex))}
                />
            ))}
        </div>
    );
}

export default PostFeed;
