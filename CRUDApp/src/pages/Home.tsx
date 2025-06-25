import TopBar from '../components/TopBar';
import LeftSideBar from '../components/LeftSideBar';
import RightSideBar from '../components/RightSideBar';
import PostFeed from '../components/PostFeed';
import PostCard from '../components/PostCard';
import './Home.css';

function Home() {
    return (
        <div>
            <TopBar />
            <div className='main-layout'>
                <div className='left-side-bar'><LeftSideBar /></div>
                <div className='post-feed'>
                    <PostFeed />
                    <PostCard />
                </div>
                <div className='right-side-bar'><RightSideBar /></div>
            </div>
        </div>
        
    );
}

export default Home;