import './Error.css';
import { Link, useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../auth/UserAuthContext';
import { logError } from '../utils/logger';

// This page displays an error message when something goes wrong in the application. It covers two cases:
// 1. Page not found (404): the URL doesn't match any route. routes.tsx sends every unknown URL here with a catch-all "*" route.
// 2. Something crashed: a page threw an error while rendering. Every route in routes.tsx uses this page as its errorElement, which React Router shows instead of a blank screen.
const Error = () => {
    // useRouteError gives back whatever went wrong. It's undefined when this page is rendered by the catch-all route (nothing crashed, the page just doesn't exist).
    const error = useRouteError();

    // isRouteErrorResponse is true for errors React Router creates itself, like a 404. Anything else is a real crash.
    const notFound = !error || (isRouteErrorResponse(error) && error.status === 404);

    if (!notFound) logError("Page crashed:", error);

    // When the signed-in user's profile couldn't be loaded (or doesn't exist), ProtectedRoutes sends them here. Going home would just land back on this page, so they get a way to sign out instead.
    const { status, signOut } = useUserAuth();
    const navigate = useNavigate();
    const profileProblem = status === 'error' || status === 'noProfile';

    const handleSignOut = async () => {
        try {
            await signOut();
        } finally {
            // Navigating also clears this error screen (React Router resets it on every navigation).
            navigate('/login', { replace: true });
        }
    };

    return (
        <div className="error-layout">
            <div className="error-card">
                <p className="error-code">{notFound ? '404' : 'Oops'}</p>
                <h1 className="error-title">{notFound ? "This page doesn't exist" : 'Something went wrong'}</h1>
                <p className="error-text">
                    {notFound
                        ? "The link might be broken, or the page may have been moved or removed."
                        : "This page ran into a problem. Reloading usually fixes it."}
                </p>

                <div className="error-actions">
                    {/* Reloading only helps when something crashed, so a 404 just gets the way home. */}
                    {!notFound && (
                        <button className="error-button" onClick={() => window.location.reload()}>Reload</button>
                    )}
                    {profileProblem ? (
                        <button className="error-button error-button-primary" onClick={handleSignOut}>Sign out</button>
                    ) : (
                        <Link to="/" className="error-button error-button-primary">Go home</Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Error;
