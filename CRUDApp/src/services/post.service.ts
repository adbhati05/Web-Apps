// This will be include all Firebase functionality necessary for post operations.
import {doc, collection, getDoc, setDoc, updateDoc, deleteDoc, writeBatch} from 'firebase/firestore';
import { db } from '../firebase';
import type { PostInfo } from '../types';

export const postService = {
    async createPost(): Promise<PostInfo> {
        
    }

}