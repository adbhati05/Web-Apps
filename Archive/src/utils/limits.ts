// This file will house every length/count limit the app enforces in its inputs. Each one mirrors a check in rules/firestore.rules which is where they're actually enforced on the server.
// Any changes to these limits will need to be reflected both here and in the rules.

// Username bounds (allowed characters live in getUsernameError (src/utils/validation.ts))
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;

// Profile info bounds
export const DISPLAY_NAME_MAX = 30;
export const BIO_MAX = 150;

// Post info bounds (same piece cap applies to archived pieces as well)
export const CAPTION_MAX = 500;
export const PIECES_MAX = 8;
export const PIECE_FIELD_MAX = 100;

// Comment and chat message bounds
export const COMMENT_MAX = 500;
export const MESSAGE_MAX = 1000;

// Fit info bounds
export const FIT_NAME_MAX = 40;
export const FIT_SECTION_MAX = 10;

