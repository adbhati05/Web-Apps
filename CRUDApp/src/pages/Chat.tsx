import TopBar from "../components/TopBar";
import LeftSideBar from "../components/LeftSideBar";
import "./Chat.css";

const Chat = () => {
    return (
        <div>
            <TopBar />
            <div className="chat-main-layout">
                <div className="chat-left-side-bar">
                    <LeftSideBar />
                </div>
                <div className="chat-container">Chat</div>
            </div>
        </div>
    );
};

export default Chat;