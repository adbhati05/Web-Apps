import './TopBar.css';
import pfp_placeholder from '../assets/pfp_placeholder.png'; 
// import test_img from '../assets/test_img.png'; // (when using an image other than the placeholder, the image gets distorted, figure out how to fix that)
import { useState, useRef, useEffect } from 'react';

function TopBar() {
    // Creating a hook in which the state variable is a boolean indicating whether the dropdown is open (true) or closed (false) (setter function obviously updates that state whenever the user clicks on the button).
    const [open, setOpen] = useState(false);

    // Creating a mutable reference object for <div> representing dropdown (AKA profile-dropdown).
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Using useEffect to handle clicks outside the dropdown, where if it is open it should close.
    useEffect(() => {
        // Here we are passing a mouseEvent value into handleClickOutside so that we can have the dropdown close if it's been opened and a click has been registered outside of the dropdown.
        const handleClickOutside = (event: MouseEvent) => {
            // If dropdownRef.current exists (meaning that the dropdown has been opened) and the user has clicked anywhere OUTSIDE of the opened dropdown, pass false into setOpen to have the dropdown menu close.
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
 
        // Here we are using the document JS object to represent the entire HTML doc loaded in the browser so that we can pass handleClickOutside into an event listener to register clicks anywhere on the document.
        document.addEventListener('click', handleClickOutside);

        // Final step here is to clean up and remove the event listener when the dropdown re-renders.
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className='top-bar-content'>FitLog
            {/* This is the code for the profile picture button that, when clicked, will expand a dropdown that will allow the user to access Settings or Log out. */}
            <div className='mt-auto profile-dropdown' ref={dropdownRef}>
                <button className='pfp-button' onClick={() => {console.log('Dropdown toggled: ', !open); setOpen(!open);}}> {/* Setting open to false to ensure the dropdown is not expanded when the component mounts. */}
                    <img src={pfp_placeholder} alt='Profile' className='pfp' /> 
                    <span className='username'>John Doe</span> {/* Set username character limit to 12 characters */}
                </button>

                {/* Here the dropdown's content will conditionally render if open is set to true. */}
                {open && (
                    <div className='dropdown-content'>
                        <a href=''>Settings</a>
                        <a href=''>Log out</a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TopBar;