import './Modal.css';
import { useEffect, useRef } from 'react';
import { BsXCircle } from 'react-icons/bs';

// This component is the frame shared by the style board's overlays (adding your own piece, and planning a fit): a dimmed backdrop with a card in the middle, a title, and a close button.
// It handles the same things PostOverlay does for itself: Escape and clicking the backdrop close it, and the page behind it can't scroll while it's open.
interface ModalProps {
    title: string,
    onClose: () => void,
    children: React.ReactNode,
    footer?: React.ReactNode, // Buttons pinned to the bottom of the card (Cancel/Save, for instance), so they stay in view while the content scrolls.
    size?: 'md' | 'sm' | 'lg', // 'sm' is a narrower card for short confirmations (like deleting a fit), 'lg' a wider one for side-by-side layouts (the photo next to the form in Edit post). Defaults to 'md'.
    showCloseButton?: boolean, // The X in the header. Defaults to true; confirmations turn it off since their Cancel button already does the same thing. Escape and clicking outside still close either way.
}

// Every open modal, oldest first. A modal can open on top of another (the delete confirmation over the fit form), and Escape should only close the one on top.
const openModals: object[] = [];

// Whether any Modal is open right now. PostOverlay isn't a Modal (it has its own frame and Escape handling), so it checks this to leave Escape to a modal opened over it (Edit post, Delete post) instead of closing itself too.
// eslint-disable-next-line react-refresh/only-export-components
export const isModalOpen = (): boolean => openModals.length > 0;

const Modal = ({ title, onClose, children, footer, size = 'md', showCloseButton = true }: ModalProps) => {
    // A stable identity for this modal in openModals.
    const modalId = useRef({});


    // Registering this modal as the top one while it's open.
    useEffect(() => {
        const id = modalId.current;
        openModals.push(id);
        return () => {
            openModals.splice(openModals.indexOf(id), 1);
        };
    }, []);

    // Closing on Escape (only if this is the modal on top) and locking the page's scroll while open. The cleanup undoes both when the modal closes, same as PostOverlay.
    // The scroll lock restores whatever was there before, so closing a modal stacked on another one doesn't unlock the page while the bottom one is still open.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && openModals[openModals.length - 1] === modalId.current) onClose();
        };

        const previousOverflow = document.body.style.overflow;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    return (
        // Clicking the backdrop closes the modal. stopPropagation on the card keeps clicks inside it from bubbling up to the backdrop.
        <div className='modal-backdrop' onClick={onClose}>
            <div className={`modal-card${size !== 'md' ? ` modal-card-${size}` : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
                <div className='modal-header'>
                    <h2 className='modal-title'>{title}</h2>
                    {showCloseButton && (
                        <button className='modal-close-button' onClick={onClose} aria-label="Close">
                            <BsXCircle />
                        </button>
                    )}
                </div>

                {/* Only the content scrolls, so the title and the footer's buttons always stay in view. */}
                <div className='modal-content'>{children}</div>

                {footer && <div className='modal-footer'>{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;
