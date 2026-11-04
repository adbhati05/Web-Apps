import './AccountInfoForm.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../auth/UserAuthContext';
import { useAlert } from '../alerts/AlertContext';
import { authService } from '../services/auth.service';
import { profileService } from '../services/profile.service';
import { getUsernameError, getPasswordError, USERNAME_MAX } from '../utils/validation';
import type { UserInfo } from '../types';

// TO-DO: More personal info fields (birthdate, gender, etc.) will go in this section as the app grows. Anything shown on the public profile belongs in EditProfileForm instead.

// This component is the Account info section of the Settings page: username, email, password, when the account was made, and deleting the account.
// Each part saves on its own (with its own button and message), since changing the email or password needs the current password and a username change doesn't.

// An error shown under one part of the form when saving it fails, so it sits right next to what it's about. Successful saves are success alerts instead (see AlertContext), same as everywhere else in the app.
type Status = { type: 'error', message: string } | null;

// Which part of the form is mid-save, so only that part's button says "Saving..." and nothing can be double submitted.
type Busy = 'username' | 'email' | 'password' | 'delete' | null;

// Firebase Auth errors come back as codes like "auth/invalid-credential". This turns the common ones into something readable and falls back to a generic message for the rest.
const getErrorMessage = (error: unknown, fallback: string): string => {
    const code = (error as { code?: string })?.code;
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
            return "Your current password is incorrect.";
        case 'auth/email-already-in-use':
            return "That email is already used by another account.";
        case 'auth/invalid-email':
            return "That email address isn't valid.";
        case 'auth/too-many-requests':
            return "Too many attempts. Wait a bit and try again.";
        case 'auth/requires-recent-login':
            return "For security, log out and back in, then try again.";
    }

    // changeUsername throws its own readable error when the name is taken.
    if (error instanceof Error && error.message === "That username is already taken.") return error.message;
    return fallback;
};

