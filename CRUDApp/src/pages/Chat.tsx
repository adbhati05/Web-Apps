import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import ChatList from "../components/ChatList";
import ChatThread from "../components/ChatThread";
import LoadingSpinner from "../components/LoadingSpinner";
import { useState, useEffect } from "react";
import { useParams, Navigate } from "react-router-dom";
import { useUserAuth } from "../auth/UserAuthContext";
import { chatService } from "../services/chat.service";
import { followService } from "../services/follow.service";
import { profileService } from "../services/profile.service";
import type { Chat as ChatDoc, UserInfo } from "../types";
import "./Chat.css";

// This page handles both /chat (just the list of people to message) and /chat/:username (an open chat with that user).
// The middle is the open chat (ChatThread), and the right side bar is everyone you can message (ChatList): your existing chats first, then people you follow that you haven't messaged yet.
// (The type is imported as ChatDoc since this page component is already called Chat.)
const Chat = () => {
  // Same useParams idea as the Profile page: :username is whoever the open chat is with, undefined on plain /chat.
  const { username } = useParams<{ username: string }>();
  const { userInfo } = useUserAuth();
  const myUid = userInfo?.uid;

  // Every chat you're in, kept live by the listener below.
  const [chats, setChats] = useState<ChatDoc[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsError, setChatsError] = useState(false);

  // UIDs of everyone you follow, used for the "start a chat" part of the list.
  const [followingUids, setFollowingUids] = useState<string[]>([]);

  // Profiles of everyone shown in the list (uid -> profile), since chats and follow docs only store UIDs.
  const [profiles, setProfiles] = useState<Record<string, UserInfo>>({});

  // The profile of whoever the open chat is with, looked up from :username.
  const [otherProfile, setOtherProfile] = useState<UserInfo | null>(null);
  const [otherLoading, setOtherLoading] = useState(false);
  const [otherNotFound, setOtherNotFound] = useState(false);

  // Starts the chat list listener once the user's doc has loaded. The cleanup unsubscribes it when leaving the page, otherwise it would keep running in the background.
  useEffect(() => {
    if (!myUid) return;

    const unsubscribe = chatService.subscribeToChats(
      myUid,
      (updatedChats) => {
        setChats(updatedChats);
        setChatsLoading(false);
      },
      (error) => {
        console.error("Failed to load chats:", error);
        setChatsError(true);
        setChatsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [myUid]);

  // Fetches who you follow once. It's a one-time read rather than a listener, so following someone new shows up here after a reload (or the next visit to this page).
  useEffect(() => {
    if (!myUid) return;

    followService.getFollowing(myUid)
      .then((following) => setFollowingUids(following.map(({ uid }) => uid)))
      .catch((error) => console.error("Failed to load following:", error));
  }, [myUid]);

  // Looks up the profile of everyone in the list. getProfilesByUids is cached, so people who are already loaded aren't fetched again every time a new message updates the chat list.
  useEffect(() => {
    if (!myUid) return;

    const otherUids = chats.map((chat) => chat.participantIds.find((uid) => uid !== myUid)!);
    const uids = [...otherUids, ...followingUids];
    if (uids.length === 0) return;

    let cancelled = false;
    profileService.getProfilesByUids(uids).then((found) => {
      if (!cancelled) setProfiles(found);
    });

    return () => {
      cancelled = true;
    };
  }, [chats, followingUids, myUid]);

  // Resolves :username to a profile whenever the open chat changes. Same cancelled flag as the Profile page, so clicking quickly between chats can't show the wrong person.
  useEffect(() => {
    if (!username) {
      setOtherProfile(null);
      setOtherNotFound(false);
      return;
    }

    let cancelled = false;
    setOtherLoading(true);
    setOtherNotFound(false);

    profileService.getProfileByUsername(username)
      .then((found) => {
        if (cancelled) return;
        setOtherProfile(found);
        setOtherNotFound(!found);
      })
      .catch((error) => {
        console.error("Failed to load chat user:", error);
        if (!cancelled) setOtherNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setOtherLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  // You can't chat with yourself (the rules block it too), so /chat/<your own username> just goes back to the list.
  if (username && userInfo && username.toLowerCase() === userInfo.username) {
    return <Navigate to="/chat" replace />;
  }

  // The open chat's doc, if the two of you have messaged before. It's undefined for a brand-new chat, which ChatThread handles (the doc gets created with the first message).
  const activeChat = myUid && otherProfile
    ? chats.find((chat) => chat.id === chatService.getChatId(myUid, otherProfile.uid))
    : undefined;

  return (
    <div>
      <TopBar />
      {/* chat-thread-open tells the CSS that a chat is open. At smaller screen sizes only one of the two panes fits, so it decides whether the chat or the list is the one showing (same idea as the Settings page). */}
      <div className={`chat-main-layout${username ? " chat-thread-open" : ""}`}>
        <div className="chat-left-side-bar">
          <LeftSideBar />
        </div>
        <div className="chat-container">
          {!username ? (
            <div className="chat-empty-state">
              <h2 className="chat-empty-state-title">Your messages</h2>
              <p className="chat-empty-state-text">Pick someone from the list to start chatting, or use the Message button on anyone's profile.</p>
            </div>
          ) : otherLoading || !myUid ? (
            <LoadingSpinner label="Loading chat..." />
          ) : otherNotFound || !otherProfile ? (
            <p className="chat-message">This user doesn't exist.</p>
          ) : (
            // key resets the thread (draft, messages, listener) when switching from one chat to another.
            <ChatThread key={otherProfile.uid} myUid={myUid} otherProfile={otherProfile} chat={activeChat} />
          )}
        </div>
        <div className="chat-right-side-bar">
          <ChatList
            myUid={myUid}
            chats={chats}
            followingUids={followingUids}
            profiles={profiles}
            activeUid={otherProfile?.uid}
            loading={chatsLoading}
            error={chatsError}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
