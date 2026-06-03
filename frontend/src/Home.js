import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { VariableSizeList as List } from "react-window";
import { API_URL } from "./apiConfig";
import SkeletonPost from "./components/SkeletonPost";
import PostCard from "./components/PostCard";
import "./Home.css";

const PAGE_SIZE = 20;
const ESTIMATED_POST_HEIGHT = 320;
const LOADER_ROW_HEIGHT = 520;

const normalizePostsResponse = (data) => {
    if (Array.isArray(data)) {
        return {
            posts: data,
            nextCursor: null,
            hasMore: false
        };
    }

    if (data && Array.isArray(data.posts)) {
        return {
            posts: data.posts,
            nextCursor: data.nextCursor || null,
            hasMore: Boolean(data.hasMore)
        };
    }

    return {
        posts: [],
        nextCursor: null,
        hasMore: false
    };
};

function FeedRow({ index, style, data }) {
    const rowRef = useRef(null);

    useEffect(() => {
        if (!rowRef.current || index >= data.posts.length) {
            return undefined;
        }

        const updateHeight = () => {
            if (rowRef.current) {
                data.setRowHeight(index, rowRef.current.getBoundingClientRect().height);
            }
        };

        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(rowRef.current);

        return () => observer.disconnect();
    }, [data, index]);

    if (index >= data.posts.length) {
        return (
            <div style={style} className="feed-loader-row">
                <SkeletonPost />
            </div>
        );
    }

    const post = data.posts[index];

    return (
        <div style={style}>
            <div ref={rowRef} className="feed-row">
                <PostCard
                    post={post}
                    userId={data.userId}
                    onLike={data.handleLike}
                    onDelete={data.handleDelete}
                    onAddComment={data.handleAddComment}
                    commentInput={data.commentInput[post._id]}
                    setCommentInput={(value) => data.setPostCommentInput(post._id, value)}
                />
            </div>
        </div>
    );
}

function Home() {
    const [commentInput, setCommentInput] = useState({});
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [feedHeight, setFeedHeight] = useState(() => Math.max(window.innerHeight - 96, 480));
    const listRef = useRef(null);
    const rowHeights = useRef({});
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        const updateHeight = () => setFeedHeight(Math.max(window.innerHeight - 96, 480));
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const fetchPosts = useCallback(async ({ cursor = null, append = false } = {}) => {
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await axios.get(`${API_URL}/api/posts`, {
                headers: {
                    Authorization: localStorage.getItem('token') || ''
                },
                params: {
                    limit: PAGE_SIZE,
                    ...(cursor ? { cursor } : {})
                }
            });

            const payload = normalizePostsResponse(response.data);

            setPosts((currentPosts) => append ? [...currentPosts, ...payload.posts] : payload.posts);
            setNextCursor(payload.nextCursor);
            setHasMore(payload.hasMore);
        } catch (error) {
            console.error("Error fetching posts:", error);
            if (!append) {
                setPosts([]);
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const handleLike = useCallback((postId) => {
        const token = localStorage.getItem('token');
        axios
            .post(`${API_URL}/api/posts/like/${postId}`, {}, {
                headers: { 'Authorization': token }
            })
            .then((response) => {
                setPosts((currentPosts) => currentPosts.map((post) =>
                    post._id === postId ? response.data : post
                ));
            })
            .catch((error) => console.error("Error liking post:", error));
    }, []);

    const handleDelete = useCallback((postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        const token = localStorage.getItem('token');
        axios
            .delete(`${API_URL}/api/posts/${postId}`, {
                headers: { 'Authorization': token }
            })
            .then(() => {
                setPosts((currentPosts) => currentPosts.filter((post) => post._id !== postId));
            })
            .catch((error) => console.error("Error deleting post:", error));
    }, []);

    const handleAddComment = useCallback((postId, commentText) => {
        if (!commentText) return;
        const token = localStorage.getItem('token');
        axios
            .post(`${API_URL}/api/posts/comment/${postId}`, {
                text: commentText,
            }, {
                headers: { 'Authorization': token }
            })
            .then((response) => {
                setPosts((currentPosts) => currentPosts.map((post) =>
                    post._id === postId ? response.data : post
                ));
                setCommentInput((currentInput) => ({ ...currentInput, [postId]: "" }));
            })
            .catch((error) => console.error("Error adding comment:", error));
    }, []);

    const setPostCommentInput = useCallback((postId, value) => {
        setCommentInput((currentInput) => ({ ...currentInput, [postId]: value }));
    }, []);

    const loadMorePosts = useCallback(() => {
        if (!loadingMore && hasMore && nextCursor) {
            fetchPosts({ cursor: nextCursor, append: true });
        }
    }, [fetchPosts, hasMore, loadingMore, nextCursor]);

    const setRowHeight = useCallback((index, height) => {
        const nextHeight = Math.ceil(height);
        if (rowHeights.current[index] === nextHeight) {
            return;
        }

        rowHeights.current[index] = nextHeight;
        listRef.current?.resetAfterIndex(index);
    }, []);

    const getRowHeight = useCallback((index) => {
        if (index >= posts.length) {
            return LOADER_ROW_HEIGHT;
        }

        return rowHeights.current[index] || ESTIMATED_POST_HEIGHT;
    }, [posts.length]);

    const itemData = useMemo(() => ({
        posts,
        userId,
        commentInput,
        handleLike,
        handleDelete,
        handleAddComment,
        setPostCommentInput,
        setRowHeight,
        hasMore,
        loadingMore
    }), [posts, userId, commentInput, handleLike, handleDelete, handleAddComment, setPostCommentInput, setRowHeight, hasMore, loadingMore]);

    const itemCount = hasMore ? posts.length + 1 : posts.length;

    const handleItemsRendered = useCallback(({ visibleStopIndex }) => {
        if (visibleStopIndex >= posts.length - 4) {
            loadMorePosts();
        }
    }, [loadMorePosts, posts.length]);

    return (
        <div className="home">
            {loading ? (
                <>
                    <SkeletonPost />
                    <SkeletonPost />
                    <SkeletonPost />
                </>
            ) : (
                Array.isArray(posts) && posts.length > 0 ? (
                    <List
                        ref={listRef}
                        className="virtual-feed"
                        height={feedHeight}
                        itemCount={itemCount}
                        itemData={itemData}
                        itemKey={(index, data) => data.posts[index]?._id || 'feed-loader'}
                        itemSize={getRowHeight}
                        onItemsRendered={handleItemsRendered}
                        overscanCount={3}
                        width="100%"
                    >
                        {FeedRow}
                    </List>
                ) : (
                    <div className="no-posts">
                        <p>No posts available.</p>
                    </div>
                )
            )}
        </div>
    );
}

export default Home;
