import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from "browser-image-compression";
import { logError } from '../utils/logger';

// Thrown when a picked image can't be processed (compression fails, e.g. an unsupported format like HEIC or a corrupted file). Upload and permission errors are NOT this type.
// Its message is written for the user, so pages can show it as-is (error instanceof ImageProcessingError); any other error gets a generic message instead.
export class ImageProcessingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ImageProcessingError";
    }
}

export const storageService = {
    async compressImage(
        url: string,
        fileName: string,
        options: {
            maxSizeMB?: number,
            maxWidthOrHeight?: number,
            fileType?: "image/jpeg" | "image/png"
        } = {}
    ): Promise<File> {
        // First converting the URL into a blob so that I can create a file since imageCompression solely works with files.
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });

        try {
            // Using imageCompression and options to compress the image.
            const compressedFile = await imageCompression(file, options);

            // Returning the compressed file.
            return compressedFile;
        } catch (error) {
            logError("Error compressing image:", error, { fileName, type: blob.type });
            throw new ImageProcessingError("Couldn't process that image. Try a different photo (JPEG or PNG work best).");
        }
    },

    async uploadImage(
        url: string,
        fileName: string,
        storagePath: string,
        options: {
            maxSizeMB?: number,
            maxWidthOrHeight?: number,
            fileType?: "image/jpeg" | "image/png"
        } = {}
    ): Promise<string> {
        try {
            // First compress the image via function above.
            const compressedFile = await this.compressImage(url, fileName, options);

            // Create a reference to the storage location.
            const storageRef = ref(storage, storagePath);

            // Upload the file to Firebase Storage.
            await uploadBytes(storageRef, compressedFile);

            // Returning the download URL via getDownloadURL, where each upload gets a unique timestamped path.
            return getDownloadURL(storageRef);
        } catch (error) {
            logError("Error uploading image:", error, { storagePath });
            throw error;
        }
    },

    async uploadProfileImage(
        url: string,
        userId: string,
    ): Promise<string> {
        // Generating a hierarchical path so that rules can be applied based on the userId folder.
        const timestamp = Date.now();
        const fileName = `${timestamp}.jpg`;
        const storagePath = `profile/${userId}/${fileName}`;

        // Constraints for profile images are: 500 px dimensions, 0.2 MB size, JPEG format.
        const options = {
            maxSizeMB: 0.2,
            maxWidthOrHeight: 500,
            fileType: "image/jpeg" as const
        }

        return this.uploadImage(url, fileName, storagePath, options);
    },

    async uploadPostImage(
        url: string,
        userId: string,
    ): Promise<string> {
        // Same process as with profile image upload, but different constraints and storage path.
        const timestamp = Date.now();
        const fileName = `${timestamp}.jpg`;
        const storagePath = `posts/${userId}/${fileName}`;

        // Constraints for post images are: 1080 px dimensions, 0.6 MB size, JPEG format.
        const options = {
            maxSizeMB: 0.6,
            maxWidthOrHeight: 1080,
            fileType: "image/jpeg" as const
        }

        return this.uploadImage(url, fileName, storagePath, options);
    },

    async deleteImage(url: string): Promise<void> {
        try {
            await deleteObject(ref(storage, url));
        } catch (error) {
            logError("Error deleting image:", error, { url });
            throw error;
        }
    }

    // For the future, include file upload for files other than images (ex: videos, documents, etc).
}