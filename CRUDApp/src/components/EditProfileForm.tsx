import './EditProfileForm.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
import { useState, useRef } from 'react';
import { profileService, type ProfileUpdate } from '../services/profile.service';
import { storageService } from '../services/storage.service';
import { useUserAuth } from '../auth/UserAuthContext';
import type { UserInfo } from '../types';

// These match the limits in the users rules (profileFieldsValid in firestore.rules), so the inputs stop the user before the server would reject the save.
const DISPLAY_NAME_MAX = 30;
const BIO_MAX = 150;

// This component is the Edit profile section of the Settings page: picture, display name, and bio. The Settings page decides when it's shown, this handles the form itself and saving it.
const EditProfileForm = ({ profile }: { profile: UserInfo }) => {

    const { refreshUserInfo } = useUserAuth();

    // Each field keeps its own draft, so nothing on the real profile changes until Save, and Discard just resets the drafts.
    const [displayName, setDisplayName] = useState(profile.displayName);
    const [bio, setBio] = useState(profile.bio || '');

    // photoPreview holds a newly picked picture (as a data URL) until it's saved. removePhoto is set when the user clears their current picture instead.
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [removePhoto, setRemovePhoto] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Same hidden file input trick as UploadPhotoField: the real input stays invisible and the Change photo button clicks it through this ref.
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        // Clearing the input right away so picking the same file again still fires onChange.
        e.target.value = '';
        if (!file) return;

        // Same 5MB cap as the post upload field. It gets compressed well below that before upload anyway.
        if (file.size > 5 * 1024 * 1024) {
            setError("That photo is too large (max 5MB).");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
            setRemovePhoto(false);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setRemovePhoto(true);
    };

    // Puts every draft back to what's currently saved on the profile.
    const handleDiscard = () => {
        setDisplayName(profile.displayName);
        setBio(profile.bio || '');
        setPhotoPreview(null);
        setRemovePhoto(false);
        setError(null);
    };

    // What the picture preview should show right now: a newly picked photo, the placeholder if it's being removed, otherwise the current one.
    const shownPhoto = photoPreview ?? (removePhoto ? pfp_placeholder : profile.profilePicURL || pfp_placeholder);
    const hasPhoto = !!photoPreview || (!removePhoto && !!profile.profilePicURL);

    const trimmedName = displayName.trim();
    const trimmedBio = bio.trim();
    const hasChanges = trimmedName !== profile.displayName
        || trimmedBio !== (profile.bio || '')
        || photoPreview !== null
        || removePhoto;

    const handleSave = async () => {
        // Guarding against an empty name, saving with nothing changed, and double submits.
        if (!trimmedName || !hasChanges || saving) return;

        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            const updates: ProfileUpdate = { displayName: trimmedName, bio: trimmedBio };

            // A new photo is uploaded first so its download URL can go into the same update. Removing sets it to an empty string, which the UI treats as "use the placeholder".
            if (photoPreview) {
                updates.profilePicURL = await storageService.uploadProfileImage(photoPreview, profile.uid);
            } else if (removePhoto) {
                updates.profilePicURL = '';
            }

            await profileService.updateProfile(profile.uid, updates);

            // The old picture is deleted only after the new URL is saved, so a failed save never leaves the profile pointing at a deleted file.
            // This is best effort: if it fails the file is just orphaned in Storage, which isn't worth failing the whole save over.
            if ((photoPreview || removePhoto) && profile.profilePicURL) {
                try {
                    await storageService.deleteImage(profile.profilePicURL);
                } catch (error) {
                    console.error("Failed to delete old profile picture:", error);
                }
            }

            // Pulls the updated doc into the auth context, which the top bar and profile page read from, and which passes the new values back down here as the profile prop.
            await refreshUserInfo();

            // The drafts now match what was saved, so they're settled to the trimmed values and the picked photo is cleared.
            setDisplayName(trimmedName);
            setBio(trimmedBio);
            setPhotoPreview(null);
            setRemovePhoto(false);
            setSaved(true);
        } catch (error) {
            console.error("Failed to save profile:", error);
            setError("Couldn't save your profile. Try again.");
        }
        setSaving(false);
    };

    return (
        <div className='edit-profile-container'>
            <h2 className='edit-profile-title'>Edit profile</h2>

            <div className='edit-profile-photo-row'>
                <img src={shownPhoto} alt="Profile" className='edit-profile-pfp' />
                <div className='edit-profile-photo-text'>
                    <p className='edit-profile-username'>{profile.username}</p>
                    <p className='edit-profile-display-name'>{profile.displayName}</p>
                </div>
                <div className='edit-profile-photo-actions'>
                    <button className='edit-profile-button edit-profile-button-save' onClick={() => fileInputRef.current?.click()} disabled={saving}>
                        Change photo
                    </button>
                    {hasPhoto && (
                        <button className='edit-profile-button' onClick={handleRemovePhoto} disabled={saving}>Remove</button>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                />
            </div>

            {/* Name and Bio share one box, since they're the profile info that shows up together at the top of your profile page. */}
            <div className='edit-profile-info'>
                <div className='edit-profile-field'>
                    <label htmlFor="edit-profile-name" className='edit-profile-label'>Name</label>
                    <input
                        id="edit-profile-name"
                        className='edit-profile-input'
                        type="text"
                        value={displayName}
                        maxLength={DISPLAY_NAME_MAX}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                </div>

                <div className='edit-profile-field'>
                    <label htmlFor="edit-profile-bio" className='edit-profile-label'>Bio</label>
                    <textarea
                        id="edit-profile-bio"
                        className='edit-profile-textarea'
                        value={bio}
                        maxLength={BIO_MAX}
                        placeholder="Tell people about your style..."
                        onChange={(e) => setBio(e.target.value)}
                    />
                    <span className='edit-profile-char-count'>{bio.length} / {BIO_MAX}</span>
                </div>
            </div>

            {error && <p className='edit-profile-error'>{error}</p>}

            {/* Only shown until the next edit, so it never sits next to unsaved changes. */}
            {saved && !hasChanges && <p className='edit-profile-success'>Profile saved.</p>}

            <div className='edit-profile-actions'>
                <button className='edit-profile-button' onClick={handleDiscard} disabled={!hasChanges || saving}>Discard</button>
                <button className='edit-profile-button edit-profile-button-save' onClick={handleSave} disabled={!trimmedName || !hasChanges || saving}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
};

export default EditProfileForm;
