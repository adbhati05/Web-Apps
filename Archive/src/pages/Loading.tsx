import { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import './Loading.css';

// How long the page waits before saying the load is taking a while.
const SLOW_LOAD_MS = 10000;

// This page fills the whole screen while the app is still figuring out whether the user is signed in (see ProtectedRoutes), which is the first thing that happens on every page load.
// It's just the app name and the spinner. It fades in after a short delay, so on a fast load (the usual case) it never flashes on screen at all.
// If loading takes longer than SLOW_LOAD_MS (opening the app offline, for instance, where the profile never arrives), a short message says so instead of spinning silently forever.
const Loading = () => {
    const [slow, setSlow] = useState(false);

    // The timer is cleared if the page goes away first (the usual case), so the message never shows after a normal load.
    useEffect(() => {
        const timer = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="loading-page">
            <h1 className="loading-page-title">Archive</h1>
            <LoadingSpinner />
            {slow && <p className="loading-page-message">This is taking longer than usual. Check your connection.</p>}
        </div>
    );
};

export default Loading;
