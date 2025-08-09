import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import UploadPhotoField from "../components/UploadPhotoField";
import PostDescription from "../components/PostDescription";
import "./Post.css";

const Post = () => {
  return (
    <div>
      <TopBar />
      <div className="post-main-layout">
        <div className="post-left-side-bar">
          <LeftSideBar />
        </div>
        <div className="post-container">
          <UploadPhotoField />
          <PostDescription />
        </div>
      </div>
    </div>
  );
};

export default Post;