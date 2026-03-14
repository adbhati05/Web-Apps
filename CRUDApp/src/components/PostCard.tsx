import './PostCard.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { useState, useEffect } from 'react';
import { postService } from "../services/post.service"
import type { PieceDetail, Comment } from '../types';
import { BsHeart, BsHeartFill, BsChatLeft } from "react-icons/bs";
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';



// Defining the props that will be passed into the PostCard component.
// Essentially, this component is a skeleton for a post that will be displayed on the feed.
// PostFeed.tsx will handle the logic of fetching users' posts and passing the data into this component.
interface PostCardProps {
    username: string,
    dateCreated: string,
    caption: string,
    imageURL: string,
    likes: string[],
    comments: Comment[],
    pieces: PieceDetail[],
    hasDetails: boolean,
}

const PostCard = ({ username, dateCreated, caption, imageURL, likes, comments, pieces, hasDetails }: PostCardProps) => {

    const [liked, setLiked] = useState(false);
    const handleLike = async () => {
        setLiked(!liked);

        // TO-DO: Set it up so that if the button's liked, its state persists even if the page is refreshed.
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
                    <button className='like-button' onClick={handleLike}>
                        {liked ? <BsHeartFill className='like-button-liked' /> : <BsHeart />}
                    </button>
                    <button className='comment-button'><BsChatLeft /></button>
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