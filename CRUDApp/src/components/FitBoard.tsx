import './FitBoard.css';
import { BsPlusLg } from 'react-icons/bs';
import LoadingSpinner from './LoadingSpinner';
import { FIT_SECTIONS, getFitLabel } from '../services/fit.service';
import type { Fit } from '../types';

// This component is the main part of the style board: a grid with a "Plan a fit" square in the top left (styled like the photo upload field) that starts planning a new fit, followed by every planned fit (oldest first, filling the rows left to right).
// Each fit card shows its name (or "Fit #" plus its spot on the board when it doesn't have one) and its pieces grouped by part of the outfit. Clicking a card opens it for editing.
interface FitBoardProps {
    fits: Fit[],
    loading: boolean,
    error: boolean,
    onAddClick: () => void,
    onFitClick: (fit: Fit) => void,
}

const FitBoard = ({ fits, loading, error, onAddClick, onFitClick }: FitBoardProps) => {
    if (loading) return <LoadingSpinner label="Loading your fits..." />;
    if (error) return <p className='fit-board-message'>Couldn't load your fits. Try reloading the page.</p>;

    return (
        <div className='fit-board-grid'>
            {/* Laid out exactly like the photo upload field on the Post page: a dashed gray square with a big static icon, and an oval button under it. Only the button is clickable. */}
            <div className='fit-board-add-field'>
                <BsPlusLg className='fit-board-add-icon' aria-hidden="true" />
                <button className='fit-board-add-button' onClick={onAddClick}>Plan a fit</button>
            </div>

            {fits.map((fit, index) => (
                <button key={fit.id} className='fit-board-card' onClick={() => onFitClick(fit)}>
                    <span className='fit-board-card-title'>{getFitLabel(fit, index)}</span>

                    {/* Only the parts of the outfit that have pieces are listed, each with its pieces' names. */}
                    <div className='fit-board-card-sections'>
                        {FIT_SECTIONS.filter(({ key }) => fit.sections[key]?.length).map(({ key, label }) => (
                            <div key={key} className='fit-board-card-section'>
                                <span className='fit-board-card-section-label'>{label}</span>
                                <span className='fit-board-card-section-pieces'>{fit.sections[key].map(piece => piece.name).join(', ')}</span>
                            </div>
                        ))}
                    </div>
                </button>
            ))}
        </div>
    );
};

export default FitBoard;
