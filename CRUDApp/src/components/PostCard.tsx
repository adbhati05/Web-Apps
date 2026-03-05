import './PostCard.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { useUserAuth } from '../auth/UserAuthContext';
import { postService } from '../services/post.service';
import { useState, useEffect } from 'react';
import type { Post } from '../types';
import type { PieceDetail } from '../types';

// Defining the props that will be passed into the PostCard component.
// Essentially, this component is a skeleton for a post that will be displayed on the feed.
// PostFeed.tsx will handle the logic of fetching users' posts and passing the data into this component.
interface PostCardProps {
    username: string,
    dateCreated: string,
    caption: string,
    imageURL: string,
    likes: string[],
    commentsCount: number,
    pieces: PieceDetail[],
}

const PostCard = ({ username, dateCreated, caption, imageURL, likes, commentsCount, pieces }: PostCardProps) => {

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
                <div className='post-caption-container'>
                    <p>{caption}</p>
                </div>
                <div className='post-pieces-container'>
                    {pieces.map((piece, index) => (
                        <div key={index} className='post-piece'>
                            <p>{piece.name}</p>
                            <p>{piece.price}</p>
                            <p>{piece.size}</p>
                            <p>{piece.materials}</p>
                            <p>{piece.dateAcquired}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PostCard;