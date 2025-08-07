import TopBar from "../components/TopBar";
import "./Settings.css";

const Settings = () => {
  return (
    <div>
      <TopBar />
      <div className="settings-main-layout">
        <div className="settings-left-side-bar">Settings left side bar</div>
        <div className="settings-container">Settings Content</div>
      </div>
    </div>
  );
};

export default Settings;