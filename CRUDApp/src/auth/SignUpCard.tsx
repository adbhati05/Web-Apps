import "./SignUpCard.css";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useUserAuth } from "./UserAuthContext";
import { authService } from "../services/auth.service";
import { useAlert } from "../alerts/AlertContext";
import { getUsernameError, getEmailError, getPasswordError, USERNAME_MIN, USERNAME_MAX } from "../utils/validation";
import { Link } from "react-router-dom";

// NOTE: More validation/error-handling code will need to be implemented. DO RESEARCH!
const SignUpCard = () => {
  // Setting up the userSignUpInfo state object to hold the user's sign-up information.
  const [userSignUpInfo, setUserSignUpInfo] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Setting up useNavigate hook to navigate user to the home page after successful sign-up.
  const navigate = useNavigate();

  // Importing the signUp function from UserAuthContext to handle user registration.
  const { signUp } = useUserAuth();
  const { showAlert } = useAlert();

  // True while the account is being created, which disables the button (so it can't be clicked twice) and changes its label.
  const [submitting, setSubmitting] = useState(false);

  // This function uses the id attribute of the input field it's located in to update the userInfo state object with the value entered by the user via setUserInfo.
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserSignUpInfo({ ...userSignUpInfo, [id]: value });
  };

  // This function ensures that when the user presses the "Sign up" button, the form will not perform its default action (page refresh) and will instead call signUp with the appropriate args and forward the user to the home page.
  // Note: In future, include email verification before allowing the user to log in from sign up (look into this).
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    // Every field is checked here, top to bottom in the same order as the form, and the first problem found is shown as an alert. The form has noValidate (see below), so these replace the browser's own "Please fill out this field" bubbles.
    // The rules for usernames, emails, and passwords live in src/utils/validation.ts, shared with the Account info settings so both always enforce the same thing.
    const fieldError =
      getUsernameError(userSignUpInfo.username)
      ?? getEmailError(userSignUpInfo.email)
      ?? getPasswordError(userSignUpInfo.password)
      ?? (!userSignUpInfo.confirmPassword ? "Please confirm your password." : null)
      ?? (userSignUpInfo.password !== userSignUpInfo.confirmPassword ? "Passwords must match." : null);

    if (fieldError) {
      showAlert("error", fieldError);
      return;
    }

    // Checking if username is available via checkUsernameExists from authService. Done last, since it's the only check that needs a database read.
    const isUsernameTaken = await authService.checkUsernameExists(
      userSignUpInfo.username
    );
    if (isUsernameTaken) {
      showAlert("error", "Username is already taken.");
      return;
    }

    setSubmitting(true);
    try {
      // Since both displayName and username depend on the input from the user for the Username field in the sign-up card, userSignUpInfo.username is passed as both displayName and username to signUp.
      await signUp(
        userSignUpInfo.email,
        userSignUpInfo.password,
        userSignUpInfo.username,
        userSignUpInfo.username
      );
      navigate("/");
      showAlert("success", `Welcome to FitLog, ${userSignUpInfo.username}!`);
    } catch (caught) {
      console.log("An error occurred while signing up: ", caught);

      // Firebase Auth errors carry a code like "auth/email-already-in-use", and authService.signUp throws a plain Error with a message for a taken username.
      const error = caught as { code?: string, message?: string };

      // Showing error alerts for the common sign-up failures. Before, these only went to the console, so the button just appeared to do nothing.
      if (error.code === "auth/email-already-in-use") {
        showAlert("error", "An account with that email already exists.");
      } else if (error.code === "auth/invalid-email") {
        showAlert("error", "Please enter a valid email address.");
      } else if (error.message === "That username is already taken.") {
        // authService.signUp re-checks the username right before creating the account, in case someone took it in the meantime.
        showAlert("error", error.message);
      } else {
        showAlert("error", "Couldn't create your account. Please try again.");
      }

      // Only reset on failure, since on success the page navigates away.
      setSubmitting(false);
    }
  };

  return (
    // Below is a username input field, an email input field, password/confirm password input field (in that order, a set of password rules, and a submit button.
    // Password rules: At least 8 characters, at least one uppercase and lowercase letter, at least one number, and at least one special character.
    <div className="sign-up-card-container">
      Create Account
      {/* noValidate turns off the browser's built-in validation bubbles, since handleSubmit checks every field and shows the app's own alerts instead. The required/minLength/maxLength attributes stay for screen readers and to cap typing. */}
      <form className="sign-up-form-container" onSubmit={handleSubmit} noValidate>
        <div className="sign-up-input-field-container">
          <label className="sign-up-input-label" htmlFor="Username">
            Username:
          </label>
          <input
            className="sign-up-input-bar"
            id="username"
            type="username"
            placeholder="Must be 3-16 characters long"
            value={userSignUpInfo.username}
            onChange={handleChange}
            required
            minLength={USERNAME_MIN}
            maxLength={USERNAME_MAX}
          />
        </div>

        <div className="sign-up-input-field-container">
          <label className="sign-up-input-label" htmlFor="Email">
            Email:
          </label>
          <input
            className="sign-up-input-bar"
            id="email"
            type="email"
            value={userSignUpInfo.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="sign-up-input-field-container">
          <label className="sign-up-input-label" htmlFor="Password">
            Password:
          </label>
          <input
            className="sign-up-input-bar"
            id="password"
            type="password"
            placeholder="See rules below"
            value={userSignUpInfo.password}
            onChange={handleChange}
            required
          />
        </div>

        <div className="sign-up-input-field-container">
          <label className="sign-up-input-label" htmlFor="ConfirmPassword">
            Confirm Password:
          </label>
          <input
            className="sign-up-input-bar"
            id="confirmPassword"
            type="password"
            value={userSignUpInfo.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <ul className="password-rules">
          <li>Must be at least 8 characters long.</li>
          <li>Must contain at least one uppercase letter.</li>
          <li>Must contain at least one lowercase letter.</li>
          <li>Must contain at least one number.</li>
          <li>Must contain at least one special character.</li>
        </ul>

        <button className="sign-up-button" type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Sign up"}
        </button>

        {/* Add CSS to make link match with rest of card. */}
        <div className="login-link-container">
          <p>
            Already have an account? Log in{" "}
            <Link className="login-link" to="/login">
              here.
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default SignUpCard;