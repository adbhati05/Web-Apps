import './Comment.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { useState, useEffect, useRef } from 'react';
import { postService } from '../services/post.service';
import { BsHeart, BsHeartFill, BsList } from 'react-icons/bs';
import type { Comment as CommentData } from '../types';

// The Comment interface from types.ts is renamed to CommentData on import above, since this component already takes the name Comment.

// This component is a single comment row inside the post overlay. PostOverlay handles fetching the list and adding/editing/removing comments; this handles one comment's own like state, its menu, and its edit mode.
// Similar with posting, this is essentially a skeleton for a comment that PostOverlay fills in with the data it fetched and the callbacks it provides for editing/deleting.
interface CommentProps {
    postId: string,
    comment: CommentData,
    initiallyLiked: boolean, // Whether the signed-in user already has a doc in this comment's likes subcollection (looked up by PostOverlay).
    currentUserId?: string,
    canEdit: boolean, // True only for the comment's author, matching what the security rules permit.
    canDelete: boolean, // True when the signed-in user wrote this comment or owns the post, matching what the security rules permit.
    onEdit: (commentId: string, comment: string) => Promise<void>, // Async so this component knows when the save went through and can leave edit mode.
    onDelete: (commentId: string) => void,
}

// Turns an ISO timestamp into the short age shown under the comment ("15 days", "3 hours", and so on).
const formatAge = (dateStr: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

    // Each entry is a unit label and how many seconds one of that unit is worth, checked from largest to smallest.
    const units: [string, number][] = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60]
    ];

    for (const [label, unitSeconds] of units) {
        const count = Math.floor(seconds / unitSeconds);
        if (count >= 1) return `${count} ${label}${count === 1 ? '' : 's'}`;
    }

    return 'Just now';
};

const Comment = ({ postId, comment, initiallyLiked, currentUserId, canEdit, canDelete, onEdit, onDelete }: CommentProps) => {

    const [liked, setLiked] = useState(initiallyLiked);

    // Older comments were written before likeCount existed, so fall back to 0 rather than rendering undefined.
    const [likeCount, setLikeCount] = useState(comment.likeCount ?? 0);

    const [menuOpen, setMenuOpen] = useState(false);

    // Edit mode keeps its own draft so cancelling throws the changes away without touching the real comment.
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comment.comment);
    const [saving, setSaving] = useState(false);

    // A ref to the menu's wrapper div, used below to tell whether a click landed inside or outside the menu.
    const menuRef = useRef<HTMLDivElement>(null);

    // Closes the menu when the user clicks anywhere outside it. The listener only exists while the menu is open (via the dependency array) and is removed by the cleanup, so it never runs when there's nothing to close.
    useEffect(() => {
        if (!menuOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    // Same optimistic update as the post like button in PostCard: flip the UI right away, then reconcile with whatever the server says the new state actually is.
    const handleLike = async () => {
        if (!currentUserId) return;

        const isLiked = liked;
        setLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

        try {
            const nowLiked = await postService.toggleCommentLike(postId, comment.id, currentUserId);
            if (nowLiked !== !isLiked) {
                setLiked(nowLiked);
                setLikeCount(prev => nowLiked ? prev + 1 : prev - 1);
            }
        } catch (error) {
            console.error("Failed to toggle comment like:", error);

            // Upon error, rollback both optimistic updates.
            setLiked(isLiked);
            setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
        }
    };
    
    const startEditing = () => {
        setDraft(comment.comment);
        setEditing(true);
        setMenuOpen(false);
    };

    const cancelEditing = () => {
        setEditing(false);
        setDraft(comment.comment);
    };

    const handleSave = async () => {
        const text = draft.trim();

        // Nothing to save if the box is empty, or if the text hasn't actually changed.
        if (!text || text === comment.comment || saving) return;

        setSaving(true);
        try {
            await onEdit(comment.id, text);
            setEditing(false);
        } catch (error) {
            // Staying in edit mode on failure so the draft isn't lost.
            console.error("Failed to edit comment:", error);
        }
        setSaving(false);
    };

    // Enter saves and Escape cancels. stopPropagation on Escape keeps it from also reaching the overlay's own Escape listener, which would close the whole overlay.
    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            e.stopPropagation();
            cancelEditing();
        }
    };

    return (
        <div className='comment-row'>
            <img src={pfp_placeholder} alt="Profile" className='comment-pfp' />

            <div className='comment-body'>
                <div className='comment-header'>
                    <p className='comment-username'>{comment.username}</p>
                    <div className='comment-actions'>
                        <button className='comment-like-button' onClick={handleLike}>
                            {liked ? <BsHeartFill className='comment-like-button-liked' /> : <BsHeart />}
                        </button>

                        {/* The menu only renders for people the rules would actually let do something, and each item inside it is gated the same way. */}
                        {/* For instance, the post owner can delete any comment, but can't edit any of them except their own. While commenters can edit AND delete their own comments, but not anyone else's. */}
                        {(canEdit || canDelete) && (
                            <div className='comment-menu-container' ref={menuRef}>
                                <button className='comment-menu-button' onClick={() => setMenuOpen(prev => !prev)}>
                                    <BsList />
                                </button>
                                {menuOpen && (
                                    <div className='comment-menu'>
                                        {canEdit && (
                                            <button className='comment-menu-item' onClick={startEditing}>Edit</button>
                                        )}
                                        {canDelete && (
                                            <button className='comment-menu-item comment-menu-item-danger' onClick={() => { setMenuOpen(false); onDelete(comment.id); }}>Delete</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {editing ? (
                    <div className='comment-edit-container'>
                        <input
                            className='comment-edit-input'
                            type="text"
                            value={draft}
                            maxLength={500} // Same cap the security rules enforce.
                            autoFocus
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                        />
                        <div className='comment-edit-actions'>
                            <button className='comment-edit-button' onClick={cancelEditing} disabled={saving}>Cancel</button>
                            <button className='comment-edit-button comment-edit-button-save' onClick={handleSave} disabled={!draft.trim() || draft.trim() === comment.comment || saving}>Save</button>
                        </div>
                    </div>
                ) : (
                    <p className='comment-text'>{comment.comment}</p>
                )}

                {/* Age of the comment, an edited marker if it has one, and its like count, with dividers only appearing between items that are actually shown. */}
                <div className='comment-meta'>
                    <span>{formatAge(comment.createdAt)}</span>
                    {comment.editedAt && <span className='comment-meta-divider'>|</span>}
                    {comment.editedAt && <span>edited</span>}
                    {likeCount > 0 && <span className='comment-meta-divider'>|</span>}
                    {likeCount > 0 && <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
                </div>
            </div>
        </div>
    );
};

export default Comment;
