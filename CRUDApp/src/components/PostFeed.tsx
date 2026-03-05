import './PostFeed.css';
import PostCard from './PostCard';

// For now I'll use placeholders in order to visualize how the card will look since I'm currently working on the post card's aesthetics. 
// Eventually, this component will fetch all posts from the database and display them in the feed.
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