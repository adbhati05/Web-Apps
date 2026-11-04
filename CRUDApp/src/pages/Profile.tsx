import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import ProfileHeader from "../components/ProfileHeader";
import ProfilePostGrid from "../components/ProfilePostGrid";
import PostOverlay from "../components/PostOverlay";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserAuth } from "../auth/UserAuthContext";
import { profileService } from "../services/profile.service";
import { postService } from "../services/post.service";
import { followService } from "../services/follow.service";
import type { Post, UserInfo } from "../types";
import "./Profile.css";

// This page handles both /profile (your own) and /profile/:username (anyone's). It fetches the profile and that user's posts, then hands them to ProfileHeader and ProfilePostGrid.
const Profile = () => {
  // useParams reads the :username part of the URL defined in routes.tsx. On plain /profile there's no parameter, so it comes back undefined.
  const { username } = useParams<{ username: string }>();
  const { userInfo, refreshUserInfo } = useUserAuth();
  const navigate = useNavigate();

  // It's your own profile either on plain /profile or when the URL happens to be your own username.
  const isOwnProfile = !username || username.toLowerCase() === userInfo?.username;
  const ownUid = userInfo?.uid;

  // Only other users' profiles are stored here. Your own comes straight from the auth context, so it's already up to date after an edit in Settings (see refreshUserInfo).
  const [otherProfile, setOtherProfile] = useState<UserInfo | null>(null);
  const profile = isOwnProfile ? userInfo : otherProfile;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  // Which post (if any) is open in the PostOverlay.
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Whether you follow the profile being viewed. Only used on other users' profiles.
  const [following, setFollowing] = useState(false);

  // Mirrors PostCard.handleLike: the button and the follower count change immediately, then get reconciled with (or rolled back to) what the server says.
  const handleFollow = async () => {
    if (!ownUid || !otherProfile) return;

    const wasFollowing = following;
    const adjustFollowerCount = (delta: number) =>
      setOtherProfile(prev => prev && { ...prev, followerCount: (prev.followerCount ?? 0) + delta });

    setFollowing(!wasFollowing);
    adjustFollowerCount(wasFollowing ? -1 : 1);

    try {
      // toggleFollow checks the server, so its return value is the true new state, in case this page's initial state was stale.
      const nowFollowing = await followService.toggleFollow(ownUid, otherProfile.uid);
      if (nowFollowing !== !wasFollowing) {
        setFollowing(nowFollowing);
        adjustFollowerCount(nowFollowing ? 1 : -1);
      }

      // Your own followingCount changed too, so pull it into the auth context for when you visit your own profile.
      refreshUserInfo().catch(error => console.error("Failed to refresh user info:", error));
    } catch (error) {
      console.error("Failed to toggle follow:", error);
      setFollowing(wasFollowing);
      adjustFollowerCount(wasFollowing ? 1 : -1);
    }
  };

  useEffect(() => {
    // Your own profile can't load until the auth context has fetched your user doc.
    if (isOwnProfile && !ownUid) return;

    // If the URL changes mid-fetch (clicking from one profile to another), the old fetch can finish after the new one started.
    // The cleanup at the bottom flips this flag for the old fetch, so its results are thrown away instead of overwriting the new profile.
    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setNotFound(false);
      setError(false);

      // Closing the post overlay if it's open, since this effect also runs when a username link inside it takes you to another profile.
      setSelectedPost(null);

      try {
        let uid = ownUid;

        if (!isOwnProfile) {
          // fresh = true skips the profile cache, so the counts and bio on the page are always current.
          const fetched = await profileService.getProfileByUsername(username!, true);
          if (cancelled) return;

          if (!fetched) {
            setOtherProfile(null);
            setNotFound(true);
            return;
          }

          // Fetched alongside the profile so the Follow button shows the right label as soon as the page renders.
          const isFollowingThem = ownUid ? await followService.isFollowing(ownUid, fetched.uid) : false;
          if (cancelled) return;

          setOtherProfile(fetched);
          setFollowing(isFollowingThem);
          uid = fetched.uid;
        }

        const userPosts = await postService.getPostsByUser(uid!);
        if (!cancelled) setPosts(userPosts);
      } catch (error) {
        console.error("Failed to load profile:", error);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [username, isOwnProfile, ownUid]);

  return (
    <div>
      <TopBar />
      <div className="profile-main-layout">
        <div className="profile-left-side-bar">
          <LeftSideBar />
        </div>
        <div className="profile-container">
          {loading ? (
            <p className="profile-message">Loading profile...</p>
          ) : error ? (
            <p className="profile-message">Couldn't load this profile.</p>
          ) : notFound || !profile ? (
            <p className="profile-message">This profile doesn't exist.</p>
          ) : (
            <div className="profile-content">
              <ProfileHeader
                profile={profile}
                postCount={posts.length}
                isOwnProfile={isOwnProfile}
                onEditClick={() => navigate("/settings/edit-profile")}
                onStyleBoardClick={() => navigate("/styleboard")}
                isFollowing={following}
                onFollowClick={handleFollow}
                // TO-DO (Phase 3): open the conversation with this user (chatService.getOrCreateConversation, then /chat/:conversationId). For now it just goes to the chat page.
                onMessageClick={() => navigate("/chat")}
              />
              <ProfilePostGrid posts={posts} onPostClick={(post) => setSelectedPost(post)} />
            </div>
          )}
        </div>
      </div>

      {/* The overlay sits outside the layout box, same as on Home, since its backdrop is fixed to the viewport. */}
      {selectedPost && (
        <PostOverlay post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
};

export default Profile;
