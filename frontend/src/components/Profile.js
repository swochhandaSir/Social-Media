import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SkeletonProfileHeader from './SkeletonProfileHeader';
import PostCard from './PostCard';
import Chat from './Chat';
import VideoCall from './VideoCall';
import { useSocket } from '../contexts/SocketContext';
import './Profile.css';

function Profile() {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('posts');
    const [showChat, setShowChat] = useState(false);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [commentInput, setCommentInput] = useState({});

    const { userId: profileUserId } = useParams();
    const currentUserId = localStorage.getItem('userId');
    const { onlineUsers } = useSocket();

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

    const handleLike = (postId) => {
        const token = localStorage.getItem('token');
        axios
            .post(`http://localhost:5000/api/posts/like/${postId}`, {}, {
                headers: { 'Authorization': token }
            })
            .then((response) => {
                const updatedPosts = posts.map((post) =>
                    post._id === postId ? response.data : post
                );
                setPosts(updatedPosts);
            })
            .catch((error) => console.error("Error liking post:", error));
    };

    const handleDelete = (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        const token = localStorage.getItem('token');
        axios
            .delete(`http://localhost:5000/api/posts/${postId}`, {
                headers: { 'Authorization': token }
            })
            .then(() => {
                setPosts(posts.filter((post) => post._id !== postId));
            })
            .catch((error) => console.error("Error deleting post:", error));
    };

    const handleAddComment = (postId, commentText) => {
        if (!commentText) return;
        const token = localStorage.getItem('token');
        axios
            .post(`http://localhost:5000/api/posts/comment/${postId}`, {
                text: commentText,
            }, {
                headers: { 'Authorization': token }
            })
            .then((response) => {
                const updatedPosts = posts.map((post) =>
                    post._id === postId ? response.data : post
                );
                setPosts(updatedPosts);
                setCommentInput({ ...commentInput, [postId]: "" });
            })
            .catch((error) => console.error("Error adding comment:", error));
    };

    const isUserOnline = () => {
        return onlineUsers.has(targetUserId);
    };

    const openChat = () => {
        setShowChat(true);
        setShowVideoCall(false);
    };

    const openVideoCall = () => {
        setShowVideoCall(true);
        setShowChat(false);
    };

    if (loading) {
        return (
            <div className="profile-page">
                <SkeletonProfileHeader />
                <div className="posts-list">
                    {/* Skeleton posts could be added here if needed, but header is main part */}
                </div>
            </div>
        );
    }

    if (!user) return <div className="error-container">User not found</div>;

    return (
        <div className="profile-page">
            {/* Banner */}
            <div className="profile-banner"></div>

            <div className="profile-header-content">
                {/* Avatar */}
                <div className="profile-avatar-wrapper">
                    <div className="profile-avatar-large">
                        {user.userName.charAt(0).toUpperCase()}
                    </div>
                    {!isOwnProfile && isUserOnline() && (
                        <span className="online-indicator-large"></span>
                    )}
                </div>

                {/* Info & Actions */}
                <div className="profile-details">
                    <div className="profile-top-row">
                        <div className="profile-name-section">
                            <h2>{user.userName}</h2>
                            <p className="profile-username">@{user.userName.toLowerCase().replace(/\s+/g, '')}</p>
                        </div>
                        <div className="profile-actions">
                            {isOwnProfile ? (
                                <>
                                    <button className="btn-ghost" style={{ border: '1px solid #e2e8f0' }}>
                                        <i className="bi bi-pencil"></i> Edit Profile
                                    </button>
                                    <button className="btn-ghost" style={{ border: '1px solid #e2e8f0' }}>
                                        <i className="bi bi-gear"></i>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={openChat} className="btn-ghost" style={{ border: '1px solid #e2e8f0' }}>
                                        <i className="bi bi-chat-dots"></i> Message
                                    </button>
                                    <button onClick={openVideoCall} className="btn-ghost" style={{ border: '1px solid #e2e8f0' }}>
                                        <i className="bi bi-camera-video"></i> Call
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <p className="profile-bio">
                        Member since {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                    </p>

                    {/* Stats */}
                    <div className="profile-stats">
                        <div className="stat-item">
                            <span className="stat-value">{posts.length}</span>
                            <span className="stat-label">Posts</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">0</span>
                            <span className="stat-label">Followers</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">0</span>
                            <span className="stat-label">Following</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="profile-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('posts')}
                    >
                        <i className="bi bi-grid-3x3"></i> Posts
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
                        onClick={() => setActiveTab('saved')}
                    >
                        <i className="bi bi-bookmark"></i> Saved
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'tagged' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tagged')}
                    >
                        <i className="bi bi-person-badge"></i> Tagged
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'posts' && (
                    <div className="posts-list-view">
                        {posts.length === 0 ? (
                            <div className="no-posts">
                                <i className="bi bi-camera"></i>
                                <p>No posts yet</p>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <PostCard
                                    key={post._id}
                                    post={{
                                        ...post,
                                        author: (post.author && post.author.userName) ? post.author : user
                                    }}
                                    userId={currentUserId}
                                    onLike={handleLike}
                                    onDelete={handleDelete}
                                    onAddComment={handleAddComment}
                                    commentInput={commentInput[post._id]}
                                    setCommentInput={(value) => setCommentInput({ ...commentInput, [post._id]: value })}
                                />
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'saved' && (
                    <div className="no-posts">
                        <i className="bi bi-bookmark"></i>
                        <p>No saved posts yet</p>
                    </div>
                )}

                {activeTab === 'tagged' && (
                    <div className="no-posts">
                        <i className="bi bi-person-badge"></i>
                        <p>No tagged posts yet</p>
                    </div>
                )}
            </div>

            {showChat && user && (
                <Chat
                    otherUser={user}
                    onClose={() => setShowChat(false)}
                    onVideoCall={() => {
                        setShowChat(false);
                        setShowVideoCall(true);
                    }}
                />
            )}

            {showVideoCall && user && (
                <VideoCall otherUser={user} onClose={() => setShowVideoCall(false)} />
            )}
        </div>
    );
}

export default Profile;
