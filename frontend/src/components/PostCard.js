import React, { memo, useCallback, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import { API_URL } from '../apiConfig';
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
    const commentInputRef = useRef(null);
    const formattedDate = useMemo(() => {
        const dateString = post.createdAt;
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }, [post.createdAt]);

    const sanitizedContent = useMemo(() => DOMPurify.sanitize(post.content || ''), [post.content]);
    const isLiked = useMemo(
        () => Boolean(post.likedByCurrentUser) || (Array.isArray(post.likes) && post.likes.some((like) => like?.toString() === userId)),
        [post.likedByCurrentUser, post.likes, userId]
    );
    const authorId = post.author?._id || post.author;
    const canDelete = authorId && (authorId === userId || authorId.toString() === userId);
    const likeCount = post.likeCount ?? (post.likes ? post.likes.length : 0);
    const commentCount = post.commentCount ?? (post.comments ? post.comments.length : 0);
    const handleCommentFocus = useCallback(() => {
        commentInputRef.current?.focus();
    }, []);

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
                        <span className="post-time">{formattedDate}</span>
                    </div>
                </div>
                {canDelete && (
                    <button className="btn-ghost" onClick={() => onDelete(post._id)}>
                        <i className="bi bi-trash3" style={{ color: '#ef4444' }}></i>
                    </button>
                )}
            </div>

            {/* Post Content */}
            <div
                className="post-content"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

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
                <span>{likeCount} likes</span>
                <span>{commentCount} comments</span>
            </div>

            {/* Post Actions */}
            <div className="post-actions">
                <button
                    className={`action-btn ${isLiked ? 'liked' : ''}`}
                    onClick={() => onLike(post._id)}
                >
                    <i className={`bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}`}></i>
                    Like
                </button>
                <button
                    className="action-btn"
                    onClick={handleCommentFocus}
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
                        ref={commentInputRef}
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

export default memo(PostCard);
