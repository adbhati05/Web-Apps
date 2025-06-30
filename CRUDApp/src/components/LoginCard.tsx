import './LoginCard.css';

function LoginCard() {
    return (
        // Do research on how to do the backend stuff necessary for the log-in process via Firebase on YT.
        // Also, note that the user will input their email when logging in, but upon sign-up they will be required to create a username so that when they're in the site their username will be shown. 
        <div className='login-card-content'>Fit Log
            <form className='user-input-content'>
                <label className='user-input-label' htmlFor='Email'>Email:</label>
                <input className='user-input-bar' type='text' id=''/>

                <label className='user-input-label' htmlFor='Password'>Password:</label>
                <input className='user-input-bar' type='text' id=''/>
            </form>

            <button className='sign-in-button' type='submit'>Sign in</button>
        </div>
    );
}

export default LoginCard;