import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUserAuth } from './UserAuthContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';

const ProtectedRoutes = () => {
    // Initializing an Auth instance to gain access to all of its functionalities (like checking user auth state, loading, error, etc).
    const auth = getAuth();
    const [user, loading, error] = useAuthState(auth);

    // This hook will give us the current location of the user in the app. It'll be used to keep track of where the user was before being redirected if they're not logged in.
    const location = useLocation();

    // This helps ensure that if the user is logged in, they access and stay in (they won't be redirected if the user refreshes or goes to another protected route) the protected routes. 
    if (loading) {
        return <div>Loading...</div>; // Try to replace this with a loading spinner or any other loading component (style it nicely).
    }
     
    // If the user is logged in, then the Outlet component will be rendered (which means that ONLY components belonging to the protected routes, like the ones for home page or styleboard page, are rendered). If not, redirect user to login page.
    return user ? (<Outlet />) : (
        <Navigate to='/login' state={{ from: location }} />
    );
}

export default ProtectedRoutes;