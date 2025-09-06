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

        try {
            console.log(`Compressing image to width/height: ${options.maxWidthOrHeight}, size: ${options.maxSizeMB}MB, format: ${options.format}`);
            // Using imageCompression and options to compress the image.
            const compressedFile = await imageCompression(file, options);

            // Returning the URL of the compressedFile.
            return URL.createObjectURL(compressedFile);
        } catch (error) {
            console.error("Error compressing image:", error);
            
            // Returning original image URL.
            return url;
        }
    },

    async uploadImage(
        url: string,
        fileName: string,
        storagePath: string,
        options: {
            maxSizeMB?: number,
            maxWidthOrHeight?: number,
            format?: "jpeg" | "png"
        } = {}
    ): Promise<string> {
        try {
            // First compress the image via function above.
            const compressedURL = await this.compressImage(url, fileName, options);

            // Convert compressed image URL to blob.
            const response = await fetch(compressedURL);
            const blob = await response.blob();

            // Create a reference to the storage location.
            const storageRef = ref(storage, storagePath);

            // To perform cache-busting, first create a const that holds the current timestamp in the file's metadata.
            const metadata = {
                customMetadata: {
                    uploadedAt: new Date().toISOString()
                }
            }

            // Upload the file to Firebase Storage.
            await uploadBytes(storageRef, blob, metadata);

            // Get the download URL.
            let downloadURL = await getDownloadURL(storageRef);

            // Append a cache-busting query parameter to the download URL.
            downloadURL += downloadURL.includes('?')
              ? `&t=${Date.now()}`
              : `?t=${Date.now()}`;

            return downloadURL;
        } catch (error) {
            console.error("Error uploading image:", error);
            throw error;
        }
    },

    async uploadProfileImage(
        url: string,
        userId: string,
    ): Promise<string> {
        // Logging for debugging purposes.
        console.log("Uploading profile image for user:", userId);

        // Generating a unique file name and storage path so that uploadImage can be called properly.
        const fileName = `profile-${userId}-${Date.now()}.jpg`;
        const storagePath = `profile/${fileName}`;

        // Constraints for profile images are: 500 px dimensions, 0.2 MB size, JPEG format.
        const options = {
            maxSizeMB: 0.2,
            maxWidthOrHeight: 500,
            format: "jpeg" as "jpeg"
        }

        return this.uploadImage(url, fileName, storagePath, options);
    },

    async uploadPostImage(
        url: string,
        userId: string,
    ): Promise<string> {
        // Same process as with profile image upload, but different constraints and storage path.
        console.log("Uploading post image for user:", userId);
        const fileName = `post-${userId}-${Date.now()}.jpg`;
        const storagePath = `posts/${fileName}`;
        
        // Constraints for post images are: 1080 px dimensions, 0.6 MB size, JPEG format.
        const options = {
            maxSizeMB: 0.6,
            maxWidthOrHeight: 1080,
            format: "jpeg" as "jpeg"
        }

        return this.uploadImage(url, fileName, storagePath, options);
    },

    async deleteImage(url: string): Promise<void> {
        try {
            // Taking the inputted string and converting it to a URL object.
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const urlParts = pathname.split('/');

        

            
        }
    }
}