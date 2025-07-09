import './LeftSideBar.css';

const LeftSideBar: React.FunctionComponent = () => {
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
        </div>
    );
}

export default LeftSideBar;