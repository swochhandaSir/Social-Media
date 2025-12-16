import React from 'react';
import { API_URL } from '../config';
import '../Home.css'; // Reusing Home.css for post styles

const PostCard = ({
    post,
    userId,
    onLike,
    onDelete,
    onAddComment,
    commentInput,
    setCommentInput
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="post-card">
            {/* Post Header */}
            <div className="post-header">
                <div className="post-user-info">
                    <div className="post-avatar">
                        {post.author?.userName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="post-meta">
                        <span className="post-username">{post.author?.userName || 'Unknown'}</span>
                        <span className="post-time">{formatDate(post.createdAt)}</span>
                    </div>
                </div>
                {(() => {
                    const authorId = post.author?._id || post.author;
                    if (authorId && (authorId === userId || authorId.toString() === userId)) {
                        return (
                            <button className="btn-ghost" onClick={() => onDelete(post._id)}>
                                <i className="bi bi-trash3" style={{ color: '#ef4444' }}></i>
                            </button>
                        );
                    }
                    return null;
                })()}
            </div>

            {/* Post Content */}
            <div className="post-content">
                {post.content}
            </div>

            {/* Post Media */}
            {post.file && (
                <div className="post-media">
                    {post.file.includes(".mp4") ? (
                        <video controls>
                            <source src={`${API_URL}/uploads/${post.file}`} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <img src={`${API_URL}/uploads/${post.file}`} alt="Post content" />
                    )}
                </div>
            )}

            {/* Post Stats */}
            <div className="post-stats">
                <span>{post.likes ? post.likes.length : 0} likes</span>
                <span>{post.comments ? post.comments.length : 0} comments</span>
            </div>

            {/* Post Actions */}
            <div className="post-actions">
                <button
                    className={`action-btn ${post.likes && post.likes.includes(userId) ? 'liked' : ''}`}
                    onClick={() => onLike(post._id)}
                >
                    <i className={`bi ${post.likes && post.likes.includes(userId) ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                    Like
                </button>
                <button
                    className="action-btn"
                    onClick={() => document.getElementById(`comment-input-${post._id}`).focus()}
                >
                    <i className="bi bi-chat"></i>
                    Comment
                </button>
                <button className="action-btn">
                    <i className="bi bi-share"></i>
                    Share
                </button>
            </div>

            {/* Comments Section */}
            <div className="comments-section">
                {post.comments && post.comments.length > 0 && (
                    <ul className="comment-list">
                        {post.comments.map((comment, index) => (
                            <li key={index} className="comment-item">
                                <span className="comment-author">{comment.author?.userName || 'Unknown'}</span>
                                {comment.text}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="comment-input-group">
                    <input
                        id={`comment-input-${post._id}`}
                        type="text"
                        placeholder="Write a comment..."
                        className="comment-input"
                        value={commentInput || ""}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && onAddComment(post._id, commentInput)}
                    />
                    <button
                        onClick={() => onAddComment(post._id, commentInput)}
                        className="post-btn"
                        disabled={!commentInput}
                    >
                        Post
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostCard;
