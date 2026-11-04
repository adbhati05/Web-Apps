import TopBar from "../components/TopBar";
import EditProfileForm from "../components/EditProfileForm";
import AccountInfoForm from "../components/AccountInfoForm";
import { Link, Navigate, useParams } from "react-router-dom";
import { useUserAuth } from "../auth/UserAuthContext";
import { BsPersonCircle, BsInfoCircle, BsChevronRight, BsChevronLeft } from "react-icons/bs";
import "./Settings.css";

// Every section of the settings page. The left side bar is built from this list and :section in the URL picks which one is open, so adding a new setting is one entry here plus its component below.
const SETTINGS_SECTIONS = [
  { id: "account-info", label: "Account info", icon: <BsInfoCircle /> },
  { id: "edit-profile", label: "Edit profile", icon: <BsPersonCircle /> },
];

const Settings = () => {
  // useParams reads the :section part of /settings/:section (see routes.tsx). Plain /settings has none, so it falls back to the first section.
  const { section } = useParams<{ section: string }>();
  const activeSection = section ?? SETTINGS_SECTIONS[0].id;
  const activeLabel = SETTINGS_SECTIONS.find(({ id }) => id === activeSection)?.label;

  const { userInfo } = useUserAuth();

  // A section that doesn't exist (a mistyped URL, for instance) sends the user back to plain /settings. Navigate is react-router's way of redirecting from inside the render.
  if (!SETTINGS_SECTIONS.some(({ id }) => id === activeSection)) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <div>
      <TopBar />
      {/* On mobile only one pane shows at a time, Instagram style: plain /settings is just the list of options, and /settings/:section is just that section (with a back link to the list).
          This class is what the mobile CSS uses to tell the two apart. On desktop both panes always show, so it has no effect there. */}
      <div className={`settings-main-layout${section ? " settings-section-open" : ""}`}>
        <div className="settings-left-side-bar">
          <h2 className="settings-title">Settings</h2>
          <nav className="settings-options">
            {SETTINGS_SECTIONS.map(({ id, label, icon }) => (
              <Link
                key={id}
                to={`/settings/${id}`}
                className={`settings-option${id === activeSection ? " settings-option-active" : ""}`}
              >
                {icon}
                <span>{label}</span>
                {/* Only shown on mobile, where the options become a list of rows that each lead to their own page. */}
                <BsChevronRight className="settings-option-chevron" />
              </Link>
            ))}
          </nav>
        </div>
        <div className="settings-container">
          {/* Only shown on mobile, since there the list of options is hidden while a section is open. */}
          <Link to="/settings" className="settings-back-link">
            <BsChevronLeft />
            <span>{activeLabel}</span>
          </Link>
          {!userInfo ? (
            <p className="settings-message">Loading...</p>
          ) : activeSection === "account-info" ? (
            // Same key reasoning as EditProfileForm below.
            <AccountInfoForm key={userInfo.uid} profile={userInfo} />
          ) : activeSection === "edit-profile" ? (
            // key resets the form's drafts if a different account signs in, since useState only reads its starting value once.
            <EditProfileForm key={userInfo.uid} profile={userInfo} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Settings;
