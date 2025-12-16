import React, { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "./apiConfig";
import SkeletonPost from "./components/SkeletonPost";
import PostCard from "./components/PostCard";
import "./Home.css";

function Home() {
    const [commentInput, setCommentInput] = useState({});
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        setLoading(true);
        axios
            .get("${API_URL}/api/posts")
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
            .post(`${API_URL}/api/posts/like/${postId}`, {}, {
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
            .delete(`${API_URL}/api/posts/${postId}`, {
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
            .post(`${API_URL}/api/posts/comment/${postId}`, {
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

    return (
        <div className="home">
            {loading ? (
                <>
                    <SkeletonPost />
                    <SkeletonPost />
                    <SkeletonPost />
                </>
            ) : (
                posts.map((post) => (
                    <PostCard
                        key={post._id}
                        post={post}
                        userId={userId}
                        onLike={handleLike}
                        onDelete={handleDelete}
                        onAddComment={handleAddComment}
                        commentInput={commentInput[post._id]}
                        setCommentInput={(value) => setCommentInput({ ...commentInput, [post._id]: value })}
                    />
                ))
            )}
        </div>
    );
}

export default Home;