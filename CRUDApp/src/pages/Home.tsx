import TopBar from '../components/TopBar';
import LeftSideBar from '../components/LeftSideBar';
import RightSideBar from '../components/RightSideBar';
import PostFeed from '../components/PostFeed';
import PostCard from '../components/PostCard';
import './Home.css';

const Home = () => {
    return (
        <div>
            <TopBar />
            <div className='home-main-layout'>
                <div className='home-left-side-bar'><LeftSideBar /></div>
                <div className='post-feed'>
                    <PostFeed />
                    <PostCard />
                </div>
                <div className='home-right-side-bar'><RightSideBar /></div>
            </div>
        </div>
        
    );
}

export default Home;