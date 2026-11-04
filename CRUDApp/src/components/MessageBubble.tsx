import './MessageBubble.css';
import { useState, useEffect, useRef } from 'react';
import { BsArrowReturnLeft, BsThreeDots } from 'react-icons/bs';
import type { Message } from '../types';

// This component is a single message inside ChatThread: the bubble itself, the quote above it when it's a reply, the "Edited" label, and the actions that show up when hovering over it.
// Hovering any message shows a reply button. Hovering your OWN messages also shows a 3 dots menu next to it with Edit (only within 15 minutes of sending, same as the rules) and Unsend.
// Similar with Comment, this handles its own menu while ChatThread handles the actual replying/editing/unsending and passes the callbacks down.
interface MessageBubbleProps {
    message: Message,
    mine: boolean, // Yours sit on the right in the accent color, theirs on the left in white.
    avatarURL?: string, // The other person's picture, shown next to each of their messages. Not passed for your own.
    quote: { label: string, text: string | null } | null, // The quote shown above a reply. text is null when the original was unsent. null overall when the message isn't a reply.
    canEdit: boolean, // True only for your own messages that are still inside the 15 minute edit window.
    groupPosition: 'single' | 'first' | 'middle' | 'last', // Where this message sits in a run of back-to-back messages from the same person, which decides which corner of the bubble is pointed.
    highlighted: boolean, // Briefly true after clicking a quote that points at this message, so it's easy to spot.
    onReply: () => void,
    onEdit: () => void,
    onUnsend: () => void,
    onQuoteClick: () => void, // Scrolls to the original message.
}

const MessageBubble = ({ message, mine, avatarURL, quote, groupPosition, canEdit, highlighted, onReply, onEdit, onUnsend, onQuoteClick }: MessageBubbleProps) => {

    const [menuOpen, setMenuOpen] = useState(false);

    // A ref to the menu's wrapper div, used below to tell whether a click landed inside or outside the menu.
    const menuRef = useRef<HTMLDivElement>(null);

    // Closes the menu when the user clicks anywhere outside it (same approach as the Comment menu). The listener only exists while the menu is open and is removed by the cleanup.
    useEffect(() => {
        if (!menuOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    // Each menu option closes the menu before running, so it never stays open over the input bar.
    const handleEdit = () => {
        setMenuOpen(false);
        onEdit();
    };

    const handleUnsend = () => {
        setMenuOpen(false);
        onUnsend();
    };

    return (
        // The id is what a quote scrolls to (see ChatThread's handleQuoteClick).
        <div id={`message-${message.id}`} className={`message-bubble-row${mine ? ' message-bubble-row-mine' : ''}`}>
            {avatarURL && <img src={avatarURL} alt="Profile" className='message-bubble-pfp' />}
            <div className='message-bubble-content'>
                {quote && (
                    <button className='message-bubble-quote' onClick={onQuoteClick} disabled={quote.text === null}>
                        <span className='message-bubble-quote-label'>{quote.label}</span>
                        <span className='message-bubble-quote-text'>{quote.text ?? 'Message unsent'}</span>
                    </button>
                )}
                {/* title shows the exact time when hovering over a bubble. */}
                <div
                    className={`message-bubble ${mine ? 'message-bubble-mine' : 'message-bubble-theirs'} message-bubble-${groupPosition}${highlighted ? ' message-bubble-highlighted' : ''}`}
                    title={new Date(message.createdAt).toLocaleString('en-US')}
                >
                    {message.text}
                </div>
                {message.editedAt && <span className='message-bubble-edited'>Edited</span>}
            </div>

            {/* The actions sit on the side of the bubble facing the middle of the chat. They're hidden until the row is hovered, and stay visible while the menu is open. */}
            <div className={`message-bubble-actions${menuOpen ? ' message-bubble-actions-open' : ''}`}>
                <button className='message-bubble-action-button' onClick={onReply} aria-label="Reply">
                    <BsArrowReturnLeft />
                </button>
                {mine && (
                    <div className='message-bubble-menu-container' ref={menuRef}>
                        <button className='message-bubble-action-button' onClick={() => setMenuOpen(prev => !prev)} aria-label="Message options">
                            <BsThreeDots />
                        </button>
                        {menuOpen && (
                            <div className='message-bubble-menu'>
                                {canEdit && <button className='message-bubble-menu-item' onClick={handleEdit}>Edit</button>}
                                <button className='message-bubble-menu-item message-bubble-menu-item-danger' onClick={handleUnsend}>Unsend</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
