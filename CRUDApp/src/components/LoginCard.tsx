import './LoginCard.css';
import { useState } from 'react';
import type { UserLogIn } from '../types';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserAuth } from '../auth/UserAuthContext';

const initialValue: UserLogIn = {
    email: '',
    password: ''
};

const LoginCard = () => {
    // The following code follows the same logic as with the SignUpCard component, but obviously in the context of logging in a user instead.
    const [userLogInInfo, setUserLogInInfo] = useState<UserLogIn>(initialValue);
    const navigate = useNavigate();
    const { logIn } = useUserAuth();

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setUserLogInInfo({ ...userLogInInfo, [id]: value });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            await logIn(userLogInInfo.email, userLogInInfo.password);
            navigate("/");
        } catch (error) {
            console.log("An error occurred while logging in: ", error);
        }
    };

    return (
        // Do research on how to do the backend stuff necessary for the log-in process via Firebase on YT.
        // Below is a login input field, a password input field, a link to the sign-up page, and a submit button.
        // Note: The link to the sign-up page will be a React Router link that will redirect the user to the sign-up page when clicked.
        <div className='login-card-container'>Fit Log
            <form className='login-form-container' onSubmit={handleSubmit}>
                <div className='login-input-field-container'>
                    <input className='login-input-bar' id='email' type='email' placeholder='Email Address' value={userLogInInfo.email} onChange={handleChange}/>
                </div>
                
                <div className='login-input-field-container'>
                    <input className='login-input-bar' id='password' type='password' placeholder='Password' value={userLogInInfo.password} onChange={handleChange}/>
                </div>

                {/* Edit this so that it's a paragraph that says "Don't have an account? Sign up " and then a link that says " here." that redirects the user to the sign-up page. */}
                {/* Make sure that ONLY the link is styled to scale up after being hovered, NOT the entire paragraph. */}
                <p className='sign-up-link'>
                    Don't have an account? Sign up <Link to='/signup'>here.</Link>
                </p>

                <button className='sign-in-button' type='submit'>Sign in</button>
            </form>
        </div>
    );
}

export default LoginCard;