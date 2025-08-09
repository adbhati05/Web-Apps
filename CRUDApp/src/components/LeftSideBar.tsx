import "./LeftSideBar.css";
import { Link } from "react-router-dom";

const LeftSideBar = () => {
  return (
    // Here I've set up a container for the buttons in the side bar that is a flex box that causes the buttons to stack vertically, not horizontally stretch, and be sized to their contents.
    // I've also included some horizontal lines to separate the buttons/or links to other pages.
    <div className="d-flex flex-column align-items-start spacing">
      <Link to="/" className="left-side-bar-button">
        Home
      </Link>
      <hr className="left-side-bar-line" />
      <Link to="/styleboard" className="left-side-bar-button">
        Style Board
      </Link>
      <hr className="left-side-bar-line" />
      <Link to="/saved" className="left-side-bar-button">
        Saved
      </Link>
      <hr className="left-side-bar-line" />
      <Link to="/post" className="left-side-bar-button">
        Post
      </Link>
      <hr className="left-side-bar-line" />
    </div>
  );
};

export default LeftSideBar;