import './ProfileHeader.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import type { UserInfo } from '../types';

// This component is the top section of the profile page, laid out like Instagram's: the profile picture on the left, then the username, the post/follower/following counts, and the display name and bio on the right.
// The action buttons sit in a row underneath all of that: Edit profile and Styleboard on your own profile, Follow and Message on anyone else's.
interface ProfileHeaderProps {
    profile: UserInfo,
    postCount: number,
    isOwnProfile: boolean, // Your own profile gets Edit profile/Styleboard, anyone else's gets Follow/Message.
    onEditClick: () => void, // Takes the user to the Edit profile section of the Settings page.
    onStyleBoardClick?: () => void, // Takes the user to their Styleboard page.
    isFollowing?: boolean, // Whether the signed-in user follows this profile, which flips the Follow button's label.
    onFollowClick?: () => void,
    onMessageClick?: () => void, // Takes the user to their chat with this profile.
}

const ProfileHeader = ({ profile, postCount, isOwnProfile, onEditClick, onStyleBoardClick, isFollowing = false, onFollowClick, onMessageClick }: ProfileHeaderProps) => {
    return (
        <div className='profile-header'>
            <div className='profile-header-main'>
                <div className='profile-header-pfp-container'>
                    <img src={profile.profilePicURL || pfp_placeholder} alt="Profile" className='profile-header-pfp' />
                </div>

                <div className='profile-header-info'>
                    <div className='profile-header-top'>
                        <div className='profile-header-names-container'>
                            <h2 className='profile-header-username'>{profile.username}</h2>
                            <h2 className='profile-header-name'>{profile.displayName}</h2>
                        </div>
                    </div>

                    {/* User docs made before the counters existed don't have them, so they fall back to 0. */}
                    <ul className='profile-header-stats'>
                        <li><span className='profile-header-stat-count'>{postCount}</span> {postCount === 1 ? 'post' : 'posts'}</li>
                        <li><span className='profile-header-stat-count'>{profile.followerCount ?? 0}</span> {profile.followerCount === 1 ? 'follower' : 'followers'}</li>
                        <li><span className='profile-header-stat-count'>{profile.followingCount ?? 0}</span> following</li>
                    </ul>

                    <div className='profile-header-details'>
                        {profile.bio && <p className='profile-header-bio'>{profile.bio}</p>}
                    </div>
                </div>
            </div>

            {isOwnProfile ? (
                <div className='profile-header-actions'>
                    <button className='profile-header-button' onClick={onEditClick}>Edit profile</button>
                    <button className='profile-header-button' onClick={onStyleBoardClick}>Styleboard</button>
                </div>
            ) : (
                <div className='profile-header-actions'>
                    <button className='profile-header-button' onClick={onFollowClick}>{isFollowing ? 'Following' : 'Follow'}</button>
                    <button className='profile-header-button' onClick={onMessageClick}>Message</button>
                </div>
            )}
        </div>
    );
};

export default ProfileHeader;
