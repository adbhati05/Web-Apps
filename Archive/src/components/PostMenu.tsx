import './PostMenu.css';
import { useState, useEffect, useRef } from 'react';
import { BsList } from 'react-icons/bs';
import Modal from './Modal';
import EditPostOverlay from './EditPostOverlay';
import { postService } from '../services/post.service';
import { useAlert } from '../alerts/AlertContext';
import { logError } from '../utils/logger';
import type { Post, PieceDetail } from '../types';

// This component is the menu on your own posts, with Edit and Delete. It shows up next to the date on post cards in the feed and next to the X in the post overlay, as three lines in both (same icon as the comment menu).
// It handles everything behind those two options itself: the Edit post form (EditPostOverlay), the delete confirmation, and the service calls.
// The feed and the profile grid hear about the change through postService.subscribeToPostChanges, so whoever renders this only needs onUpdated/onDeleted for their own copy of the post (the overlay, for instance).
// Whoever renders it is in charge of only showing it on the signed-in user's own posts, since the rules would reject anyone else's edit or delete anyway.
interface PostMenuProps {
    post: Post,
    onUpdated?: (post: Post) => void, // Runs after a successful edit, with the updated post.
    onDeleted?: () => void, // Runs after a successful delete (the overlay closes itself here, since its post is gone).
}

const PostMenu = ({ post, onUpdated, onDeleted }: PostMenuProps) => {
    const { showAlert } = useAlert();

    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // A ref to the button and its menu, used below to tell whether a click landed inside or outside the menu.
    const menuRef = useRef<HTMLDivElement>(null);

    // Closes the menu when the user clicks anywhere outside it, same approach as the Comment and PieceItem menus.
    useEffect(() => {
        if (!menuOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    // Saving goes through here rather than inside EditPostOverlay, same split as the style board's overlays. It rethrows on failure so the form knows to stay open with the edits still in it.
    const handleSave = async (caption: string, pieces: PieceDetail[], hasDetails: boolean) => {
        try {
            const updatedPost = await postService.updatePost(post, { caption, pieces, hasDetails });
            onUpdated?.(updatedPost);
            showAlert('success', "Post updated.");
        } catch (error) {
            logError("Failed to update post:", error, { postId: post.id });
            showAlert('error', "Couldn't save your changes. Try again.");
            throw error;
        }
    };

    const handleDelete = async () => {
        // Guarding against a double click on Delete while the first one is still going.
        if (deleting) return;

        setDeleting(true);
        try {
            await postService.deletePost(post);
            showAlert('success', "Post deleted.");

            // The post is gone, so whatever showed it (the card, the overlay) is about to unmount along with this menu. That's why there's no setDeleting(false) on this path.
            setConfirmingDelete(false);
            onDeleted?.();
        } catch (error) {
            logError("Failed to delete post:", error, { postId: post.id });
            showAlert('error', "Couldn't delete your post. Try again.");
            setDeleting(false);
        }
    };

    // The confirmation can't be dismissed while the delete is mid-flight, so it doesn't vanish before the result comes back.
    const closeConfirmation = () => {
        if (!deleting) setConfirmingDelete(false);
    };

    return (
        <div className='post-menu-container' ref={menuRef}>
            <button className='post-menu-button' onClick={() => setMenuOpen(prev => !prev)} aria-label="Post options" aria-haspopup="menu" aria-expanded={menuOpen}>
                <BsList />
            </button>

            {/* Each option closes the menu before opening its modal, so the menu never stays open behind it. */}
            {menuOpen && (
                <div className='post-menu' role="menu">
                    <button role="menuitem" className='post-menu-item' onClick={() => { setMenuOpen(false); setEditing(true); }}>Edit</button>
                    <button role="menuitem" className='post-menu-item post-menu-item-danger' onClick={() => { setMenuOpen(false); setConfirmingDelete(true); }}>Delete</button>
                </div>
            )}

            {editing && (
                <EditPostOverlay post={post} onClose={() => setEditing(false)} onSave={handleSave} />
            )}

            {/* A confirmation modal (see Modal conventions in CLAUDE.md): no X, just Cancel and Delete. Escape and clicking outside still act as Cancel. */}
            {confirmingDelete && (
                <Modal
                    title="Delete this post?"
                    onClose={closeConfirmation}
                    size="sm"
                    showCloseButton={false}
                    footer={
                        <>
                            <button className='modal-button' onClick={closeConfirmation} disabled={deleting}>Cancel</button>
                            <button className='modal-button modal-button-danger' onClick={handleDelete} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </>
                    }
                >
                    <p className='modal-confirm-text'>Your post, its likes, and its comments will be removed. This can't be undone.</p>
                </Modal>
            )}
        </div>
    );
};

export default PostMenu;
