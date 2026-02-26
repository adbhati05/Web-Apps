import "./UploadPhotoField.css";
import { BsCloudArrowUpFill, BsXCircle } from "react-icons/bs";
import { useRef } from "react";

// TO-DO: Figure out why the user needs to upload the image twice for it to show up in the preview and fix it.

// These props will be used to pass data from the this component to the parent component leveraging it (PostDescription).
interface UploadPhotoFieldProps {
  imagePreview: string | null; // The current image preview, contains the data URL of the image.
  onImageChange: (previewUrl: string | null) => void; // A callback function that's used to update the image preview in the parent component.
  onRemoveImage: () => void; // A callback function that's used to remove the image preview in the parent component.
  onError: (error: string | null) => void; // A callback function that's used to update the error message in the parent component.
}

const UploadPhotoField = ({
  imagePreview,
  onImageChange,
  onRemoveImage,
  onError
}: UploadPhotoFieldProps) => {
  // Setting up a ref to hold the file input element.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // This function is called when the user selects a file, it checks if the file is less than 5MB and then reads the file as a data URL and passes it to the parent component.
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extracting the file from the event.
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size too large");
        return;
      }

      // Creating a new FileReader object to read the file as a data URL.
      const reader = new FileReader();

      // Using loadend to ensure the file is fully read.
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
      onError(null);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="upload-photo-container">
      <div className="upload-photo-field" onClick={handleClick}>
        <input
          ref={fileInputRef}
          className="upload-photo-input"
          type="file"
          id="photo-upload"
          accept="image/*"
          onChange={handleFileChange} // Calling the handleFileChange function when the user selects a file.
          style={{ display: "none" }}
        />
        {imagePreview ? (
          <>
            <img src={imagePreview} alt="Preview" className="image-preview" />
            <button
              className="remove-photo-button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveImage();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <BsXCircle />
            </button>
          </>
        ) : (
          <>
            <BsCloudArrowUpFill className="upload-photo-icon" />
            <label htmlFor="photo-upload" className="upload-photo-label">
              Choose Photo
            </label>
            <p className="upload-photo-instruction">
              Max file size: 5MB | Accepted formats: JPEG, PNG
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadPhotoField;