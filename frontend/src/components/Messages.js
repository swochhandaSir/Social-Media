import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../apiConfig';
import Chat from './Chat';
import VideoCall from './VideoCall';
import SkeletonConversation from './SkeletonConversation';
import { useSocket } from '../contexts/SocketContext';
import './Messages.css';

function Messages() {
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [loading, setLoading] = useState(true);
    const { socket, onlineUsers } = useSocket();

    useEffect(() => {
        loadConversations();

        if (socket) {
            socket.on('receive-message', () => {
                loadConversations();
            });
        }

        return () => {
            if (socket) {
                socket.off('receive-message');
            }
        };
    }, [socket]);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/conversations`, {
                headers: { 'Authorization': token }
            });
            if (Array.isArray(response.data)) {
                setConversations(response.data);
            } else {
                console.error("API did not return an array:", response.data);
                setConversations([]);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const openChat = (user) => {
        setSelectedUser(user);
        setShowChat(true);
        setShowVideoCall(false);
    };

    const openVideoCall = (user) => {
        setSelectedUser(user);
        setShowVideoCall(true);
        setShowChat(false);
    };

    const closeChat = () => {
        setShowChat(false);
        setSelectedUser(null);
        loadConversations();
    };

    const closeVideoCall = () => {
        setShowVideoCall(false);
        setSelectedUser(null);
    };

    const isUserOnline = (userId) => {
        return onlineUsers.has(userId);
    };

    return (
        <div className="messages-page">
            <h2>Messages</h2>

            {loading ? (
                <div className="conversations-list">
                    <SkeletonConversation />
                    <SkeletonConversation />
                    <SkeletonConversation />
                    <SkeletonConversation />
                </div>
            ) : conversations.length === 0 ? (
                <div className="no-conversations">
                    <p>No conversations yet</p>
                    <p className="hint">Search for users to start chatting!</p>
                </div>
            ) : (
                <div className="conversations-list">
                    {conversations.map((conv) => (
                        <div
                            key={conv.conversationId}
                            className="conversation-item"
                            onClick={() => openChat(conv.otherUser)}
                        >
                            <div className="conversation-avatar-wrapper">
                                <div className="conversation-avatar">
                                    {conv.otherUser.userName.charAt(0).toUpperCase()}
                                </div>
                                {isUserOnline(conv.otherUser._id) && (
                                    <span className="online-indicator"></span>
                                )}
                            </div>
                            <div className="conversation-info">
                                <div className="conversation-header">
                                    <h4>{conv.otherUser.userName}</h4>
                                    {conv.unreadCount > 0 && (
                                        <span className="unread-badge">{conv.unreadCount}</span>
                                    )}
                                </div>
                                <p className="last-message">
                                    {conv.lastMessage.text.substring(0, 50)}
                                    {conv.lastMessage.text.length > 50 ? '...' : ''}
                                </p>
                                <span className="message-time">
                                    {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showChat && selectedUser && (
                <Chat
                    otherUser={selectedUser}
                    onClose={closeChat}
                    onVideoCall={() => {
                        setShowChat(false);
                        setShowVideoCall(true);
                    }}
                />
            )}

            {showVideoCall && selectedUser && (
                <VideoCall otherUser={selectedUser} onClose={closeVideoCall} />
            )}
        </div>
    );
}

export default Messages;
