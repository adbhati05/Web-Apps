import "./ForgotPasswordModal.css";
import { useState } from "react";
import type { FormEvent } from "react";
import Modal from "../components/Modal";
import { authService } from "../services/auth.service";
import { useAlert } from "../alerts/AlertContext";
import { getEmailError } from "../utils/validation";
import { logError } from "../utils/logger";

// This component is the popup opened by the login card's "Forgot password?" link, where the user enters the email to send a password reset link to.
// It's a form modal (X in the header, no Cancel button), and closes itself once the email is sent.
interface ForgotPasswordModalProps {
  initialEmail: string, // Whatever was already typed into the login form's email field, so it doesn't have to be typed twice.
  onClose: () => void,
}

const ForgotPasswordModal = ({ initialEmail, onClose }: ForgotPasswordModalProps) => {
  const [email, setEmail] = useState(initialEmail);

  // True while the request is in flight, so the reset email can't be requested twice at once.
  const [sending, setSending] = useState(false);
  const { showAlert } = useAlert();

  // The success message is the same whether or not an account uses that email, so this can't be used to find out which emails are registered.
  const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (sending) return;

    const emailError = getEmailError(email);
    if (emailError) {
      showAlert("error", emailError);
      return;
    }

    setSending(true);
    try {
      await authService.resetPassword(email.trim());
      showAlert("success", "If an account uses that email, we sent it a link to reset your password.");
      onClose();
    } catch (caught) {
      logError("Failed to send password reset email:", caught);
      const error = caught as { code?: string };
      showAlert("error", error.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." : "Couldn't send the reset email. Please try again.");

      // Only reset on failure, since on success the modal closes.
      setSending(false);
    }
  };

  return (
    <Modal
      title="Reset your password"
      onClose={onClose}
      size="sm"
      footer={
        // form="forgot-password-form" ties this footer button to the form below, since the Modal renders the footer outside of it.
        <button className="modal-button modal-button-primary" type="submit" form="forgot-password-form" disabled={sending}>
          {sending ? "Sending..." : "Send link"}
        </button>
      }
    >
      {/* A real form so pressing Enter in the field sends the link. noValidate for the same reason as the login form (the app's alerts instead of the browser's bubbles). */}
      <form id="forgot-password-form" className="forgot-password-form" onSubmit={handleSubmit} noValidate>
        <p className="forgot-password-message">Enter the email you signed up with and we'll send you a link to reset your password.</p>
        <input
          className="forgot-password-input"
          type="email"
          aria-label="Email address"
          placeholder="Email Address"
          value={email}
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
        />
      </form>
    </Modal>
  );
};

export default ForgotPasswordModal;
