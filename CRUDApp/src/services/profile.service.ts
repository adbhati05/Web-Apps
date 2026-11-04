// This will include all Firebase functionality necessary for viewing and editing user profiles.
// Fetching a single user doc still goes through authService.getUserInfo, this service just builds the profile-specific lookups on top of it.
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { authService } from './auth.service';
import type { UserInfo } from '../types';

// The fields on a user doc that its owner is allowed to edit. Everything else (username, createdAt, the counters) is frozen by the security rules, so the service doesn't accept them either.
export type ProfileUpdate = Partial<Pick<UserInfo, 'displayName' | 'bio' | 'profilePicURL'>>;

// Same idea as postCache in post.service. The feed and the comment overlay look up the author of every post/comment, so without this the same person would be fetched over and over.
// Other users' edits won't show up until a reload (or a fresh fetch, see getProfileByUid), which is fine for pictures and names.
const profileCache = new Map<string, UserInfo>();

export const profileService = {
    // Fetches a profile by UID. Pass fresh = true to skip the cache, which the profile page does so the counts and bio shown there are always current.
    async getProfileByUid(uid: string, fresh = false): Promise<UserInfo | null> {
        if (!fresh && profileCache.has(uid)) {
            return profileCache.get(uid)!;
        }

        const profile = await authService.getUserInfo(uid);
        if (profile) profileCache.set(uid, profile);
        return profile;
    },

    // Fetches a profile by username (what the /profile/:username route has). The usernames collection maps each username to its owner's UID, so this is two reads: the claim doc, then the user doc.
    async getProfileByUsername(username: string, fresh = false): Promise<UserInfo | null> {
        const usernameDoc = await getDoc(doc(db, "usernames", username.toLowerCase()));
        if (!usernameDoc.exists()) return null;

        return this.getProfileByUid(usernameDoc.data().uid, fresh);
    },

    // Fetches several profiles at once and returns them keyed by UID (uid -> profile), used to show each post/comment author's picture and link.
    // A failed lookup is logged and skipped rather than thrown, so one unreadable profile can't blank out the whole feed.
    async getProfilesByUids(uids: string[]): Promise<Record<string, UserInfo>> {
        // new Set() drops duplicate UIDs, so someone with ten posts in the feed is only looked up once.
        const uniqueUids = [...new Set(uids)];

        const profiles = await Promise.all(
            uniqueUids.map(uid => this.getProfileByUid(uid).catch(error => {
                console.error("Failed to load profile:", uid, error);
                return null;
            }))
        );

        const profilesByUid: Record<string, UserInfo> = {};
        profiles.forEach(profile => { if (profile) profilesByUid[profile.uid] = profile; });
        return profilesByUid;
    },

    // Updates the signed-in user's own profile. The security rules only let the owner do this and only let displayName, bio, and profilePicURL change.
    async updateProfile(uid: string, updates: ProfileUpdate): Promise<void> {
        await updateDoc(doc(db, "users", uid), updates);

        // Keep the cached profile in sync.
        if (profileCache.has(uid)) {
            const currentProfile = profileCache.get(uid)!;
            profileCache.set(uid, { ...currentProfile, ...updates });
        }
    }
};
