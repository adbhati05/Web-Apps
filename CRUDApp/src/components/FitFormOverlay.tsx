import './FitFormOverlay.css';
import { useState } from 'react';
import { BsPlus, BsX } from 'react-icons/bs';
import Modal from './Modal';
import { FIT_SECTIONS, FIT_SECTION_MAX, FIT_NAME_MAX, emptySections } from '../services/fit.service';
import { copyPiece } from '../utils/pieces';
import type { ArchivedPiece, Fit, FitPiece, FitSection } from '../types';

// This component is the overlay for planning a fit, opened from the big plus button on the style board (to add a new fit) or by clicking a fit on the board (to edit it).
// It has an optional name and one section for each part of an outfit (Headwear, Tops, Bottoms, Footwear, Accessories). Each section's Add button opens a list of the pieces in your archive to pick from.
// The style board page does the actual saving and deleting through the callbacks, and closes the overlay once they're done.
interface FitFormOverlayProps {
    archive: ArchivedPiece[],
    fit?: Fit, // The fit being edited. Not passed when planning a new one.
    defaultLabel: string, // What the fit is called without a name ("Fit #3"), shown as the name field's placeholder.
    onClose: () => void,
    onSave: (name: string, sections: Fit['sections']) => Promise<void>, // Async so the form knows when the save went through and can stay open if it didn't.
    onDelete?: () => Promise<void>, // Only for an existing fit.
}

const FitFormOverlay = ({ archive, fit, defaultLabel, onClose, onSave, onDelete }: FitFormOverlayProps) => {
    // Drafts of the name and sections, so nothing on the board changes until Save. Editing starts from the fit's current pieces.
    const [name, setName] = useState(fit?.name ?? '');
    const [sections, setSections] = useState<Fit['sections']>(fit ? { ...emptySections(), ...fit.sections } : emptySections());

    // Which section's piece picker is open, if any. Only one at a time, so the form doesn't get crowded.
    const [pickerSection, setPickerSection] = useState<FitSection | null>(null);

    const [saving, setSaving] = useState(false);

    // Deleting takes two clicks: the first turns the button into "Confirm delete", same idea as the account deletion confirmation.
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const totalPieces = FIT_SECTIONS.reduce((total, { key }) => total + sections[key].length, 0);

    // Adds an archived piece to a section as its own copy (see FitPiece), so the fit keeps it even if it's later removed from the archive.
    const addPiece = (section: FitSection, archived: ArchivedPiece) => {
        const fitPiece: FitPiece = {
            archiveId: archived.id,
            ...copyPiece(archived, archived.hasDetails),
            hasDetails: archived.hasDetails,
            fromUsername: archived.fromUsername
        };
        setSections(prev => ({ ...prev, [section]: [...prev[section], fitPiece] }));

        // Closing the picker once the section is full, since nothing more can go in it.
        if (sections[section].length + 1 >= FIT_SECTION_MAX) setPickerSection(null);
    };

    const removePiece = (section: FitSection, index: number) => {
        setSections(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
    };

    const handleSave = async () => {
        // A fit needs at least one piece, and saving twice in a row is ignored.
        if (totalPieces === 0 || saving) return;

        setSaving(true);
        try {
            await onSave(name.trim(), sections);
            onClose();
        } catch {
            // The page already showed an error alert, so the form just stays open with the drafts intact.
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete || saving) return;
        if (!confirmingDelete) {
            setConfirmingDelete(true);
            return;
        }

        setSaving(true);
        try {
            await onDelete();
            onClose();
        } catch {
            setSaving(false);
            setConfirmingDelete(false);
        }
    };

    return (
        <Modal
            title={fit ? `Edit ${fit.name || defaultLabel}` : 'Plan a fit'}
            onClose={onClose}
            // No Cancel button: the Modal's X (or Escape, or clicking outside) closes it without saving.
            footer={
                <>
                    {onDelete && (
                        <button className='modal-button modal-button-danger modal-button-left' onClick={handleDelete} disabled={saving}>
                            {confirmingDelete ? 'Confirm delete' : 'Delete fit'}
                        </button>
                    )}
                    <button className='modal-button modal-button-primary' onClick={handleSave} disabled={totalPieces === 0 || saving}>
                        {saving ? 'Saving...' : fit ? 'Save changes' : 'Add to board'}
                    </button>
                </>
            }
        >
            <div className='fit-form'>
                <div className='fit-form-field'>
                    <label htmlFor="fit-form-name" className='fit-form-label'>Name <span className='fit-form-optional'>(optional)</span></label>
                    <input
                        id="fit-form-name"
                        className='fit-form-input'
                        type="text"
                        placeholder={defaultLabel}
                        value={name}
                        maxLength={FIT_NAME_MAX}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {archive.length === 0 && (
                    <p className='fit-form-hint'>Your archive is empty. Favorite pieces from posts on the feed, or add your own from the Archive, to start planning fits.</p>
                )}

                {FIT_SECTIONS.map(({ key, label }) => {
                    // The picker only lists pieces that aren't already in this section.
                    const usedIds = new Set(sections[key].map(piece => piece.archiveId));
                    const available = archive.filter(piece => !usedIds.has(piece.id));
                    const full = sections[key].length >= FIT_SECTION_MAX;

                    return (
                        <div key={key} className='fit-form-section'>
                            <div className='fit-form-section-header'>
                                <span className='fit-form-label'>{label}</span>
                                <button
                                    className='fit-form-add-button'
                                    onClick={() => setPickerSection(prev => (prev === key ? null : key))}
                                    disabled={archive.length === 0 || full}
                                    aria-expanded={pickerSection === key}
                                >
                                    <BsPlus />
                                    {pickerSection === key ? 'Done' : 'Add'}
                                </button>
                            </div>

                            {/* The pieces picked for this section, each with an X to take it back out. */}
                            {sections[key].length > 0 ? (
                                <div className='fit-form-chips'>
                                    {sections[key].map((piece, index) => (
                                        <span key={`${piece.archiveId}-${index}`} className='fit-form-chip'>
                                            <span className='fit-form-chip-name'>{piece.name}</span>
                                            <button className='fit-form-chip-remove' onClick={() => removePiece(key, index)} aria-label={`Remove ${piece.name}`}>
                                                <BsX />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className='fit-form-empty'>Nothing yet</p>
                            )}

                            {/* The archive pieces to pick from, shown under the section while its Add button is toggled on. */}
                            {pickerSection === key && (
                                <div className='fit-form-picker'>
                                    {available.length === 0 ? (
                                        <p className='fit-form-empty'>Every piece in your archive is already in {label.toLowerCase()}.</p>
                                    ) : (
                                        available.map(piece => (
                                            <button key={piece.id} className='fit-form-picker-item' onClick={() => addPiece(key, piece)}>
                                                <span className='fit-form-picker-name'>{piece.name}</span>
                                                <span className='fit-form-picker-from'>{piece.source === 'own' ? 'Your piece' : `from ${piece.fromUsername}`}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};

export default FitFormOverlay;
