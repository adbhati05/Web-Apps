import './TopBar.css';
import pfp_placeholder from '../assets/pfp_placeholder.png'; 
// import test_img from '../assets/test_img.png'; // (when using an image other than the placeholder, the image gets distorted, figure out how to fix that)

function TopBar() {
    return (
        <div className='top-bar-content'>FitLog
            {/* This is the code for the profile picture button that, when clicked, will expand a dropdown that will allow the user to access Settings or Log out. */}
            <div className='mt-auto profile-dropdown'>
                <button className='pfp-button'>
                    <img src={pfp_placeholder} alt='Profile' className='pfp' />
                    <span className='username'>John Doe</span> {/* Set username character limit to 12 characters */}
                </button>
            </div>
        
            {/* Do more research on how to incorporate the dropdown element when the user presses on the pfp button */}
            {/* <div className='dropdown-content'>
                <a href=''>Settings</a>
                <a href=''>Log out</a>
            </div> */}
        </div>
    );
}

export default TopBar;