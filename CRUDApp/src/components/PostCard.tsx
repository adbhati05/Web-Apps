import './PostCard.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { postService } from "../services/post.service";
import { useSignedInUser } from '../auth/UserAuthContext';
import { useAlert } from '../alerts/AlertContext';
import type { PieceDetail, UserInfo } from '../types';
import { BsHeart, BsHeartFill, BsChatLeft } from "react-icons/bs";
import PieceItem from './PieceItem';
import { logError } from '../utils/logger';

// Defining the props that will be passed into the PostCard component. Essentially, this component is a skeleton for a post that will be displayed on the feed. PostFeed.tsx will handle the logic of fetching users' posts and passing the data into this component.
// Likes (as well as comments) now live in a subcollection, so the card receives the denormalized likeCount off the post doc plus an initiallyLiked flag that PostFeed looks up from the subcollection for the current user.
interface PostCardProps {
    postId: string,
    username: string,
    dateCreated: string,
    caption: string,
    imageURL: string,
    likeCount: number,
    initiallyLiked: boolean,
    pieces: PieceDetail[],
    hasDetails: boolean,
    author?: UserInfo, // The poster's profile, looked up by PostFeed. Optional since it can still be loading or fail to load, in which case the card falls back to the placeholder picture and no link.
    onCommentClick: () => void,
    onPieceFavorite?: (pieceIndex: number) => void, // The piece menu's Favorite option, which adds the piece to the user's style board archive (PostFeed does the actual saving).
    onPieceComment?: (pieceIndex: number) => void, // The piece menu's Comment option, which opens the post overlay with that piece attached to the comment box.
    menu?: React.ReactNode, // The Edit/Delete menu (PostMenu), shown next to the date. PostFeed only passes it for the signed-in user's own posts, so the card itself doesn't need to know whose post it is.
}

const PostCard = ({ postId, username, dateCreated, caption, imageURL, likeCount: initialLikeCount, initiallyLiked, pieces, hasDetails, author, onCommentClick, onPieceFavorite, onPieceComment, menu }: PostCardProps) => {

    // Retrieving current user's information.
    const { uid: currentUserId } = useSignedInUser();

    // Defining a liked state variable that will track whether the current user has liked the post.
    const [liked, setLiked] = useState(initiallyLiked);

    const { showAlert } = useAlert();

    // Defining a likeCount state variable that will track the number of likes on the post.
    const [likeCount, setLikeCount] = useState(initialLikeCount);

    const handleLike = async () => {
        // Using an optimistic update to have the like button and count change immediately upon click.
        const isLiked = liked;
        setLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1); // Two options here in case user chooses to like or unlike the post.

        try {
            // toggleLike checks the likes subcollection on the server, so its return value is the true new state; reconcile with it in case this card's initial state was stale.
            const nowLiked = await postService.toggleLike(postId, currentUserId);
            if (nowLiked !== !isLiked) {
                setLiked(nowLiked);
                setLikeCount(prev => nowLiked ? prev + 1 : prev - 1);
            }
        } catch (error) {
            logError("Failed to toggle like:", error, { postId });

            // Upon error, rollback both optimistic updates and let the user know why the heart flipped back.
            setLiked(isLiked);
            setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
            showAlert("error", "Couldn't update your like. Try again.");
        }
    };

    return (
        <div className='post-card-container'>
            <div className='top-bar'>
                {/* With the author loaded, the picture and name link to their profile. The live username is shown over the one stored on the post, in case the stored one is out of date. */}
                {author ? (
                    <Link to={`/profile/${author.username}`} className='account-profile-container account-profile-link'>
                        <img src={author.profilePicURL || pfp_placeholder} alt="Profile" />
                        <p>{author.username}</p>
                    </Link>
                ) : (
                    <div className='account-profile-container'>
                        <img src={pfp_placeholder} alt="Profile" />
                        <p>{username}</p>
                    </div>
                )}
                {/* The date and (on your own posts) the menu sit together on the right side of the bar. */}
                <div className='post-card-top-right'>
                    <p>{dateCreated}</p>
                    {menu}
                </div>
            </div>
            <div className='post-content'>
                <div className='post-image-container'>
                    <img src={imageURL} alt="Post" />
                </div>

                <div className='post-actions-container'>
                    <div className='like-container'>
                        <button className='like-button' onClick={handleLike}>
                            {liked ? <BsHeartFill className='like-button-liked' /> : <BsHeart />}
                        </button>
                        <p className='like-count'>{likeCount ? likeCount : ''}</p>
                    </div>
                    <div className='comment-container'>
                        <button className='comment-button' onClick={onCommentClick}><BsChatLeft /></button>
                    </div>
                </div>
                <div className='post-caption-container'>
                    <p>{caption}</p>
                </div>
                <div className='post-pieces-container'>
                    {/* Each piece is a PieceItem: clicking its name opens a menu with Favorite and Comment, and pieces with details (hasDetails) get a chevron to show them. */}
                    {/* The menu options only show up when PostFeed passes the handlers for them. */}
                    {pieces.map((piece, index) => (
                        <PieceItem
                            key={index}
                            piece={piece}
                            hasDetails={hasDetails}
                            actions={[
                                ...(onPieceFavorite ? [{ label: 'Favorite', onClick: () => onPieceFavorite(index) }] : []),
                                ...(onPieceComment ? [{ label: 'Comment', onClick: () => onPieceComment(index) }] : []),
                            ]}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PostCard;