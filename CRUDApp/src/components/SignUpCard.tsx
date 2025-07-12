import './SignUpCard.css';
import { useState } from 'react';
import type { UserSignUp } from '../types';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../auth/UserAuthContext';

const initialValue: UserSignUp = {
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
};

const SignUpCard = () => {
    const[userSignUpInfo, setUserSignUpInfo] = useState<UserSignUp>(initialValue);
    const navigate = useNavigate();

    // Importing the signUp function from UserAuthContext to handle user registration.
    const { signUp } = useUserAuth();

    // This function uses the id attribute of the input field it's located in to update the userInfo state object with the value entered by the user via setUserInfo.
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setUserSignUpInfo({...userSignUpInfo, [id]: value});
    };

    // This function ensures that when the user presses the "Sign up" button, the form will not perform its default action (page refresh) and will instead call signUp with the appropriate args and forward the user to the home page.
    // Note: In future, include email verification before allowing the user to log in from sign up (look into this).
    const handleSubmit = async(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            console.log("The user info is: ", userSignUpInfo);
            await signUp(userSignUpInfo.email, userSignUpInfo.password);
            navigate("/");
        } catch (error) {
            console.log("An error occurred while signing up: ", error);
        }
    }

    return (
        // Below is a username input field, an email input field, password/confirm password input field (in that order, a set of password rules, and a submit button. 
        // Password rules: At least 8 characters, at least one uppercase and lowercase letter, at least one number, and at least one special character.
        <div className='sign-up-card-container'>Create Account
            <form className='sign-up-form-container' onSubmit={handleSubmit}>
                <div className='sign-up-input-field-container'>
                    <label className='sign-up-input-label' htmlFor='Username'>Username:</label>
                    <input className='sign-up-input-bar' id='username'type='username' placeholder='Must be 12 characters max' value={userSignUpInfo.username} onChange={handleChange}/>
                </div>

                <div className='sign-up-input-field-container'>
                    <label className='sign-up-input-label' htmlFor='Email'>Email:</label> 
                    <input className='sign-up-input-bar' id='email'type='email' value={userSignUpInfo.email} onChange={handleChange}/>
                </div>

                <div className='sign-up-input-field-container'>
                    <label className='sign-up-input-label' htmlFor='Password'>Password:</label>
                    <input className='sign-up-input-bar' id='password' type='password' placeholder='See rules below' value={userSignUpInfo.password} onChange={handleChange}/>
                </div>

                <div className='sign-up-input-field-container'>
                    <label className='sign-up-input-label' htmlFor='ConfirmPassword'>Confirm Password:</label>
                    <input className='sign-up-input-bar' id='confirmPassword' type='password' value={userSignUpInfo.confirmPassword} onChange={handleChange}/>
                </div>

                <ul className='password-rules'>
                    <li>Must be at least 8 characters long.</li>
                    <li>Must contain at least one uppercase letter.</li>
                    <li>Must contain at least one lowercase letter.</li>
                    <li>Must contain at least one number.</li>
                    <li>Must contain at least one special character.</li>
                </ul>

                <button className='sign-up-button' type='submit'>Sign up</button>
            </form>
        </div>
    );
}

export default SignUpCard;