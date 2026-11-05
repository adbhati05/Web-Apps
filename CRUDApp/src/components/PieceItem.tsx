import './PieceItem.css';
import { useState, useEffect, useRef } from 'react';
import { BsChevronDown } from 'react-icons/bs';
import type { PieceDetail } from '../types';

// This component is a single piece of an outfit, shown the same way everywhere pieces appear: on post cards, on comments about a piece, in the style board's archive, and inside planned fits.
// The piece's name is a button that opens a small menu of actions (Favorite and Comment on a post, Remove in the archive, and so on), which whoever uses this component passes in.
// A piece with details (price, size, materials, date acquired) also gets a chevron on the right that expands and collapses them, kept separate from the name so opening the menu and showing the details never get in each other's way.
// It replaces the MUI accordion the post cards used before (which had the "bounce" when expanding), so it's a plain show/hide with no animation to bounce.
export interface PieceAction {
    label: string,
    onClick: () => void,
    danger?: boolean, // Shown in red, for actions like Remove.
}

interface PieceItemProps {
    piece: PieceDetail,
    hasDetails: boolean,
    subtitle?: string, // A smaller line under the name, like who the piece is from in the archive.
    actions?: PieceAction[], // The menu options. Without any, the name is plain text instead of a button.
}

const PieceItem = ({ piece, hasDetails, subtitle, actions }: PieceItemProps) => {

    const [menuOpen, setMenuOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);

    // A ref to the name button and its menu, used below to tell whether a click landed inside or outside the menu.
    const menuRef = useRef<HTMLDivElement>(null);

    // Closes the menu when the user clicks anywhere outside it, same approach as the Comment and MessageBubble menus.
    useEffect(() => {
        if (!menuOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    // Only the details that were actually filled in are listed. A piece that has details turned on but none filled in gets no chevron, since there'd be nothing to show.
    const details = hasDetails ? [
        { label: 'Price', value: piece.price },
        { label: 'Size', value: piece.size },
        { label: 'Materials', value: piece.materials },
        { label: 'Date Acquired', value: piece.dateAcquired },
    ].filter(({ value }) => !!value) : [];

    const hasActions = !!actions && actions.length > 0;

    return (
        <div className={`piece-item${menuOpen ? ' piece-item-menu-open' : ''}`}>
            <div className='piece-item-header'>
                <div className='piece-item-name-container' ref={menuRef}>
                    {hasActions ? (
                        <button className='piece-item-name-button' onClick={() => setMenuOpen(prev => !prev)} aria-haspopup="menu" aria-expanded={menuOpen}>
                            <span className='piece-item-name'>{piece.name}</span>
                            {subtitle && <span className='piece-item-subtitle'>{subtitle}</span>}
                        </button>
                    ) : (
                        <div className='piece-item-name-text'>
                            <span className='piece-item-name'>{piece.name}</span>
                            {subtitle && <span className='piece-item-subtitle'>{subtitle}</span>}
                        </div>
                    )}

                    {/* Each option closes the menu before running, so it never stays open over whatever the option opens (the post overlay, for instance). */}
                    {menuOpen && hasActions && (
                        <div className='piece-item-menu' role="menu">
                            {actions!.map(({ label, onClick, danger }) => (
                                <button
                                    key={label}
                                    role="menuitem"
                                    className={`piece-item-menu-item${danger ? ' piece-item-menu-item-danger' : ''}`}
                                    onClick={() => { setMenuOpen(false); onClick(); }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {details.length > 0 && (
                    <button
                        className={`piece-item-expand-button${expanded ? ' piece-item-expand-button-open' : ''}`}
                        onClick={() => setExpanded(prev => !prev)}
                        aria-expanded={expanded}
                        aria-label={expanded ? 'Hide details' : 'Show details'}
                    >
                        <BsChevronDown />
                    </button>
                )}
            </div>

            {expanded && (
                <ul className='piece-item-detail-list'>
                    {details.map(({ label, value }) => (
                        <li key={label}><span>{label}</span><span>{value}</span></li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PieceItem;
