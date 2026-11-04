import "./LoginCard.css";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUserAuth } from "./UserAuthContext";
import { useAlert } from "../alerts/AlertContext";
import { getEmailError } from "../utils/validation";

const LoginCard = () => {
  // The following code follows the same logic as with the SignUpCard component, but obviously in the context of logging in a user instead.
  const [userLoginInfo, setUserLoginInfo] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const { signIn } = useUserAuth();
  const { showAlert } = useAlert();

  // True while the sign-in request is in flight, which disables the button (so it can't be clicked twice) and changes its label.
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserLoginInfo({ ...userLoginInfo, [id]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    // The form has noValidate (see below), so empty fields and a malformed email are caught here and shown as the app's own alerts instead of the browser's bubbles.
    // The password is only checked for being filled in, since the sign-up rules don't apply to logging in (Firebase decides whether it's right).
    const fieldError = getEmailError(userLoginInfo.email) ?? (!userLoginInfo.password ? "Please enter your password." : null);
    if (fieldError) {
      showAlert("error", fieldError);
      return;
    }

    setSubmitting(true);
    try {
      await signIn(userLoginInfo.email, userLoginInfo.password);
      navigate("/");
    } catch (caught) {
      console.log("An error occurred while logging in: ", caught);

      // Firebase Auth errors carry a code like "auth/invalid-credential", which is what decides the message below.
      const error = caught as { code?: string };

      // Showing error alerts if user enters invalid credentials, an invalid email address, takes too many attempts to sign in, or any other unexpected error occurs.
      if (error.code === "auth/invalid-credential") {
        showAlert("error", "Invalid email or password. Please try again.");
      } else if (error.code === "auth/invalid-email") {
        showAlert("error", "Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        showAlert("error", "Too many failed attempts. Please try again later.");
      } else {
        showAlert("error", "An unexpected error occurred. Please try again.");
      }

      // Only reset on failure, since on success the page navigates away.
      setSubmitting(false);
    }
  };

  return (
    // Do research on how to do the backend stuff necessary for the log-in process via Firebase on YT.
    // Below is a login input field, a password input field, a link to the sign-up page, and a submit button.
    // Note: The link to the sign-up page will be a React Router link that will redirect the user to the sign-up page when clicked.
    <div className="login-card-container">
      Fit Log
      {/* noValidate turns off the browser's built-in validation bubbles, since handleSubmit checks the fields and shows the app's own alerts instead. */}
      <form className="login-form-container" onSubmit={handleSubmit} noValidate>
        <div className="login-input-field-container">
          <input
            className="login-input-bar"
            id="email"
            type="email"
            placeholder="Email Address"
            value={userLoginInfo.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="login-input-field-container">
          <input
            className="login-input-bar"
            id="password"
            type="password"
            placeholder="Password"
            value={userLoginInfo.password}
            onChange={handleChange}
            required
          />
        </div>

        {/* Edit this so that it's a paragraph that says "Don't have an account? Sign up " and then a link that says " here." that redirects the user to the sign-up page. */}
        {/* Make sure that ONLY the link is styled to scale up after being hovered, NOT the entire paragraph. */}
        <div className="sign-up-link-container">
          <p>
            Don't have an account? Sign up{" "}
            <Link className="sign-up-link" to="/signup">
              here.
            </Link>
          </p>
        </div>

        <button className="sign-in-button" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};

export default LoginCard;