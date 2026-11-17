import "./ResetPasswordCard.css";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { authService } from "../services/auth.service";
import { useAlert } from "../alerts/AlertContext";
import { getPasswordError } from "../utils/validation";
import { logError } from "../utils/logger";
import LoadingSpinner from "../components/LoadingSpinner";
import ForgotPasswordModal from "./ForgotPasswordModal";

// This component is where the link in a password reset email lands (instead of Firebase's own hosted page), so setting the new password looks like the rest of the site.
// The link's URL carries a one-time code (oobCode). The card checks it first, then shows the new password form, or an "expired" message if the code is no good.
// 'checking' while the code is being verified, 'invalid' if it's expired/used/missing, 'ready' once it's good and the form can show.
type CodeStatus = "checking" | "invalid" | "ready";

const ResetPasswordCard = () => {
  const [searchParams] = useSearchParams();
  // Firebase's custom action URL is one setting for every email template, so links for other actions (like confirming an email change) would land here too. mode says which action a link is for, and only resetPassword codes are accepted here.
  const mode = searchParams.get("mode");
  const code = mode === null || mode === "resetPassword" ? searchParams.get("oobCode") : null;

  const [codeStatus, setCodeStatus] = useState<CodeStatus>(code ? "checking" : "invalid");

  // The email the code belongs to, shown above the form so the user knows which account they're resetting.
  const [email, setEmail] = useState("");

  const [passwords, setPasswords] = useState({
    password: "",
    confirmPassword: "",
  });

  // True while the new password is being saved, which disables the button (so it can't be clicked twice) and changes its label.
  const [submitting, setSubmitting] = useState(false);

  // Whether the "Send a new link" popup is open (only offered when the link is no good).
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const navigate = useNavigate();
  const { showAlert } = useAlert();

  // Checking the code as soon as the page opens, so an expired link says so right away instead of after the user has typed a new password.
  // cancelled stops a slow check from updating the card after the user has already left the page.
  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    authService.verifyResetCode(code)
      .then((codeEmail) => {
        if (cancelled) return;
        setEmail(codeEmail);
        setCodeStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        logError("Password reset link couldn't be verified:", error);
        setCodeStatus("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setPasswords({ ...passwords, [id]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || !code) return;

    // Same password rules as signing up (see src/utils/validation.ts), checked here since the form has noValidate.
    const fieldError = getPasswordError(passwords.password)
      ?? (!passwords.confirmPassword ? "Please confirm your new password." : null)
      ?? (passwords.password !== passwords.confirmPassword ? "Passwords must match." : null);
    if (fieldError) {
      showAlert("error", fieldError);
      return;
    }

    setSubmitting(true);
    try {
      await authService.confirmReset(code, passwords.password);
      showAlert("success", "Your password has been reset. You can now log in with it.");
      navigate("/login", { replace: true });
    } catch (caught) {
      logError("Failed to reset password:", caught);
      const error = caught as { code?: string };

      // The code can expire (or be used in another tab) between opening the page and submitting, so that case switches the card to the expired message.
      if (error.code === "auth/expired-action-code" || error.code === "auth/invalid-action-code") {
        setCodeStatus("invalid");
      } else if (error.code === "auth/weak-password") {
        showAlert("error", "That password is too weak. Please choose a stronger one.");
      } else {
        showAlert("error", "Couldn't reset your password. Please try again.");
      }

      // Only reset on failure, since on success the page navigates away.
      setSubmitting(false);
    }
  };

  return (
    <div className="reset-password-card-container">
      Archive
      <p className="reset-password-subtitle">Reset your password</p>

      {codeStatus === "checking" && <LoadingSpinner label="Checking your link..." />}

      {codeStatus === "invalid" && (
        <div className="reset-password-invalid">
          <p className="reset-password-message">This link has expired or has already been used. Reset links only work once and for a limited time.</p>
          <button className="reset-password-button" type="button" onClick={() => setShowForgotPassword(true)}>
            Send a new link
          </button>
        </div>
      )}

      {codeStatus === "ready" && (
        // noValidate for the same reason as the login and sign-up forms (the app's alerts instead of the browser's bubbles).
        <form className="reset-password-form-container" onSubmit={handleSubmit} noValidate>
          <p className="reset-password-message">
            Choose a new password for <span className="reset-password-email">{email}</span>.
          </p>

          <div className="reset-password-input-field-container">
            <input
              className="reset-password-input-bar"
              id="password"
              type="password"
              placeholder="New Password"
              autoComplete="new-password"
              value={passwords.password}
              onChange={handleChange}
            />
          </div>

          <div className="reset-password-input-field-container">
            <input
              className="reset-password-input-bar"
              id="confirmPassword"
              type="password"
              placeholder="Confirm New Password"
              autoComplete="new-password"
              value={passwords.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {/* The same rules as the sign-up card's list, since getPasswordError checks the same ones. */}
          <ul className="reset-password-rules">
            <li>Must be at least 8 characters long.</li>
            <li>Must contain at least one uppercase letter.</li>
            <li>Must contain at least one lowercase letter.</li>
            <li>Must contain at least one number.</li>
            <li>Must contain at least one special character.</li>
          </ul>

          <button className="reset-password-button" type="submit" disabled={submitting}>
            {submitting ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}

      <div className="reset-password-login-link-container">
        <p>
          Remembered it? Log in{" "}
          <Link className="reset-password-login-link" to="/login">
            here.
          </Link>
        </p>
      </div>

      {/* The email isn't known when the link is no good, so the popup starts empty. */}
      {showForgotPassword && (
        <ForgotPasswordModal initialEmail="" onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
};

export default ResetPasswordCard;
