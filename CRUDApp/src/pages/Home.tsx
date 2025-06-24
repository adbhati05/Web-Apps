import TopBar from '../components/TopBar';
import SideBar from '../components/LeftSideBar';
import PostFeed from '../components/PostFeed';
import PostCard from '../components/PostCard';
import './Home.css';

function Home() {
    return (
        <div className="container">
            <TopBar />
            <SideBar />
            <PostFeed />
            <PostCard />
        </div>
    );
}

export default Home;