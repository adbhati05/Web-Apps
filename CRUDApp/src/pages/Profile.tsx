import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import "./Profile.css";

const Profile = () => {
  return (
    <div>
      <TopBar />
      <div className="profile-main-layout">
        <div className="profile-left-side-bar">
          <LeftSideBar />
        </div>
        <div className="profile-container">Profile</div>
      </div>
    </div>
  );
};

export default Profile;