const AccountInfoForm = ({ profile }: { profile: UserInfo }) => {

    const { user, refreshUserInfo } = useUserAuth();
    const { showAlert } = useAlert();
    const navigate = useNavigate();

    const [busy, setBusy] = useState<Busy>(null);

    // Username drafts and status.
    const [username, setUsername] = useState(profile.username);
    const [usernameStatus, setUsernameStatus] = useState<Status>(null);

    // Email drafts and status. The current email comes from Firebase Auth (user.email), since it isn't stored on the user doc.
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [emailStatus, setEmailStatus] = useState<Status>(null);

    // Password drafts and status.
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordStatus, setPasswordStatus] = useState<Status>(null);

    // Deleting is two steps: the first click only opens the confirmation box, and the account is only deleted from inside it (after the password is entered).
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteStatus, setDeleteStatus] = useState<Status>(null);

    // Usernames are stored lowercase, so "Alice" and "alice" count as the same name and changing only the case isn't a change.
    const trimmedUsername = username.trim();
    const usernameChanged = trimmedUsername.toLowerCase() !== profile.username;

    // The account's creation date, from the user doc (set at sign-up). Firebase Auth also records it, which covers any doc that's missing the field.
    const createdAt = profile.createdAt || user?.metadata.creationTime;
    const createdAtLabel = createdAt
        ? new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Unknown';

    const handleSaveUsername = async () => {
        if (!usernameChanged || busy) return;

        const validationError = getUsernameError(trimmedUsername);
        if (validationError) {
            setUsernameStatus({ type: 'error', message: validationError });
            return;
        }

        setBusy('username');
        setUsernameStatus(null);
        try {
            await authService.changeUsername(profile.uid, profile.username, trimmedUsername);

            // Pulls the new username into the auth context (top bar, profile page, this form's profile prop) and into the profile cache (author names on posts and comments).
            await refreshUserInfo();
            await profileService.getProfileByUid(profile.uid, true);

            setUsername(trimmedUsername.toLowerCase());
            showAlert('success', "Username updated.");
        } catch (error) {
            console.error("Failed to change username:", error);
            setUsernameStatus({ type: 'error', message: getErrorMessage(error, "Couldn't change your username. Try again.") });
        }
        setBusy(null);
    };

    const handleSaveEmail = async () => {
        const trimmedEmail = newEmail.trim();
        if (!trimmedEmail || !emailPassword || busy) return;

        if (trimmedEmail.toLowerCase() === user?.email?.toLowerCase()) {
            setEmailStatus({ type: 'error', message: "That's already your email." });
            return;
        }

        setBusy('email');
        setEmailStatus(null);
        try {
            await authService.changeEmail(trimmedEmail, emailPassword);

            // The email doesn't actually change until the link is clicked (see changeEmail in auth.service), so the message says what happens next.
            showAlert('success', `We sent a link to ${trimmedEmail}. Your email will change once you click it, and you may need to log in again afterwards.`);
            setNewEmail('');
            setEmailPassword('');
        } catch (error) {
            console.error("Failed to change email:", error);
            setEmailStatus({ type: 'error', message: getErrorMessage(error, "Couldn't change your email. Try again.") });
        }
        setBusy(null);
    };

    const handleSavePassword = async () => {
        if (!currentPassword || !newPassword || busy) return;

        // Same rules as sign-up, checked before anything is sent.
        const validationError = getPasswordError(newPassword);
        if (validationError) {
            setPasswordStatus({ type: 'error', message: validationError });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordStatus({ type: 'error', message: "Passwords must match." });
            return;
        }

        setBusy('password');
        setPasswordStatus(null);
        try {
            await authService.changePassword(currentPassword, newPassword);
            showAlert('success', "Password updated.");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error("Failed to change password:", error);
            setPasswordStatus({ type: 'error', message: getErrorMessage(error, "Couldn't change your password. Try again.") });
        }
        setBusy(null);
    };

    // Closes the confirmation box and clears what was typed into it.
    const handleCancelDelete = () => {
        setConfirmingDelete(false);
        setDeletePassword('');
        setDeleteStatus(null);
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword || busy) return;

        setBusy('delete');
        setDeleteStatus(null);
        try {
            await authService.deleteAccount(deletePassword);

            // The account is gone, so the auth listener in UserAuthContext signs the user out on its own. Navigating to the login page just makes it immediate.
            navigate('/login', { replace: true });

            // AlertProvider sits outside the router, so this alert carries over to the login page.
            showAlert('success', "Your account was deleted.");
        } catch (error) {
            console.error("Failed to delete account:", error);
            setDeleteStatus({ type: 'error', message: getErrorMessage(error, "Couldn't delete your account. Try again.") });
            setBusy(null);
        }
    };

    // Renders a part's error message, if it has one.
    const renderStatus = (status: Status) => status && (
        <p className='account-info-error'>{status.message}</p>
    );

    return (
        <div className='account-info-container'>
            <h2 className='account-info-title'>Account info</h2>

            <div className='account-info-section'>
                <h3 className='account-info-section-title'>Username</h3>
                <input
                    id="account-info-username"
                    className='account-info-input'
                    type="text"
                    autoComplete="username"
                    aria-label="Username"
                    maxLength={USERNAME_MAX}
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setUsernameStatus(null); }}
                />
                {renderStatus(usernameStatus)}
                <div className='account-info-actions'>
                    <button className='account-info-button account-info-button-save' onClick={handleSaveUsername} disabled={!usernameChanged || !trimmedUsername || busy !== null}>
                        {busy === 'username' ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className='account-info-section'>
                <h3 className='account-info-section-title'>Email</h3>
                <p className='account-info-detail'>Current: {user?.email}</p>
                <div className='account-info-field'>
                    <label htmlFor="account-info-new-email" className='account-info-label'>New email</label>
                    <input
                        id="account-info-new-email"
                        className='account-info-input'
                        type="email"
                        autoComplete="email"
                        value={newEmail}
                        onChange={(e) => { setNewEmail(e.target.value); setEmailStatus(null); }}
                    />
                </div>
                <div className='account-info-field'>
                    <label htmlFor="account-info-email-password" className='account-info-label'>Current password</label>
                    <input
                        id="account-info-email-password"
                        className='account-info-input'
                        type="password"
                        autoComplete="current-password"
                        value={emailPassword}
                        onChange={(e) => { setEmailPassword(e.target.value); setEmailStatus(null); }}
                    />
                </div>
                {renderStatus(emailStatus)}
                <div className='account-info-actions'>
                    <button className='account-info-button account-info-button-save' onClick={handleSaveEmail} disabled={!newEmail.trim() || !emailPassword || busy !== null}>
                        {busy === 'email' ? 'Sending...' : 'Change email'}
                    </button>
                </div>
            </div>

            <div className='account-info-section'>
                <h3 className='account-info-section-title'>Password</h3>
                <div className='account-info-field'>
                    <label htmlFor="account-info-current-password" className='account-info-label'>Current password</label>
                    <input
                        id="account-info-current-password"
                        className='account-info-input'
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPasswordStatus(null); }}
                    />
                </div>
                <div className='account-info-field'>
                    <label htmlFor="account-info-new-password" className='account-info-label'>New password</label>
                    <input
                        id="account-info-new-password"
                        className='account-info-input'
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordStatus(null); }}
                    />
                </div>
                <div className='account-info-field'>
                    <label htmlFor="account-info-confirm-password" className='account-info-label'>Confirm new password</label>
                    <input
                        id="account-info-confirm-password"
                        className='account-info-input'
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPasswordStatus(null); }}
                    />
                </div>
                {renderStatus(passwordStatus)}
                <div className='account-info-actions'>
                    <button className='account-info-button account-info-button-save' onClick={handleSavePassword} disabled={!currentPassword || !newPassword || !confirmPassword || busy !== null}>
                        {busy === 'password' ? 'Saving...' : 'Change password'}
                    </button>
                </div>
            </div>

            <div className='account-info-section'>
                <h3 className='account-info-section-title'>Account created</h3>
                <p className='account-info-detail'>{createdAtLabel}</p>
            </div>

            <div className='account-info-section'>
                <h3 className='account-info-section-title'>Delete account</h3>
                <p className='account-info-detail'>Permanently deletes your account and profile. This can't be undone.</p>

                {/* The first click only opens this confirmation box. The account is only deleted from the button inside it, once the password is entered. */}
                {confirmingDelete ? (
                    <div className='account-info-confirm'>
                        <p className='account-info-confirm-message'>Are you sure you want to delete your account? Enter your password to confirm.</p>
                        <input
                            className='account-info-input'
                            type="password"
                            autoComplete="current-password"
                            aria-label="Password"
                            value={deletePassword}
                            onChange={(e) => { setDeletePassword(e.target.value); setDeleteStatus(null); }}
                        />
                        {renderStatus(deleteStatus)}
                        <div className='account-info-actions'>
                            <button className='account-info-button' onClick={handleCancelDelete} disabled={busy === 'delete'}>Cancel</button>
                            <button className='account-info-button account-info-button-danger' onClick={handleDeleteAccount} disabled={!deletePassword || busy !== null}>
                                {busy === 'delete' ? 'Deleting...' : 'Delete account'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className='account-info-actions'>
                        <button className='account-info-button account-info-button-danger' onClick={() => setConfirmingDelete(true)} disabled={busy !== null}>
                            Delete account
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountInfoForm;
