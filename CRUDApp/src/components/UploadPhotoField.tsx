import "./UploadPhotoField.css";

const UploadPhotoField = () => {
  return (
    <div className="upload-photo-field">
      <input
        className="upload-photo-input"
        type="file"
        id="photo-upload"
        accept="image/*"
      />
      <label htmlFor="photo-upload" className="upload-photo-label">
        Choose Photo
      </label>
      <p className="upload-photo-instruction">
        Max file size: 5MB | Accepted formats: JPEG, PNG
      </p>
    </div>
  );
};

export default UploadPhotoField;

// FIGURE OUT HOW TO INCLUDE A CLOUD UPLOAD ICON NEXT TO OR ON TOP OF THE "Choose Photo" LABEL.