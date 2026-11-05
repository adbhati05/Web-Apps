import './AddPieceOverlay.css';
import { useState } from 'react';
import { BsSquare, BsCheckSquare } from 'react-icons/bs';
import Modal from './Modal';
import type { PieceDetail } from '../types';

// This component is the overlay for adding one of your own pieces to your style board archive, opened from the Add piece button at the top of the archive side bar.
// It works like adding a piece to a post (PostDescription): a name, plus an optional "Include details" checkbox that shows the price, size, materials, and date acquired fields.
// The style board page does the actual saving through onAdd, and closes the overlay once it's done.
interface AddPieceOverlayProps {
    onClose: () => void,
    onAdd: (piece: PieceDetail, hasDetails: boolean) => Promise<void>, // Async so the overlay knows when the save went through and can keep the form if it didn't.
}

// Same cap as the archive rules, for the name and each detail.
const PIECE_FIELD_MAX = 100;

const AddPieceOverlay = ({ onClose, onAdd }: AddPieceOverlayProps) => {
    const [name, setName] = useState('');
    const [detailsEnabled, setDetailsEnabled] = useState(false);
    const [price, setPrice] = useState('');
    const [size, setSize] = useState('');
    const [materials, setMaterials] = useState('');
    const [dateAcquired, setDateAcquired] = useState('');
    const [saving, setSaving] = useState(false);

    const trimmedName = name.trim();

    const handleAdd = async () => {
        // Guarding against an empty name and double submits.
        if (!trimmedName || saving) return;

        setSaving(true);
        try {
            await onAdd({ name: trimmedName, price: price.trim(), size: size.trim(), materials: materials.trim(), dateAcquired: dateAcquired.trim() }, detailsEnabled);
            onClose();
        } catch {
            // The page already showed an error alert, so staying open with the form filled in is all that's left to do here.
            setSaving(false);
        }
    };

    // Each detail field, in the same order and with the same placeholders as the post form.
    const detailFields = [
        { value: price, setValue: setPrice, placeholder: 'Enter price...' },
        { value: size, setValue: setSize, placeholder: 'Enter size...' },
        { value: materials, setValue: setMaterials, placeholder: 'Enter materials...' },
        { value: dateAcquired, setValue: setDateAcquired, placeholder: 'Enter date acquired... (mm/dd/yyyy)' },
    ];

    return (
        <Modal
            title="Add your own piece"
            onClose={onClose}
            // No Cancel button: the Modal's X (or Escape, or clicking outside) closes it.
            footer={
                <button className='modal-button modal-button-primary' onClick={handleAdd} disabled={!trimmedName || saving}>
                    {saving ? 'Adding...' : 'Add to archive'}
                </button>
            }
        >
            <div className='add-piece-overlay-form'>
                <div className='add-piece-overlay-field'>
                    <label htmlFor="add-piece-name" className='add-piece-overlay-label'>Piece name</label>
                    <input
                        id="add-piece-name"
                        className='add-piece-overlay-input'
                        type="text"
                        placeholder="e.g. Black denim jacket"
                        value={name}
                        maxLength={PIECE_FIELD_MAX}
                        autoFocus
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                    />
                </div>

                {/* Same clickable checkbox label as the post form's "Include details about pieces". */}
                <button className='add-piece-overlay-details-toggle' onClick={() => setDetailsEnabled(prev => !prev)} aria-pressed={detailsEnabled}>
                    {detailsEnabled ? <BsCheckSquare /> : <BsSquare />}
                    Include details
                </button>

                {detailsEnabled && (
                    <div className='add-piece-overlay-details'>
                        {detailFields.map(({ value, setValue, placeholder }) => (
                            <input
                                key={placeholder}
                                className='add-piece-overlay-input'
                                type="text"
                                aria-label={placeholder.replace('Enter ', '').replace('...', '')}
                                placeholder={placeholder}
                                value={value}
                                maxLength={PIECE_FIELD_MAX}
                                onChange={(e) => setValue(e.target.value)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AddPieceOverlay;
