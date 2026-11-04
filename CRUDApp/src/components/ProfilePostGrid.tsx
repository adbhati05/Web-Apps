import './ProfilePostGrid.css';
import { BsGrid3X3, BsHeartFill, BsChatFill } from 'react-icons/bs';
import type { Post } from '../types';

// This component is the grid of a user's posts under the profile header, three square thumbnails per row like Instagram. Clicking one opens it in the PostOverlay (handled by the Profile page).
interface ProfilePostGridProps {
    posts: Post[],
    onPostClick: (post: Post) => void,
}

const ProfilePostGrid = ({ posts, onPostClick }: ProfilePostGridProps) => {
    return (
        <div className='profile-post-grid-container'>
            {/* Only one tab for now, but this is where Saved or Style Board tabs would sit later. */}
            <div className='profile-post-grid-tabs'>
                <div className='profile-post-grid-tab'>
                    <BsGrid3X3 />
                    <span>Posts</span>
                </div>
            </div>

            {posts.length === 0 ? (
                <p className='profile-post-grid-message'>No posts yet.</p>
            ) : (
                <div className='profile-post-grid'>
                    {posts.map((post) => (
                        <button key={post.id} className='profile-post-grid-item' onClick={() => onPostClick(post)} aria-label="Open post">
                            <img src={post.imageURL} alt={post.caption} />

                            {/* Hidden until hover, then shows the post's like and comment counts over the thumbnail. */}
                            <div className='profile-post-grid-item-overlay'>
                                <span><BsHeartFill /> {post.likeCount || 0}</span>
                                <span><BsChatFill /> {post.commentCount || 0}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProfilePostGrid;
