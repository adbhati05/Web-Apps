import './PostCard.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { useState } from 'react';
import { postService } from "../services/post.service";
import { auth } from '../firebase';
import type { PieceDetail } from '../types';
import { BsHeart, BsHeartFill, BsChatLeft } from "react-icons/bs";
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';

// TO-DO: Implement the commenting feature, also figure out why accordion "bounces" when unexpanded and expanded and fix issue.

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
    onCommentClick: () => void,
}

const PostCard = ({ postId, username, dateCreated, caption, imageURL, likeCount: initialLikeCount, initiallyLiked, pieces, hasDetails, onCommentClick }: PostCardProps) => {

    // Retrieving current user's information.
    const currentUserId = auth.currentUser?.uid;

    // Defining a liked state variable that will track whether the current user has liked the post.
    const [liked, setLiked] = useState(initiallyLiked);

    // Defining a likeCount state variable that will track the number of likes on the post.
    const [likeCount, setLikeCount] = useState(initialLikeCount);

    const handleLike = async () => {
        // User must be logged in to like a post.
        if (!currentUserId) return;

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
            console.error("Failed to toggle like:", error);

            // Upon error, rollback both optimistic updates.
            setLiked(isLiked);
            setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
        }
    };

    return (
        <div className='post-card-container'>
            <div className='top-bar'>
                <div className='account-profile-container'>
                    <img src={pfp_placeholder} alt="Profile" />
                    <p>{username}</p>
                </div>
                <p>{dateCreated}</p>
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
                    {/* Conditionally rendering pieces via hasDetails. If it does, then render an accordion for each piece. */}
                    {pieces.map((piece, index) =>
                        hasDetails ? (
                            <Accordion key={index} className='post-piece'>
                                <AccordionSummary expandIcon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>} className='post-piece-summary'>
                                    <span>{piece.name}</span>
                                </AccordionSummary>
                                <AccordionDetails className='post-piece-details'>
                                    <ul className='post-piece-detail-list'>
                                        {piece.price && <li><span>Price</span><span>{piece.price}</span></li>}
                                        {piece.size && <li><span>Size</span><span>{piece.size}</span></li>}
                                        {piece.materials && <li><span>Materials</span><span>{piece.materials}</span></li>}
                                        {piece.dateAcquired && <li><span>Date Acquired</span><span>{piece.dateAcquired}</span></li>}
                                    </ul>
                                </AccordionDetails>
                            </Accordion>
                        ) : (
                            <div key={index} className='post-piece post-piece-static'>
                                <span className='post-piece-name'>{piece.name}</span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default PostCard;