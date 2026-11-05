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

  // Which of the selected post's pieces the comment box starts attached to, when the overlay was opened from a piece's Comment option. undefined for a regular comment.
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | undefined>(undefined);

  const openOverlay = (post: Post, pieceIndex?: number) => {
    setSelectedPost(post);
    setSelectedPieceIndex(pieceIndex);
  };

  return (
    <div>
      <TopBar />
      <div className="home-main-layout">
        <div className="home-left-side-bar">
          <LeftSideBar />
        </div>
        <div className="post-feed">
          <PostFeed onCommentClick={(post) => openOverlay(post)} onPieceCommentClick={(post, pieceIndex) => openOverlay(post, pieceIndex)} />
        </div>
        <div className="home-right-side-bar">
          <RightSideBar />
        </div>
      </div>
      {/* The overlay sits outside the layout box now, since its backdrop is fixed to the viewport and covers the top bar as well. */}
      {selectedPost && (
        <PostOverlay post={selectedPost} initialPieceIndex={selectedPieceIndex} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
};

export default Home;