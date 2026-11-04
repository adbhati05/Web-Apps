// Shared input checks for anything that sets a username or password (the sign-up card's rules, pulled out so the Account info settings can enforce the exact same ones).
// Each function returns an error message to show the user, or null if the value is fine.

// Usernames are 3-16 characters long and can only contain A-Z, a-z, 0-9, and underscores.
// (The length used to only be checked by the browser through the sign-up input's minLength/maxLength, which the custom alerts replaced.)
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;

export function getUsernameError(username: string): string | null {
    if (!username) return "Please enter a username.";
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
        return `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters long.`;
    }
    if (!/^[A-Za-z0-9_]+$/.test(username)) {
        return "Username can only contain letters, numbers, and underscores.";
    }
    return null;
}

// A basic shape check (something@something.something), the same thing the browser's type="email" check looked for. Firebase Auth still has the final say when signing in or up.
export function getEmailError(email: string): string | null {
    if (!email.trim()) return "Please enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid email address.";
    return null;
}

// Left out `, \, /, ', ", <, and > since these special characters can cause issues if input is not properly sanitized.
const SPECIAL_CHARS = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '-', '+', '=', '{', '}', '[', ']', ':', ';', ',', '.', '?', '~', '|'];

// Passwords need at least 8 characters plus one each of a special character, an uppercase letter, a lowercase letter, and a number.
export function getPasswordError(password: string): string | null {
    if (!password) return "Please enter a password.";
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!SPECIAL_CHARS.some((char) => password.includes(char))) return "Password must contain at least one special character.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(password)) return "Password must contain at least one number.";
    return null;
}
