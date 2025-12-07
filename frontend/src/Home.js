// Home.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import SkeletonPost from "./components/SkeletonPost";

function Home() {
    const [commentInput, setCommentInput] = useState({});
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        setLoading(true);
        axios
            .get("http://localhost:5000/api/posts")
            .then((response) => {
                setPosts(response.data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching posts:", error);
                setLoading(false);
            });
    }, []);

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
            })
            .catch((error) => console.error("Error adding comment:", error));
    };

    return (
        <div className="home">
            <h2>Recent Posts</h2>
            {loading ? (
                <>
                    <SkeletonPost />
                    <SkeletonPost />
                    <SkeletonPost />
                </>
            ) : (
                posts.map((post) => (
                    <div key={post._id} className="post">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>{post.title}</h3>
                            <span style={{ fontSize: '0.9rem', color: '#666' }}>
                                Posted by: <strong>{post.author && post.author.userName ? post.author.userName : 'Unknown'}</strong>
                            </span>
                        </div>
                        <p>{post.content}</p>
                        {post.file && (
                            <div>
                                {post.file.includes(".mp4") ? (
                                    <video width="320" height="240" controls>
                                        <source
                                            src={
                                                `http://localhost:5000/uploads/${post.file}`
                                            }
                                            type="video/mp4"
                                        />
                                        Your browser does not support the video tag.
                                    </video>
                                ) : (
                                    <img
                                        src={
                                            `http://localhost:5000/uploads/${post.file}`
                                        }
                                        alt="Post Media"
                                    />
                                )}
                            </div>
                        )}
                        <div className="post-actions">
                            <button onClick={() => handleLike(post._id)}>
                                <span>{(post.likes && post.likes.includes(userId)) ? '❤️' : '🤍'}</span> {post.likes ? post.likes.length : 0} Likes
                            </button>
                            <button onClick={() => document.getElementById(`comment-input-${post._id}`).focus()}>
                                <span>💬</span> {post.comments.length} Comments
                            </button>
                            {post.author && post.author._id === userId && (
                                <button onClick={() => handleDelete(post._id)} style={{ color: 'red', marginLeft: 'auto' }}>
                                    Delete
                                </button>
                            )}
                        </div>

                        <div className="comments-section">
                            <ul>
                                {post.comments.map((comment, index) => (
                                    <li key={index}>{comment.text}</li>
                                ))}
                            </ul>

                            <div className="comment-form">
                                <input
                                    id={`comment-input-${post._id}`}
                                    type="text"
                                    placeholder="Add a comment..."
                                    className="comment-input"
                                    value={commentInput[post._id] || ""}
                                    onChange={(e) => setCommentInput({ ...commentInput, [post._id]: e.target.value })}
                                />
                                <button
                                    onClick={() => {
                                        handleAddComment(post._id, commentInput[post._id]);
                                        setCommentInput({ ...commentInput, [post._id]: "" });
                                    }}
                                    className="comment-button"
                                >
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default Home;