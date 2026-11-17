import ResetPasswordCard from '../auth/ResetPasswordCard';
import './ResetPassword.css';

// The page a password reset email's link opens. It's public (outside ProtectedRoutes) since the person resetting isn't signed in, and unlike Login it doesn't redirect signed-in users, so a reset link still works from a browser that's logged in.
const ResetPassword = () => {
    return (
        <div className='reset-password-layout'><ResetPasswordCard /></div>
    );
}

export default ResetPassword;
