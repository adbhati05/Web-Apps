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
    const [userLoginInfo, setUserLoginInfo] = useState<UserLogIn>(initialValue);
    const navigate = useNavigate();
    const { logIn } = useUserAuth();

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setUserLoginInfo({ ...userLoginInfo, [id]: value });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            await logIn(userLoginInfo.email, userLoginInfo.password);
            navigate("/");
        } catch (error: any) {
            console.log("An error occurred while logging in: ", error);

            if (error.code === 'auth/invalid-credential') {
                alert("Invalid email or password. Please try again.");
            } else if (error.code === 'auth/invalid-email') {
                alert("Please enter a valid email address.");
            } else if (error.code === 'auth/too-many-requests') {
                alert("Too many failed attempts. Please try again later.");
            } else {
                alert("An unexpected error occurred. Please try again.");
            }
        }
    };

    return (
        // Do research on how to do the backend stuff necessary for the log-in process via Firebase on YT.
        // Below is a login input field, a password input field, a link to the sign-up page, and a submit button.
        // Note: The link to the sign-up page will be a React Router link that will redirect the user to the sign-up page when clicked.
        <div className='login-card-container'>Fit Log
            <form className='login-form-container' onSubmit={handleSubmit}>
                <div className='login-input-field-container'>
                    <input className='login-input-bar' id='email' type='email' placeholder='Email Address' value={userLoginInfo.email} onChange={handleChange} required/>
                </div>
                
                <div className='login-input-field-container'>
                    <input className='login-input-bar' id='password' type='password' placeholder='Password' value={userLoginInfo.password} onChange={handleChange} required/>
                </div>

                {/* Edit this so that it's a paragraph that says "Don't have an account? Sign up " and then a link that says " here." that redirects the user to the sign-up page. */}
                {/* Make sure that ONLY the link is styled to scale up after being hovered, NOT the entire paragraph. */}
                <div className='sign-up-link-container'>
                    <p>
                        Don't have an account? Sign up <Link className='sign-up-link' to='/signup'>here.</Link>
                    </p>
                </div>

                <button className='sign-in-button' type='submit'>Sign in</button>
            </form>
        </div>
    );
}

export default LoginCard;