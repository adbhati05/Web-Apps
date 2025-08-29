import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression  from "browser-image-compression";

export const storageService = {
    async compressImage(
        url: string,
        fileName: string,
        options: {
            maxSizeMB?: number,
            maxWidthOrHeight?: number,
            format?: "jpeg" | "png"
        } = {}
    ): Promise<string> {
        // First converting the URL into a blob so that I can create a file since imageCompression solely works with files.
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });

        // Using imageCompression and options to compress the image.
        const compressedFile = await imageCompression(file, options);

        // Returning the URL of the compressedFile.
        return URL.createObjectURL(compressedFile);
    }

    /*
    async uploadPostImage(
        url: string,
        storagePath: string,
        width?: number,
        height?: number,
        format?: "jpeg" | "png"
    ): Promise<string> {

    }
    */
}