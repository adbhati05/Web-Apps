import { Navigate, useLocation } from 'react-router-dom';
import LoginCard from '../auth/LoginCard';
import { useUserAuth } from '../auth/UserAuthContext';
import './Login.css';

const Login = () => {
    const { status } = useUserAuth();
    const location = useLocation();

    // Someone who's already signed in has no use for this form, so they're sent on: to the page they were headed to (saved by ProtectedRoutes), or home.
    // This also covers the moment right after signing in, if the profile finishes loading before LoginCard's own navigate runs.
    if (status === 'ready') {
        const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';
        return <Navigate to={from} replace />;
    }

    return (
        <div className='login-layout'><LoginCard /></div>
    );
}

export default Login;