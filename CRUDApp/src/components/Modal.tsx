import './Modal.css';
import { useEffect } from 'react';
import { BsXCircle } from 'react-icons/bs';

// This component is the frame shared by the style board's overlays (adding your own piece, and planning a fit): a dimmed backdrop with a card in the middle, a title, and a close button.
// It handles the same things PostOverlay does for itself: Escape and clicking the backdrop close it, and the page behind it can't scroll while it's open.
interface ModalProps {
    title: string,
    onClose: () => void,
    children: React.ReactNode,
    footer?: React.ReactNode, // Buttons pinned to the bottom of the card (Cancel/Save, for instance), so they stay in view while the content scrolls.
}

const Modal = ({ title, onClose, children, footer }: ModalProps) => {

    // Closing on Escape and locking the page's scroll while open. The cleanup undoes both when the modal closes, same as PostOverlay.
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

    return (
        // Clicking the backdrop closes the modal. stopPropagation on the card keeps clicks inside it from bubbling up to the backdrop.
        <div className='modal-backdrop' onClick={onClose}>
            <div className='modal-card' role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
                <div className='modal-header'>
                    <h2 className='modal-title'>{title}</h2>
                    <button className='modal-close-button' onClick={onClose} aria-label="Close">
                        <BsXCircle />
                    </button>
                </div>

                {/* Only the content scrolls, so the title and the footer's buttons always stay in view. */}
                <div className='modal-content'>{children}</div>

                {footer && <div className='modal-footer'>{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;
