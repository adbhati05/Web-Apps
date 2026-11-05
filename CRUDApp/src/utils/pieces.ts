// Shared helpers for copying a piece (PieceDetail) somewhere else: into the archive, into a fit, or onto a comment about a piece.
import type { PieceDetail } from '../types';

// Copies just a piece's own fields. A piece without details only keeps its name, since posts store empty strings for the details even when details are off, and those shouldn't follow the piece around.
// Missing details become empty strings, so every copy has the same shape (which keeps the security rules' field checks simple).
export function copyPiece(piece: PieceDetail, hasDetails: boolean): PieceDetail {
    if (!hasDetails) return { name: piece.name };

    return {
        name: piece.name,
        price: piece.price ?? '',
        size: piece.size ?? '',
        materials: piece.materials ?? '',
        dateAcquired: piece.dateAcquired ?? '',
    };
}
