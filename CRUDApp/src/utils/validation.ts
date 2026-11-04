// Shared input checks for anything that sets a username or password (the sign-up card's rules, pulled out so the Account info settings can enforce the exact same ones).
// Each function returns an error message to show the user, or null if the value is fine.

// Usernames can only contain A-Z, a-z, 0-9, and underscores.
export function getUsernameError(username: string): string | null {
    if (!/^[A-Za-z0-9_]+$/.test(username)) {
        return "Username can only contain letters, numbers, and underscores.";
    }
    return null;
}

// Left out `, \, /, ', ", <, and > since these special characters can cause issues if input is not properly sanitized.
const SPECIAL_CHARS = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '-', '+', '=', '{', '}', '[', ']', ':', ';', ',', '.', '?', '~', '|'];

// Passwords need at least 8 characters plus one each of a special character, an uppercase letter, a lowercase letter, and a number.
export function getPasswordError(password: string): string | null {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!SPECIAL_CHARS.some((char) => password.includes(char))) return "Password must contain at least one special character.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/\d/.test(password)) return "Password must contain at least one number.";
    return null;
}
