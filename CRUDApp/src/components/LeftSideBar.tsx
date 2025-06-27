import './LeftSideBar.css';
import pfp_placeholder from '../assets/pfp_placeholder.png';
// import test_img from '../assets/test_img.png'; (when using an image other than the placeholder, the image gets distorted, figure out how to fix that)

function LeftSideBar() {
    return (
        // Here I've set up a container for the buttons in the side bar that is a flex box that causes the buttons to stack vertically, not horizontally stretch, and be sized to their contents.
        // I've also included some horizontal lines to separate the buttons/or links to other pages. 
        <div className='d-flex flex-column align-items-start spacing'>
            <button className='left-side-bar-nav'>Home</button> 
            <hr className='left-side-bar-line'/> 
            <button className='left-side-bar-nav'>Style Board</button>
            <hr className='left-side-bar-line'/>
            <button className='left-side-bar-nav'>Saved</button>
            <hr className='left-side-bar-line'/>
            
            {/* This is the code for the profile picture button that, when clicked, will expand a dropdown that will allow the user to access Settings or Log out. */}
            <div className='mt-auto profile-dropdown'>
                <button className='pfp-button'>
                    <img src={pfp_placeholder} alt='Profile' className='pfp' />
                    <span className='username'>John Doe</span>
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

export default LeftSideBar;