import TopBar from '../components/TopBar';
import LeftSideBar from '../components/LeftSideBar';
import './Saved.css';

const Saved = () => {
    return (
       <div>
            <TopBar />
            <div className='saved-main-layout'>
                <div className='saved-left-side-bar'><LeftSideBar /></div>
                <div className='saved-container'>Saved Content (LOL IF YOU SEE THIS FUCK YOU BEN)</div>
            </div>
        </div>
    );
}

export default Saved;