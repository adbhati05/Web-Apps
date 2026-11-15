import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserAuth } from './UserAuthContext';
import Loading from '../pages/Loading';

const ProtectedRoutes = () => {
    // Leveraging the useUserAuth hook to get the current state from the auth context.
    const { status } = useUserAuth();

    // This hook will give us the current location of the user in the app. It'll be used to keep track of where the user was before being redirected if they're not logged in.
    const location = useLocation();

    switch (status) {
        // This executes when Firebase hasn't reported who's signed in yet, or if the profile is still loading.
        case 'loading':
            return <Loading />;
        
        // This executes when the user is signed in and their profile is loaded: the only case where pages should render.
        case 'ready':
            return <Outlet />;
        
        // This executes when the user is signed in, but the profile couldn't be loaded (context already logs the cause so no need to log it here).
        // Throwing an error during render hands it to the route's errorElement, so the "Something went wrong" page will show with the message below.
        case 'error':
            throw new Error("Couldn't load your profile.");
        
        // This executes when the user is signed in, but there's no profile doc present (sign-up failed partway see audit item C-02).
        // For now, this is treated as an error, but ideally an optional CompleteProfile page should be rendered here.
        case 'noProfile':
            throw new Error("Your account has no profile.");
        
        // This executes when the user is signed out: the only case where the user should be redirected to the login page.
        case 'signedOut':
            return <Navigate to='/login' state={{ from: location }} replace />;
    }
};

export default ProtectedRoutes;