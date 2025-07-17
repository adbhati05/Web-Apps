import TopBar from '../components/TopBar';
import LeftSideBar from '../components/LeftSideBar';
import './StyleBoard.css';

const StyleBoard = () => {
    return (
        <div>
            <TopBar />
            <div className='style-board-main-layout'>
                <div className='style-board-left-side-bar'><LeftSideBar /></div>
                <div className='style-board-container'>Style Board Content</div>
            </div>
        </div>
    );
}

export default StyleBoard;