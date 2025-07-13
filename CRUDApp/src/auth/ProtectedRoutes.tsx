import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoutes = () => {
    // Setting up a boolean called isAuth to check if the user is legitimate and logged in.
    const isAuth: boolean = true;

    // This hook will give us the current location of the user in the app. It'll be used to keep track of where the user was before being redirected if they're not logged in.
    const location = useLocation();

    // If the user is logged in, then the Outlet component will be rendered, which will render the components belonging to the protected routes (like the ones for the home page, style board page, etc). If not, redirect user to login page.
    return isAuth ? (<Outlet />) : (
        <Navigate to='/login' state={{ from: location }} />
    );
}

export default ProtectedRoutes;