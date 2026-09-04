import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import RightSideBar from "../components/RightSideBar";
import PostFeed from "../components/PostFeed";
import PostOverlay from "../components/PostOverlay";
import { useState } from "react";
import type { Post } from "../types";
import "./Home.css";

const Home = () => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  return (
    <div>
      <TopBar />
      <div className="home-main-layout">
        <div className="home-left-side-bar">
          <LeftSideBar />
        </div>
        <div className="post-feed">
          <PostFeed onCommentClick={(post) => setSelectedPost(post)} />
        </div>
        <div className="home-right-side-bar">
          <RightSideBar />
        </div>
      </div>
      {/* The overlay sits outside the layout box now, since its backdrop is fixed to the viewport and covers the top bar as well. */}
      {selectedPost && (
        <PostOverlay post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
};

export default Home;