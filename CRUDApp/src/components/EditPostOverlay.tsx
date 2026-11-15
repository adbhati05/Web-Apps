import './EditPostOverlay.css';
import { useState } from 'react';
import { BsSquare, BsCheckSquare, BsDashCircle } from 'react-icons/bs';
import Modal from './Modal';
import type { Post, PieceDetail } from '../types';
import { CAPTION_MAX, PIECES_MAX, PIECE_FIELD_MAX } from '../utils/limits';

// This component is the overlay for editing one of your own posts, opened from the Edit option in the post's menu (PostMenu).
// It has the same fields as creating a post (PostDescription): the caption, the pieces, and the "Include details" checkbox. The photo can't be changed here, only what's written about it.
// The layout follows editing a post on Instagram's web app: the photo on the left, and on the right the caption at the top with the pieces under it. On mobile the two stack, photo first.
// PostMenu does the actual saving through onSave, and closes the overlay once it's done.
interface EditPostOverlayProps {
    post: Post,
    onClose: () => void,
    onSave: (caption: string, pieces: PieceDetail[], hasDetails: boolean) => Promise<void>, // Async so the overlay knows when the save went through and can keep the form if it didn't.
}

// A blank piece, with all five fields so it has the same shape as the pieces PostDescription saves (empty strings for details that weren't filled in).
const emptyPiece = (): PieceDetail => ({ name: '', price: '', size: '', materials: '', dateAcquired: '' });

// The details are optional on PieceDetail (older pieces can be missing them), so this trims one and treats a missing one as empty.
const trimmed = (value?: string): string => (value ?? '').trim();

// Each detail field, in the same order and with the same placeholders as the post form.
const detailFields: { key: 'price' | 'size' | 'materials' | 'dateAcquired', placeholder: string }[] = [
    { key: 'price', placeholder: 'Enter price...' },
    { key: 'size', placeholder: 'Enter size...' },
    { key: 'materials', placeholder: 'Enter materials...' },
    { key: 'dateAcquired', placeholder: 'Enter date acquired... (mm/dd/yyyy)' },
];

const EditPostOverlay = ({ post, onClose, onSave }: EditPostOverlayProps) => {
    // The form starts filled in with the post as it is now. Older pieces might be missing some detail fields, so each one is spread over a blank piece to fill those in with empty strings.
    const [caption, setCaption] = useState(post.caption);
    const [pieces, setPieces] = useState<PieceDetail[]>(() => (post.pieces || []).map(piece => ({ ...emptyPiece(), ...piece })));
    const [detailsEnabled, setDetailsEnabled] = useState(post.hasDetails);
    const [saving, setSaving] = useState(false);

    // Same requirements as creating a post: a caption, and a name for every piece. Save stays disabled until both are met.
    const canSave = !!caption.trim() && pieces.every(piece => piece.name.trim()) && !saving;

    // Changes one field of one piece. A new array (and a new piece object) is made instead of editing the old one, so React sees the change and re-renders.
    const handlePieceChange = (pieceIndex: number, field: keyof PieceDetail, value: string) => {
        setPieces(prev => prev.map((piece, index) => index === pieceIndex ? { ...piece, [field]: value } : piece));
    };

    // Unlike the post form (which only removes the last piece), any piece can be removed here, since the pieces are already filled in and the one to remove might be in the middle.
    const handleRemovePiece = (pieceIndex: number) => {
        setPieces(prev => prev.filter((_, index) => index !== pieceIndex));
    };

    const handleSave = async () => {
        if (!canSave) return;

        setSaving(true);
        try {
            // With details turned off, the details are cleared (same as unchecking the box on the post form), so they don't come back if details are turned on again later.
            const cleanedPieces = pieces.map(piece => detailsEnabled
                ? { name: piece.name.trim(), price: trimmed(piece.price), size: trimmed(piece.size), materials: trimmed(piece.materials), dateAcquired: trimmed(piece.dateAcquired) }
                : { ...emptyPiece(), name: piece.name.trim() });

            await onSave(caption.trim(), cleanedPieces, detailsEnabled);
            onClose();
        } catch {
            // PostMenu already showed an error alert, so staying open with the edits still in the form is all that's left to do here.
            setSaving(false);
        }
    };

    return (
        <Modal
            title="Edit post"
            onClose={onClose}
            size="lg" // The wider card, so the photo and the form fit side by side.
            // No Cancel button: the Modal's X (or Escape, or clicking outside) closes it without saving.
            footer={
                <button className='modal-button modal-button-primary' onClick={handleSave} disabled={!canSave}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
            }
        >
            <div className='edit-post-overlay-layout'>
                {/* The photo on the left (it can't be edited, it's there so it's clear which post this is). It stays in view while the form next to it scrolls. */}
                <div className='edit-post-overlay-image-container'>
                    <img src={post.imageURL} alt="Post" className='edit-post-overlay-image' />
                </div>

                {/* The form on the right: the caption at the top, then the pieces. */}
                <div className='edit-post-overlay-form'>
                    <div className='edit-post-overlay-field'>
                        <label htmlFor="edit-post-caption" className='edit-post-overlay-label'>Caption</label>
                        <textarea
                            id="edit-post-caption"
                            className='edit-post-overlay-input edit-post-overlay-caption'
                            placeholder="Write a caption..."
                            value={caption}
                            maxLength={CAPTION_MAX} // Same cap as the rules (see src/utils/limits.ts).
                            rows={5}
                            onChange={(e) => setCaption(e.target.value)}
                        />
                    </div>

                    <div className='edit-post-overlay-pieces-header'>
                        <p className='edit-post-overlay-label'>Pieces</p>
                        {/* Same clickable checkbox label as the post form's "Include details about pieces". */}
                        <button className='edit-post-overlay-details-toggle' onClick={() => setDetailsEnabled(prev => !prev)} aria-pressed={detailsEnabled}>
                            {detailsEnabled ? <BsCheckSquare /> : <BsSquare />}
                            Include details
                        </button>
                    </div>

                    {pieces.map((piece, index) => (
                        // Pieces have no ID of their own, so the index is the key, same as on the post form.
                        <div key={index} className='edit-post-overlay-piece'>
                            <div className='edit-post-overlay-piece-name'>
                                <input
                                    className='edit-post-overlay-input'
                                    type="text"
                                    aria-label={`Piece ${index + 1} name`}
                                    placeholder={`Enter piece ${index + 1} name...`}
                                    value={piece.name}
                                    maxLength={PIECE_FIELD_MAX}
                                    onChange={(e) => handlePieceChange(index, 'name', e.target.value)}
                                />
                                <button className='edit-post-overlay-remove-piece' onClick={() => handleRemovePiece(index)} aria-label={`Remove piece ${index + 1}`}>
                                    <BsDashCircle />
                                </button>
                            </div>

                            {detailsEnabled && (
                                <div className='edit-post-overlay-details'>
                                    {detailFields.map(({ key, placeholder }) => (
                                        <input
                                            key={key}
                                            className='edit-post-overlay-input'
                                            type="text"
                                            aria-label={placeholder.replace('Enter ', '').replace('...', '')}
                                            placeholder={placeholder}
                                            value={piece[key] ?? ''}
                                            maxLength={PIECE_FIELD_MAX}
                                            onChange={(e) => handlePieceChange(index, key, e.target.value)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Hidden once the post has the most pieces the rules allow. */}
                    {pieces.length < PIECES_MAX && (
                        <button className='modal-button edit-post-overlay-add-piece' onClick={() => setPieces(prev => [...prev, emptyPiece()])}>
                            Add piece
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default EditPostOverlay;
