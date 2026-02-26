import { useState } from "react";
import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import UploadPhotoField from "../components/UploadPhotoField";
import PostDescription from "../components/PostDescription";
import "./Post.css";

// TO-DO: Decide if you want to keep the onError error messages or not. If not, remove the onError prop from the UploadPhotoField and PostDescription components and use alerts instead.

const Post = () => {
  // Setting up states that will be used to hold the image preview and error messages.
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // This function will be called when the user uploads an image, passing the image preview to the parent component.
  const handleImageChange = (previewUrl: string | null) => {
    setImagePreview(previewUrl);
    if (previewUrl) setError(null);
  };

  // This function clears the image preview whenever the user chooses to remove the image.
  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  // This function is called when the user successfully creates a post, resetting the image preview and error message.
  const handleReset = () => {
    setImagePreview(null);
    setError(null);
  };

  return (
    <div>
      <TopBar />
      <div className="post-main-layout">
        <div className="post-left-side-bar">
          <LeftSideBar />
        </div>
        <div className="post-container">
          <UploadPhotoField
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onRemoveImage={handleRemoveImage}
            onError={setError}
          />
          <PostDescription
            imagePreview={imagePreview}
            onSuccess={handleReset}
            onError={setError}
          />
          {error && <p style={{ color: "tomato", marginTop: "10px", textAlign: "center", width: "100%" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Post;