import "./LeftSideBar.css";
import { Link } from "react-router-dom";
import {
  BsHouseFill,
  BsEasel2Fill,
  BsPlusSquareFill,
  BsPersonFill,
  BsChatFill,
} from "react-icons/bs";

const LeftSideBar = () => {
  return (
    // Here I've set up a container for the buttons in the side bar that is a flex box that causes the buttons to stack vertically, not horizontally stretch, and be sized to their contents.
    // I've also included some horizontal lines to separate the buttons/or links to other pages.
    <div className="d-flex flex-column align-items-start spacing">
      {/* The aria-labels keep the links named for screen readers on mobile, where the visible text labels are hidden and only the icons render. */}
      <Link to="/" className="left-side-bar-button" aria-label="Home">
        <BsHouseFill className="left-side-bar-icon" />
        <span className="left-side-bar-label">Home</span>
      </Link>
      <hr className="left-side-bar-line" />
      <Link to="/styleboard" className="left-side-bar-button" aria-label="Style Board">
        <BsEasel2Fill className="left-side-bar-icon" />
        <span className="left-side-bar-label">Style Board</span>
      </Link>
      <hr className="left-side-bar-line" />
      <Link to="/post" className="left-side-bar-button" aria-label="Post">
        <BsPlusSquareFill className="left-side-bar-icon" />
        <span className="left-side-bar-label">Post</span>
      </Link>
      <hr className="left-side-bar-line" />
      <Link to="/profile" className="left-side-bar-button" aria-label="Profile">
        <BsPersonFill className="left-side-bar-icon" />
        <span className="left-side-bar-label">Profile</span>
      </Link>
      <hr className="left-side-bar-line" />
      <Link to="/chat" className="left-side-bar-button" aria-label="Chat">
        <BsChatFill className="left-side-bar-icon" />
        <span className="left-side-bar-label">Chat</span>
      </Link>
    </div>
  );
};

export default LeftSideBar;