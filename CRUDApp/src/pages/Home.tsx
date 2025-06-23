import TopBar from '../components/TopBar';
import SideBar from '../components/LeftSideBar';
import PostFeed from '../components/PostFeed';
import PostCard from '../components/PostCard';

function Home() {
    return (
        <div>
            <TopBar />
            <SideBar />
            <PostFeed />
            <PostCard />
        </div>
    );
}

export default Home;