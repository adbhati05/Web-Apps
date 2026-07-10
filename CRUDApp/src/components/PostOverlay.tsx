import './PostOverlay.css';
import { useState, useEffect } from 'react';
import { postService } from '../services/post.service';
import type { Post } from '../types';

const PostOverlay = ({ post, onClose }: { post: Post; onClose: () => void }) => {
    return (
        <div className='post-overlay-container'>
            <div className='image-container'>
                <img src={post.imageURL} alt={post.caption} className='post-image' />
            </div>

            <div className='info-container'>
                <p className='caption'>{post.caption}</p>
                <p className='username'>{post.username}</p>
                <p className='date'>{post.createdAt}</p>
            </div>
            <button className='overlay-close-button' onClick={onClose}>X</button>
        </div>
    );
};

export default PostOverlay; 