import './LoadingSpinner.css';

// This component is the app's one loading indicator: three small dots in the accent color (with the app's usual border) that gently pulse one after another, plus an optional label under it ("Loading comments...", for instance).
// It replaces the plain "Loading..." text that every page used to show, so loading looks the same everywhere. The full-screen Loading page uses it too.
interface LoadingSpinnerProps {
    label?: string,
    size?: 'sm' | 'md', // sm for inside panels and lists (comments, chat), md (the default) for whole pages and sections.
}

const LoadingSpinner = ({ label, size = 'md' }: LoadingSpinnerProps) => {
    return (
        // role="status" makes screen readers announce the label, since the dots on their own say nothing.
        <div className={`loading-spinner-container loading-spinner-${size}`} role="status">
            <span className='loading-spinner' aria-hidden="true">
                <span className='loading-spinner-dot' />
                <span className='loading-spinner-dot' />
                <span className='loading-spinner-dot' />
            </span>
            {label ? <span className='loading-spinner-label'>{label}</span> : <span className='loading-spinner-hidden-label'>Loading</span>}
        </div>
    );
};

export default LoadingSpinner;
