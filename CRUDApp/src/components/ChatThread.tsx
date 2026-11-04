import './ChatThread.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BsChevronLeft, BsX } from 'react-icons/bs';
import MessageBubble from './MessageBubble';
import LoadingSpinner from './LoadingSpinner';
import { useAlert } from '../alerts/AlertContext';
import { chatService, EDIT_WINDOW_MS } from '../services/chat.service';
import type { Chat, Message, UserInfo } from '../types';

// TO-DO: "Typing..." indicator with an animation while the other person is typing (see the to-do list).

// This component is the open chat in the middle of the Chat page: a header with who you're talking to, the messages (each one a MessageBubble), and the input to send a new one.
// Timestamps show up as small centered labels whenever there's a gap in the conversation, and a "Seen"/"Sent" label sits under your latest message.
// It also handles what the message actions start: replying (a "Replying to" bar above the input), editing (the input fills with the message and Send becomes Save), and unsending.
interface ChatThreadProps {
    myUid: string,
    otherProfile: UserInfo,
    chat: Chat | undefined, // undefined until the first message is sent, since that's when the chat doc gets created.
}

// Same cap as the rules (1-1000 characters), so the input stops the user before the server would reject the message.
const MESSAGE_MAX = 1000;

// How long a pause between two messages has to be before a new timestamp label is shown above the second one.
const TIME_GAP_MS = 30 * 60 * 1000;

// How long the original message glows after jumping to it from a reply's quote.
const HIGHLIGHT_MS = 1500;

