import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SkeletonPost from './SkeletonPost';
import SkeletonProfileHeader from './SkeletonProfileHeader';
import Chat from './Chat';
import VideoCall from './VideoCall';
import { useSocket } from '../contexts/SocketContext';
import './Profile.css';

function Profile() {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const { userId: profileUserId } = useParams();
    const currentUserId = localStorage.getItem('userId');
    const { onlineUsers } = useSocket();

    // If no userId in params, show current user's profile
    const targetUserId = profileUserId || currentUserId;
    const isOwnProfile = targetUserId === currentUserId;

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:5000/api/users/profile/${targetUserId}`, {
                    headers: { Authorization: token }
                });
                setUser(res.data.user);
                setPosts(res.data.posts);
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        };

        if (targetUserId) {
            fetchProfile();
        }
    }, [targetUserId]);

    const handleDelete = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/posts/${postId}`, {
                headers: { Authorization: token }
            });
            setPosts(posts.filter(post => post._id !== postId));
        } catch (err) {
            console.error("Error deleting post:", err);
        }
    };

    const openChat = () => {
        setShowChat(true);
        setShowVideoCall(false);
    };

    const openVideoCall = () => {
        setShowVideoCall(true);
        setShowChat(false);
    };

    const closeChat = () => {
        setShowChat(false);
    };

    const closeVideoCall = () => {
        setShowVideoCall(false);
    };

    const isUserOnline = () => {
        return onlineUsers.has(targetUserId);
    };

    if (loading) {
        return (
            <div className="profile-page">
                <SkeletonProfileHeader />
                <div className="profile-posts-section">
                    <h3>Posts</h3>
                    <SkeletonPost />
                    <SkeletonPost />
                    <SkeletonPost />
                </div>
            </div>
        );
    }

    if (!user) return <div className="error-container">User not found</div>;

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="profile-avatar-large">
                    {user.userName.charAt(0).toUpperCase()}
                    {!isOwnProfile && isUserOnline() && (
                        <span className="online-indicator-large"></span>
                    )}
                </div>
                <div className="profile-info">
                    <h2>{user.userName}</h2>
                    <p className="profile-email">{user.email}</p>
                    <p className="profile-member-since">
                        Member since: {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                    {!isOwnProfile && isUserOnline() && (
                        <span className="online-status">🟢 Online</span>
                    )}
                </div>
                {!isOwnProfile && (
                    <div className="profile-actions">
                        <i onClick={openChat} className="bi bi-chat-dots" style={{ fontSize: '4vh' }}></i>
                        <i onClick={openVideoCall} className="bi bi-camera-video" style={{ fontSize: '4vh' }}></i>
                    </div>
                )}
            </div>

            <div className="profile-posts-section">
                <h3>{isOwnProfile ? 'My Posts' : `${user.userName}'s Posts`}</h3>
                {posts.length === 0 ? (
                    <p className="no-posts">No posts yet.</p>
                ) : (
                    posts.map((post) => (
                        <div key={post._id} className="post">
                            <h3>{post.author && post.author.userName ? post.author.userName : 'Unknown'}</h3>
                            <p>{post.content}</p>
                            {post.file && (
                                <div>
                                    {post.file.includes(".mp4") ? (
                                        <video width="320" height="240" controls>
                                            <source src={`http://localhost:5000/uploads/${post.file}`} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    ) : (
                                        <img src={`http://localhost:5000/uploads/${post.file}`} alt="Post Media" />
                                    )}
                                </div>
                            )}
                            <div className="post-actions">
                                <span>❤️ {post.likes ? post.likes.length : 0} Likes</span>
                                <span>💬 {post.comments.length} Comments</span>
                                {isOwnProfile && (
                                    <i className="bi bi-trash3-fill" onClick={() => handleDelete(post._id)} style={{ color: 'red', marginLeft: 'auto', cursor: 'pointer' }}></i>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showChat && user && (
                <Chat
                    otherUser={user}
                    onClose={closeChat}
                    onVideoCall={() => {
                        setShowChat(false);
                        setShowVideoCall(true);
                    }}
                />
            )}

            {showVideoCall && user && (
                <VideoCall otherUser={user} onClose={closeVideoCall} />
            )}
        </div>
    );
}

export default Profile;
