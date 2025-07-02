import './SignUpCard.css';

function SignUpCard() {
    return (
        // Include a username input field, an email input field, and a password/confirm password input field (in that order). Be sure to include password rules as well as a paragraph.
        // Password rules: At least 8 characters, at least one uppercase and lowercase letter, at least one number, and at least one special character.
        <div className='sign-up-card-content'>Create Account
            {/* This form is for the four bars in which the user will input their username, email, password, and confirm password. */}
            <form className='sign-up-input-content'>
                <label className='sign-up-input-label' htmlFor='Username'>Username:</label>
                <input className='sign-up-input-bar' type='text' id=''/>

                <label className='sign-up-input-label' htmlFor='Email'>Email:</label>
                <input className='sign-up-input-bar' type='text' id=''/>

                <label className='sign-up-input-label' htmlFor='Password'>Password:</label>
                <input className='sign-up-input-bar' type='password' id=''/>

                <label className='sign-up-input-label' htmlFor='ConfirmPassword'>Confirm Password:</label>
                <input className='sign-up-input-bar' type='password' id=''/>
            </form>

            {/* This is the unordered list that contains the password rules. */}
            <ul className='password-rules'>
                <li>Must be at least 8 characters long.</li>
                <li>Must contain at least one uppercase letter.</li>
                <li>Must contain at least one lowercase letter.</li>
                <li>Must contain at least one number.</li>
                <li>Must contain at least one special character.</li>
            </ul>

            {/* This is the create account button that will submit the form, create the account, and forward the user to the log in page to use their new credentials. */}
            <button className='sign-up-button' type='submit'>Sign up</button>
        </div>
    );
}

export default SignUpCard;