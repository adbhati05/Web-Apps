import { Navigate } from 'react-router-dom';
import SignUpCard from '../auth/SignUpCard';
import { useUserAuth } from '../auth/UserAuthContext';
import './SignUp.css';

const SignUp = () => {
    const { status } = useUserAuth();

    // Someone who's already signed in has no use for this form, so they're sent home instead.
    if (status === 'ready') return <Navigate to="/" replace />;

    return (
        <div className='sign-up-layout'><SignUpCard /></div>
    );
}

export default SignUp;