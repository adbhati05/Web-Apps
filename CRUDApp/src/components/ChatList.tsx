import './ChatList.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { Link } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import type { Chat, UserInfo } from '../types';

// TO-DO: Searching for any user to message (not just people you follow) once user search exists (see the to-do list).

// This component is the right side bar of the Chat page: everyone you can message, similar to Instagram's DM list.
// Your existing chats come first (most recent activity at the top, unread ones bolded with a dot), then everyone you follow that you haven't messaged yet.
// Each row links to /chat/:username, which is what opens that chat in the middle of the page.
interface ChatListProps {
    myUid: string | undefined,
    chats: Chat[],
    followingUids: string[],
    profiles: Record<string, UserInfo>, // uid -> profile for everyone in the list, looked up by the Chat page.
    activeUid: string | undefined, // Whoever the open chat is with, so their row can be highlighted.
    loading: boolean,
    error: boolean,
}

// Formats a message time into a short label for the list: the time if it was today, the weekday if it was in the last week, otherwise the date.
const formatListTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const daysAgo = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (daysAgo < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ChatList = ({ myUid, chats, followingUids, profiles, activeUid, loading, error }: ChatListProps) => {
    // Everyone you follow that you don't already have a chat with, so nobody shows up twice.
    const chattedUids = new Set(chats.flatMap((chat) => chat.participantIds));
    const followingWithoutChat = followingUids.filter((uid) => !chattedUids.has(uid) && profiles[uid]);

    // Renders one row of the list: picture, username, and (for existing chats) the latest message and its time.
    const renderRow = (profile: UserInfo, chat?: Chat) => {
        // Unread means the latest message is from the other person and is newer than when you last opened the chat (ISO strings compare correctly as plain strings).
        // A message the other person unsent doesn't count, since there's nothing left to read.
        const unread = !!chat && !!myUid && !chat.lastMessage.unsent && chat.lastMessage.senderId !== myUid && (chat.lastRead[myUid] ?? '') < chat.lastMessage.createdAt;

        // An unsent latest message has its text emptied on the preview (see chatService.unsendMessage), so the row says what happened instead.
        const mine = chat?.lastMessage.senderId === myUid;
        const preview = chat && (chat.lastMessage.unsent
            ? `${mine ? 'You' : profile.username} unsent a message`
            : `${mine ? 'You: ' : ''}${chat.lastMessage.text}`);

        return (
            <Link
                key={profile.uid}
                to={`/chat/${profile.username}`}
                className={`chat-list-row${profile.uid === activeUid ? ' chat-list-row-active' : ''}${unread ? ' chat-list-row-unread' : ''}`}
            >
                <img src={profile.profilePicURL || pfp_placeholder} alt="Profile" className='chat-list-pfp' />
                <div className='chat-list-row-text'>
                    <span className='chat-list-username'>{profile.username}</span>
                    {preview ? (
                        <span className='chat-list-preview'>{preview}</span>
                    ) : (
                        <span className='chat-list-preview'>{profile.displayName}</span>
                    )}
                </div>
                {chat && (
                    <div className='chat-list-row-meta'>
                        <span className='chat-list-time'>{formatListTime(chat.lastMessage.createdAt)}</span>
                        {unread && <span className='chat-list-unread-dot' aria-label="Unread" />}
                    </div>
                )}
            </Link>
        );
    };

    return (
        <div className='chat-list-container'>
            <h2 className='chat-list-title'>Messages</h2>

            {loading ? (
                <LoadingSpinner size="sm" label="Loading chats..." />
            ) : error ? (
                <p className='chat-list-message'>Couldn't load your chats.</p>
            ) : (
                <>
                    {chats.length === 0 && followingWithoutChat.length === 0 && (
                        <p className='chat-list-message'>No chats yet. Follow people to see them here, or message someone from their profile.</p>
                    )}

                    {/* A chat whose other person hasn't loaded yet (or whose profile was deleted) is skipped rather than shown without a name. */}
                    {chats.map((chat) => {
                        const otherUid = chat.participantIds.find((uid) => uid !== myUid)!;
                        return profiles[otherUid] ? renderRow(profiles[otherUid], chat) : null;
                    })}

                    {followingWithoutChat.length > 0 && (
                        <>
                            <h3 className='chat-list-section-title'>Following</h3>
                            {followingWithoutChat.map((uid) => renderRow(profiles[uid]))}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ChatList;
