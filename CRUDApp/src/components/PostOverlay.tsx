import './PostOverlay.css';
import Comment from './Comment';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { useState, useEffect } from 'react';
import { postService } from '../services/post.service';
import { useUserAuth } from '../auth/UserAuthContext';
import { BsChevronDown, BsHeart, BsXCircle } from 'react-icons/bs';
import type { Post, Comment as CommentData } from '../types';

// TO-DO: The like count in the header is display only for now. Making it clickable means lifting the liked/count state out of PostCard so the card and the overlay can't disagree.

// Formats a date string into a readable format like "March 14, 2026" (same helper as the one in PostFeed).
const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const PostOverlay = ({ post, onClose }: { post: Post; onClose: () => void }) => {

    // The overlay needs the full user profile (not just the UID) since addComment stores the username on the comment doc.
    const { userInfo } = useUserAuth();
    const currentUserId = userInfo?.uid;

    const [comments, setComments] = useState<CommentData[]>([]);

    // Tracks which of the fetched comments the current user has liked (comment ID -> liked?), the same lookup PostFeed does for posts.
    const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});

    const [newComment, setNewComment] = useState('');
    const [posting, setPosting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetching the post's comments, plus (in parallel) whether the signed-in user has already liked each one.
    useEffect(() => {
        const fetchComments = async () => {
            try {
                // Fetch the comments for the post, and if the user is signed in, check which ones they've liked.
                const fetched = await postService.getComments(post.id);

                const likedFlags: Record<string, boolean> = {};
                if (currentUserId) {
                    const flags = await Promise.all(
                        fetched.map(comment => postService.hasLikedComment(post.id, comment.id, currentUserId))
                    );
                    fetched.forEach((comment, index) => { likedFlags[comment.id] = flags[index]; });
                }

                setComments(fetched);
                setLikedByMe(likedFlags);
            } catch (error) {
                console.error("Failed to load comments:", error);
            }
            setLoading(false);
        };

        fetchComments();
    }, [post.id, currentUserId]);

    // Closing on Escape, and locking the page behind the overlay so it can't scroll while the modal is open, this ensures a good user experience.
    // The function returned at the end is the cleanup, which React runs when the overlay unmounts, so neither the listener nor the scroll lock outlives it.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const handleAddComment = async () => {
        const text = newComment.trim();

        // Guarding against empty comments, signed-out users, and double submits from a fast second click.
        if (!text || !userInfo || posting) return;

        setPosting(true);
        try {
            // addComment returns the new comment, so it can be appended straight to the list instead of refetching all of them.
            const comment = await postService.addComment(post.id, text, userInfo);
            setComments(prev => [...prev, comment]);
            setNewComment('');
        } catch (error) {
            console.error("Failed to add comment:", error);
        }
        setPosting(false);
    };

    // Editing and deletion live here rather than in the Comment component, since it's this list that has to update afterwards.
    // This one deliberately doesn't catch, so the Comment component can tell whether the save went through and stay in edit mode if it didn't.
    const handleEditComment = async (commentId: string, text: string) => {
        const editedAt = await postService.editComment(post.id, commentId, text);
        setComments(prev => prev.map(comment => comment.id === commentId ? { ...comment, comment: text, editedAt } : comment));
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await postService.deleteComment(post.id, commentId);
            setComments(prev => prev.filter(comment => comment.id !== commentId));
        } catch (error) {
            console.error("Failed to delete comment:", error);
        }
    };

    return (
        // Clicking the backdrop closes the overlay. stopPropagation on the card keeps clicks inside it from bubbling up to the backdrop and closing it too.
        <div className='post-overlay-backdrop' onClick={onClose}>
            <div className='post-overlay-container' role="dialog" aria-modal="true" aria-label={`Comments on ${post.username}'s post`} onClick={(e) => e.stopPropagation()}>
                <div className='image-container'>
                    <img src={post.imageURL} alt={post.caption} className='post-image' />
                </div>

                <div className='info-container'>
                    {/* This header only appears on smaller screens, where the overlay becomes a comments-only bottom sheet. */}
                    <div className='mobile-comments-header'>
                        <button className='mobile-overlay-close-button' onClick={onClose} aria-label="Close comments">
                            <BsChevronDown />
                        </button>
                        <p>Comments</p>
                    </div>

                    <div className='post-info-header'>
                        <div className='post-info-account'>
                            <img src={pfp_placeholder} alt="Profile" className='post-info-pfp' />
                            <p className='username'>{post.username}</p>
                        </div>
                        <div className='post-overlay-actions'>
                            <button className='overlay-close-button' onClick={onClose} aria-label="Close">
                                <BsXCircle />
                            </button>
                        </div>
                    </div>

                    <div className='post-info-body'>
                        <p className='caption'>{post.caption}</p>

                        <div className='post-info-bottom'>
                            <div className='post-info-actions'>
                                <div className='post-info-likes'>
                                    <BsHeart />
                                    <p>{post.likeCount || 0}</p>
                                </div>
                            </div>
                             <p className='date'>{formatDate(post.createdAt)}</p>
                        </div>
                    </div>

                    <div className='add-comment-container'>
                        <input
                            className='add-comment-input'
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment}
                            maxLength={500} // Matching the cap the security rules enforce, so an over-long comment is stopped here instead of being rejected by the server.
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                        />
                        <button
                            className='add-comment-button'
                            onClick={handleAddComment}
                            disabled={!newComment.trim() || posting}
                        >
                            Post
                        </button>
                    </div>

                    {/* This is the only part of the panel that scrolls, the header and comment box above it stay put. */}
                    <div className='comment-list-container'>
                        {loading ? (
                            <p className='comment-list-message'>Loading comments...</p>
                        ) : comments.length === 0 ? (
                            <p className='comment-list-message'>No comments yet.</p>
                        ) : (
                            comments.map((comment) => (
                                <Comment
                                    key={comment.id}
                                    postId={post.id}
                                    comment={comment}
                                    initiallyLiked={likedByMe[comment.id] || false}
                                    currentUserId={currentUserId}
                                    canEdit={!!currentUserId && currentUserId === comment.uid}
                                    canDelete={!!currentUserId && (currentUserId === comment.uid || currentUserId === post.uid)}
                                    onEdit={handleEditComment}
                                    onDelete={handleDeleteComment}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostOverlay;
