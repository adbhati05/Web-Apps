import TopBar from '../components/TopBar';
import LeftSideBar from '../components/LeftSideBar';
import './Post.css';

const Post = () => {
    return (
        <div>
            <TopBar />
            <div className='post-main-layout'>
                <div className='post-left-side-bar'><LeftSideBar /></div>
                <div className='post-container'>Create a Post</div>
            </div>
        </div>
    );
}

export default Post;