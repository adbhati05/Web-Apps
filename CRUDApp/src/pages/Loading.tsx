import LoadingSpinner from '../components/LoadingSpinner';
import './Loading.css';

// This page fills the whole screen while the app is still figuring out whether the user is signed in (see ProtectedRoutes), which is the first thing that happens on every page load.
// It's just the app name and the spinner. It fades in after a short delay, so on a fast load (the usual case) it never flashes on screen at all.
const Loading = () => {
    return (
        <div className="loading-page">
            <h1 className="loading-page-title">FitLog</h1>
            <LoadingSpinner />
        </div>
    );
};

export default Loading;
