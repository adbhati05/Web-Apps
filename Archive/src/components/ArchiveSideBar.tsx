import './ArchiveSideBar.css';
import { BsPlus } from 'react-icons/bs';
import PieceItem from './PieceItem';
import LoadingSpinner from './LoadingSpinner';
import type { ArchivedPiece } from '../types';

// This component is the style board's right side bar, labeled "Archive": every piece the user has favorited from posts or added themselves, newest first.
// Each piece says who it's from and uses the same PieceItem as the post cards, so a piece with details can be expanded the same way. Its menu has Remove.
// The Add piece button at the top opens the overlay for adding one of your own pieces (the style board page handles opening it and the saving).
interface ArchiveSideBarProps {
    pieces: ArchivedPiece[],
    loading: boolean,
    error: boolean,
    onAddClick: () => void,
    onRemove: (piece: ArchivedPiece) => void,
}

const ArchiveSideBar = ({ pieces, loading, error, onAddClick, onRemove }: ArchiveSideBarProps) => {
    return (
        <div className='archive-side-bar-container'>
            <h2 className='archive-side-bar-title'>Archive</h2>

            <button className='archive-side-bar-add-button' onClick={onAddClick}>
                <BsPlus />
                Add piece
            </button>

            {loading ? (
                <LoadingSpinner size="sm" label="Loading archive..." />
            ) : error ? (
                <p className='archive-side-bar-message'>Couldn't load your archive.</p>
            ) : pieces.length === 0 ? (
                <p className='archive-side-bar-message'>No pieces yet. Favorite a piece from a post on the feed, or add one of your own.</p>
            ) : (
                <div className='archive-side-bar-list'>
                    {pieces.map((piece) => (
                        <PieceItem
                            key={piece.id}
                            piece={piece}
                            hasDetails={piece.hasDetails}
                            // Your own pieces say so, and favorites name the person whose post they came from.
                            subtitle={piece.source === 'own' ? 'Your piece' : `from ${piece.fromUsername}`}
                            actions={[{ label: 'Remove', onClick: () => onRemove(piece), danger: true }]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default ArchiveSideBar;
