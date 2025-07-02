import './LoginCard.css';

function LoginCard() {
    return (
        // Do research on how to do the backend stuff necessary for the log-in process via Firebase on YT.
        // Also, note that the user will input their email when logging in, but upon sign-up they will be required to create a username so that when they're in the site their username will be shown.
        // Below is the code for the login card component. 
        <div className='login-card-content'>Fit Log
            {/* This form is for the two bars in which the user will input their email and password. */}
            <form className='login-input-content'>
                <label className='login-input-label' htmlFor='Email'>Email:</label>
                <input className='login-input-bar' type='text' id=''/>

                <label className='login-input-label' htmlFor='Password'>Password:</label>
                <input className='login-input-bar' type='text' id=''/>
            </form>

            {/* This is the link to the sign-up page. */}
            <a className='sign-up-link' href=''>Don't have an account? Sign up here.</a>

            {/* This is the button that will submit the form and log the user into the home page. */}
            <button className='sign-in-button' type='submit'>Sign in</button>
        </div>
    );
}

export default LoginCard;