import './PostFeed.css';
import PostCard from './PostCard';

const PostFeed = () => {
    return (
        <div className='post-feed-container'>
            <PostCard
                username="User"
                dateCreated="Date"
                caption="Caption"
                imageURL="Image URL"
                likes={[]}
                commentsCount={0}
                pieces={[]}
            />
        </div>
    );
}

export default PostFeed;