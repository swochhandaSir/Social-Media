import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SkeletonPost from './SkeletonPost';

function Profile() {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`http://localhost:5000/api/users/profile/${userId}`, {
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

        if (userId) {
            fetchProfile();
        }
    }, [userId]);

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

    if (!user) return <div>Loading...</div>;

    return (
        <div className="home"> {/* Reusing home styles for consistency */}
            <h2>{user.userName}'s Profile</h2>
            <div className="auth-container" style={{ margin: '0 auto 2rem', maxWidth: '600px' }}>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Member since:</strong> {new Date().toLocaleDateString()}</p> {/* Placeholder for now */}
            </div>

            <h3>My Posts</h3>
            {loading ? (
                <>
                    <SkeletonPost />
                    <SkeletonPost />
                </>
            ) : posts.length === 0 ? <p style={{ textAlign: 'center' }}>No posts yet.</p> : (
                posts.map((post) => (
                    <div key={post._id} className="post">
                        <h3>{post.title}</h3>
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
                            <button onClick={() => handleDelete(post._id)} style={{ color: 'red', marginLeft: 'auto' }}>
                                Delete
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default Profile;