// Formats the timestamp labels between messages: just the time for today, the weekday and time for the last week, otherwise the full date and time.
const formatTimeLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const daysAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (date.toDateString() === now.toDateString()) return time;
    if (daysAgo < 7) return `${date.toLocaleDateString('en-US', { weekday: 'long' })} ${time}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
};

const ChatThread = ({ myUid, otherProfile, chat }: ChatThreadProps) => {
    const chatId = chatService.getChatId(myUid, otherProfile.uid);

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);

    // Failed sends, edits, and unsends are reported as alerts (see AlertContext).
    const { showAlert } = useAlert();

    // At most one of these is set at a time: the message being replied to, or your own message being edited. Either one shows a bar above the input saying so.
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editing, setEditing] = useState<Message | null>(null);

    // Originals of replies that aren't among the loaded messages (older than the latest 50, or unsent), fetched one by one. messageId -> message, or null if it no longer exists.
    const [quoteLookups, setQuoteLookups] = useState<Record<string, Message | null>>({});

    // The message that briefly glows after clicking a reply's quote.
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    // The scrolling message list, so it can be kept scrolled to the newest message, and the input, so replying/editing can put the cursor in it.
    const messagesRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Starts the messages listener for this chat. The cleanup unsubscribes it when switching chats or leaving the page.
    useEffect(() => {
        const unsubscribe = chatService.subscribeToMessages(
            chatId,
            (updatedMessages) => {
                setMessages(updatedMessages);
                setLoading(false);
            },
            (error) => {
                console.error("Failed to load messages:", error);
                setLoadError(true);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [chatId]);

    // Jumps to the bottom whenever a message is added (yours or theirs), the same way every chat app keeps the newest message in view.
    useEffect(() => {
        const list = messagesRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [messages.length]);

    // Marks the chat as read while it's open, whenever the latest message is from the other person and newer than when you last read it.
    // Because the chat doc is live, this also runs the moment a new message arrives in an already open chat.
    useEffect(() => {
        if (!chat) return;
        const { lastMessage, lastRead } = chat;

        if (lastMessage.senderId !== myUid && (lastRead[myUid] ?? '') < lastMessage.createdAt) {
            chatService.markRead(chat.id, myUid, lastMessage.createdAt)
                .catch((error) => console.error("Failed to mark chat as read:", error));
        }
    }, [chat, myUid]);

    // Fetches the original of any reply whose original isn't loaded, so its quote can show the original's current text (or "Message unsent" if it's gone).
    // Each original is only fetched once: anything already in quoteLookups is skipped, which also stops this from looping after it saves its results.
    useEffect(() => {
        const loadedIds = new Set(messages.map((message) => message.id));
        const missingIds = [...new Set(
            messages
                .map((message) => message.replyTo?.messageId)
                .filter((id): id is string => !!id && !loadedIds.has(id) && !(id in quoteLookups))
        )];
        if (missingIds.length === 0) return;

        let cancelled = false;
        Promise.all(missingIds.map((id) => chatService.getMessage(chatId, id).catch(() => null)))
            .then((found) => {
                if (cancelled) return;
                setQuoteLookups((prev) => ({ ...prev, ...Object.fromEntries(missingIds.map((id, i) => [id, found[i]])) }));
            });

        return () => {
            cancelled = true;
        };
    }, [messages, chatId, quoteLookups]);

    const trimmedDraft = draft.trim();

    // Starts a reply: shows the "Replying to" bar and puts the cursor in the input. Replying cancels an edit in progress, since the input can only do one at a time.
    const startReply = (message: Message) => {
        setEditing(null);
        if (editing) setDraft('');
        setReplyingTo(message);
        inputRef.current?.focus();
    };

    // Starts an edit: the input fills with the message's text and Send becomes Save.
    const startEdit = (message: Message) => {
        setReplyingTo(null);
        setEditing(message);
        setDraft(message.text);
        inputRef.current?.focus();
    };

    // Closes the reply/edit bar. Cancelling an edit also clears the input, since it was filled with the message being edited.
    const cancelContext = () => {
        if (editing) setDraft('');
        setEditing(null);
        setReplyingTo(null);
    };

    const handleSend = async () => {
        // Guarding against empty messages and double submits (pressing Enter twice quickly, for instance).
        if (!trimmedDraft || sending) return;

        // Saving an edit with the text unchanged is the same as cancelling it.
        if (editing && trimmedDraft === editing.text) {
            cancelContext();
            return;
        }

        setSending(true);
        try {
            if (editing && chat) {
                await chatService.editMessage(chat, editing.id, trimmedDraft);
                setEditing(null);
            } else {
                await chatService.sendMessage(myUid, otherProfile.uid, trimmedDraft, replyingTo ? { messageId: replyingTo.id, senderId: replyingTo.senderId } : undefined);
                setReplyingTo(null);
            }

            // Only cleared once the write succeeds, so a failed message isn't lost and can just be sent again.
            setDraft('');
        } catch (error) {
            console.error(editing ? "Failed to edit message:" : "Failed to send message:", error);

            // An edit past the 15 minute window gets rejected by the rules even if the Edit option was still showing when it was picked.
            showAlert("error", editing ? "Couldn't save your edit (messages can only be edited for 15 minutes)." : "Couldn't send your message. Try again.");
        }
        setSending(false);
    };

    const handleUnsend = async (message: Message) => {
        if (!chat) return;

        // If the message being unsent was being replied to or edited, that bar goes away with it.
        if (replyingTo?.id === message.id || editing?.id === message.id) cancelContext();

        try {
            await chatService.unsendMessage(chat, message.id);
        } catch (error) {
            console.error("Failed to unsend message:", error);
            showAlert("error", "Couldn't unsend your message. Try again.");
        }
    };

    // Scrolls to a reply's original and makes it glow for a moment. Only works when the original is among the loaded messages.
    const handleQuoteClick = (messageId: string) => {
        document.getElementById(`message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedId(messageId);
        setTimeout(() => setHighlightedId((current) => (current === messageId ? null : current)), HIGHLIGHT_MS);
    };

    // Enter sends (or saves an edit), same as the comment input in PostOverlay. Escape cancels a reply or edit.
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSend();
        if (e.key === 'Escape') cancelContext();
    };

    // Who a quote says the reply is to, from the point of view of whoever's reading: "You replied to them", "They replied to you", and so on.
    const getQuoteLabel = (message: Message): string => {
        const toMe = message.replyTo!.senderId === myUid;
        if (message.senderId === myUid) return `You replied to ${toMe ? 'yourself' : otherProfile.username}`;
        return `${otherProfile.username} replied to ${toMe ? 'you' : 'themselves'}`;
    };

    // Whether the message at index comes long enough after the one before it to get its own timestamp label (the very first message always does).
    const hasTimeGapAt = (index: number): boolean => {
        const previous = messages[index - 1];
        return !previous || new Date(messages[index].createdAt).getTime() - new Date(previous.createdAt).getTime() >= TIME_GAP_MS;
    };

    // Whether the message at index starts a new run of back-to-back messages: after a timestamp label, when the sender changes, or when it's a reply (so its quote has room).
    const startsGroupAt = (index: number): boolean => {
        const previous = messages[index - 1];
        return hasTimeGapAt(index) || previous.senderId !== messages[index].senderId || !!messages[index].replyTo;
    };

    // Every loaded message by ID, so a reply can find its original's current text.
    const messagesById = new Map(messages.map((message) => [message.id, message]));

    // "Seen" shows under your latest message once the other person's lastRead has caught up to it, "Sent" until then. It only shows when the newest message in the chat is yours, same as Instagram.
    const lastMessage = messages[messages.length - 1];
    const showReceipt = lastMessage?.senderId === myUid;
    const seen = showReceipt && !!chat && (chat.lastRead[otherProfile.uid] ?? '') >= lastMessage.createdAt;

    return (
        <div className='chat-thread-container'>
            <div className='chat-thread-header'>
                {/* Only shown at smaller screen sizes, where the chat list is hidden while a chat is open (see Chat.css). */}
                <Link to="/chat" className='chat-thread-back-button' aria-label="Back to messages">
                    <BsChevronLeft />
                </Link>
                <Link to={`/profile/${otherProfile.username}`} className='chat-thread-profile-link'>
                    <img src={otherProfile.profilePicURL || pfp_placeholder} alt="Profile" className='chat-thread-pfp' />
                    <div className='chat-thread-names'>
                        <span className='chat-thread-username'>{otherProfile.username}</span>
                        <span className='chat-thread-display-name'>{otherProfile.displayName}</span>
                    </div>
                </Link>
            </div>

            <div className='chat-thread-messages' ref={messagesRef}>
                {loading ? (
                    <LoadingSpinner size="sm" label="Loading messages..." />
                ) : loadError ? (
                    <p className='chat-thread-status'>Couldn't load this chat.</p>
                ) : messages.length === 0 ? (
                    <p className='chat-thread-status'>No messages yet. Say hi to {otherProfile.username}!</p>
                ) : (
                    messages.map((message, index) => {
                        const mine = message.senderId === myUid;

                        // A timestamp label goes above the first message, and above any message sent long enough after the one before it.
                        const showTime = hasTimeGapAt(index);

                        // Back-to-back messages from the same person sit closer together, so each run of messages reads as one group.
                        // Where a message sits in its run decides which corner of its bubble is pointed (see MessageBubble.css): a message on its own is "single", otherwise "first", "middle", or "last".
                        const startsGroup = startsGroupAt(index);
                        const endsGroup = index === messages.length - 1 || startsGroupAt(index + 1);
                        let groupPosition: 'single' | 'first' | 'middle' | 'last' = startsGroup && endsGroup ? 'single' : startsGroup ? 'first' : endsGroup ? 'last' : 'middle';

                        // A reply's quote sits above it as the first bubble of the run, so the reply itself moves one spot down: on its own it becomes the last bubble (pointed at the top), and at the start of a run it becomes a middle one.
                        if (message.replyTo) groupPosition = groupPosition === 'single' ? 'last' : 'middle';

                        // A reply's quote shows the original's CURRENT text: from the loaded messages if it's there, otherwise from the one-off lookup. undefined means the lookup is still running.
                        let quote: { label: string, text: string | null } | null = null;
                        if (message.replyTo) {
                            const original = messagesById.get(message.replyTo.messageId) ?? quoteLookups[message.replyTo.messageId];
                            quote = { label: getQuoteLabel(message), text: original === undefined ? '...' : original?.text ?? null };
                        }

                        return (
                            <div key={message.id} className={`chat-thread-row${startsGroup ? ' chat-thread-row-group-start' : ''}`}>
                                {showTime && <p className='chat-thread-time-label'>{formatTimeLabel(message.createdAt)}</p>}
                                <MessageBubble
                                    message={message}
                                    mine={mine}
                                    avatarURL={mine ? undefined : otherProfile.profilePicURL || pfp_placeholder}
                                    quote={quote}
                                    groupPosition={groupPosition}
                                    // Same 15 minute window as the rules, checked when the menu renders.
                                    canEdit={mine && Date.now() - new Date(message.createdAt).getTime() < EDIT_WINDOW_MS}
                                    highlighted={highlightedId === message.id}
                                    onReply={() => startReply(message)}
                                    onEdit={() => startEdit(message)}
                                    onUnsend={() => handleUnsend(message)}
                                    onQuoteClick={() => message.replyTo && handleQuoteClick(message.replyTo.messageId)}
                                />
                            </div>
                        );
                    })
                )}
                {!loading && showReceipt && (
                    <p className='chat-thread-receipt'>{seen ? 'Seen' : 'Sent'}</p>
                )}
            </div>

            {/* The bar above the input while replying or editing, with an X to cancel (Escape works too). */}
            {(replyingTo || editing) && (
                <div className='chat-thread-context-bar'>
                    <div className='chat-thread-context-text'>
                        <span className='chat-thread-context-label'>
                            {editing ? 'Editing message' : `Replying to ${replyingTo!.senderId === myUid ? 'yourself' : otherProfile.username}`}
                        </span>
                        {replyingTo && <span className='chat-thread-context-preview'>{replyingTo.text}</span>}
                    </div>
                    <button className='chat-thread-context-cancel' onClick={cancelContext} aria-label={editing ? "Cancel edit" : "Cancel reply"}>
                        <BsX />
                    </button>
                </div>
            )}

            <div className='chat-thread-input-bar'>
                <input
                    ref={inputRef}
                    className='chat-thread-input'
                    type="text"
                    placeholder={`Message ${otherProfile.username}...`}
                    aria-label="Message"
                    value={draft}
                    maxLength={MESSAGE_MAX}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button className='chat-thread-send-button' onClick={handleSend} disabled={!trimmedDraft || sending}>
                    {editing ? 'Save' : 'Send'}
                </button>
            </div>
        </div>
    );
};

export default ChatThread;
