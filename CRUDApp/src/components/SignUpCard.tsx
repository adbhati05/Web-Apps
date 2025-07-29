import './SignUpCard.css';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../auth/UserAuthContext';
import { authService } from '../services/auth.service';
import { Link } from 'react-router-dom';

// NOTE: More validation/error-handling code will need to be implemented. DO RESEARCH!
const SignUpCard = () => {
    // Setting up the userSignUpInfo state object to hold the user's sign-up information.
    const [userSignUpInfo, setUserSignUpInfo] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
    });

    // Setting up useNavigate hook to navigate user to the home page after successful sign-up.
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

        // Checking if username is valid by setting up a regex that ensures it can only contain A-z, a-z, 0-9, and underscores.
        const usernameRegex = /^[A-Za-z0-9_]+$/;
        if (!usernameRegex.test(userSignUpInfo.username)) {
            alert("Username can only contain letters, numbers, and underscores.");
            return;
        }

        // Checking if username is available via checkUsernameExists from authService.
        const isUsernameAvailable = await authService.checkUsernameExists(userSignUpInfo.username);
        if (isUsernameAvailable) {
            alert("Username is already taken.");
            return;
        }

        // First ensuring password is long enough before proceeding with other checks.
        if (userSignUpInfo.password.length < 8) {
            alert("Password must be at least 8 characters long.");
            return;
        } else {
            // Left out `, \, /, ', ", <, and > since these speial characters can cause issues if input is not properly sanitized, leading to XSS or SQL injection attacks.
            // Setting up a constant for special characters check.
            const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '-', '+', '=', '{', '}', '[', ']', ':', ';', ',', '.', '?', '~', '|'];
            const hasSpecialChar = specialChars.some(char => userSignUpInfo.password.includes(char));

            // Setting up constants for uppercase, lowercase, and number checks.
            const hasUpperCase = /[A-Z]/.test(userSignUpInfo.password);
            const hasLowerCase = /[a-z]/.test(userSignUpInfo.password);
            const hasNumber = /\d/.test(userSignUpInfo.password);

            if (!hasSpecialChar) {
                alert("Password must contain at least one special character.");
                return;
            }

            if (!hasUpperCase) {
                alert("Password must contain at least one uppercase letter.");
                return;
            }

            if (!hasLowerCase) {
                alert("Password must contain at least one lowercase letter.");
                return;
            }

            if (!hasNumber) {
                alert("Password must contain at least one number.");
                return;
            }
        }

        // Ensure passwords match before proceeding with sign up.
        if (userSignUpInfo.password !== userSignUpInfo.confirmPassword) {
            alert("Passwords must match.");
            return;
        }

        try {
            // Logging user info to console for debugging purposes. Will not be in production.
            console.log("The user info is: ", userSignUpInfo);
            await signUp(userSignUpInfo.email, userSignUpInfo.password, userSignUpInfo.username);
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
                    <input className='sign-up-input-bar' id='username'type='username' placeholder='Must be 12 characters max' value={userSignUpInfo.username} onChange={handleChange} required maxLength={12}/>
                </div>

                <div className='sign-up-input-field-container'>
                    <label className='sign-up-input-label' htmlFor='Email'>Email:</label> 
                    <input className='sign-up-input-bar' id='email'type='email' value={userSignUpInfo.email} onChange={handleChange} required/>
                </div>

                <div className='sign-up-input-field-container'>
                    <label className='sign-up-input-label' htmlFor='Password'>Password:</label>
                    <input className='sign-up-input-bar' id='password' type='password' placeholder='See rules below' value={userSignUpInfo.password} onChange={handleChange} required/>
                </div>

                <div className='sign-up-input-field-container'>
                    <label className='sign-up-input-label' htmlFor='ConfirmPassword'>Confirm Password:</label>
                    <input className='sign-up-input-bar' id='confirmPassword' type='password' value={userSignUpInfo.confirmPassword} onChange={handleChange} required/>
                </div>

                <ul className='password-rules'>
                    <li>Must be at least 8 characters long.</li>
                    <li>Must contain at least one uppercase letter.</li>
                    <li>Must contain at least one lowercase letter.</li>
                    <li>Must contain at least one number.</li>
                    <li>Must contain at least one special character.</li>
                </ul>

                <button className='sign-up-button' type='submit'>Sign up</button>

                {/* Add CSS to make link match with rest of card. */}
                <div className='login-link-container'>
                    <p>
                        Already have an account? Log in <Link className='login-link' to="/login">here.</Link>
                    </p>
                </div>
            </form>
        </div>
    );
}

export default SignUpCard;