import { useState } from "react";
import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import UploadPhotoField from "../components/UploadPhotoField";
import PostDescription from "../components/PostDescription";
import { useAlert } from "../alerts/AlertContext";
import "./Post.css";

// UploadPhotoField and PostDescription report problems through their onError props, and this page turns each one into an alert (see AlertContext), the same way every other page reports errors.
const Post = () => {
  // Setting up a state that will be used to hold the image preview.
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { showAlert } = useAlert();

  // This function will be called when the user uploads an image, passing the image preview to the parent component.
  const handleImageChange = (previewUrl: string | null) => {
    setImagePreview(previewUrl);
  };

  // This function clears the image preview whenever the user chooses to remove the image.
  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  // This function is called when the user successfully creates a post, resetting the image preview and letting them know it worked.
  const handleReset = () => {
    setImagePreview(null);
    showAlert("success", "Post created!");
  };

  // The children call onError(null) to clear an old error, which there's nothing to do for now that errors are alerts (they dismiss themselves).
  const handleError = (error: string | null) => {
    if (error) showAlert("error", error);
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
            onError={handleError}
          />
          <PostDescription
            imagePreview={imagePreview}
            onSuccess={handleReset}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
};

export default Post;
