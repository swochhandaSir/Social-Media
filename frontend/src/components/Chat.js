import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useSocket } from '../contexts/SocketContext';
import './Chat.css';

function Chat({ otherUser, onClose, onVideoCall }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const { socket } = useSocket();
    const currentUserId = localStorage.getItem('userId');

    useEffect(() => {
        loadMessages();
        markAsRead();

        if (socket) {
            socket.on('receive-message', handleReceiveMessage);
            socket.on('message-sent', handleMessageSent);
            socket.on('user-typing', handleUserTyping);
        }

        return () => {
            if (socket) {
                socket.off('receive-message', handleReceiveMessage);
                socket.off('message-sent', handleMessageSent);
                socket.off('user-typing', handleUserTyping);
            }
        };
    }, [socket, otherUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/messages/${otherUser._id}`, {
                headers: { 'Authorization': token }
            });
            setMessages(response.data);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const markAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/messages/read/${otherUser._id}`, {}, {
                headers: { 'Authorization': token }
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const handleReceiveMessage = (message) => {
        if (message.sender._id === otherUser._id || message.sender === otherUser._id) {
            setMessages(prev => [...prev, message]);
            markAsRead();
        }
    };

    const handleMessageSent = (message) => {
        // Message already added optimistically, just update with server version
        setMessages(prev => {
            const filtered = prev.filter(m => !m.tempId);
            return [...filtered, message];
        });
    };

    const handleUserTyping = (data) => {
        if (data.from === otherUser._id) {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 3000);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        const tempMessage = {
            tempId: Date.now(),
            sender: { _id: currentUserId, userName: localStorage.getItem('userName') },
            receiver: { _id: otherUser._id, userName: otherUser.userName },
            text: newMessage,
            createdAt: new Date()
        };

        setMessages(prev => [...prev, tempMessage]);

        socket.emit('send-message', {
            sender: currentUserId,
            receiver: otherUser._id,
            text: newMessage
        });

        setNewMessage('');
    };

    const handleTyping = () => {
        if (socket) {
            socket.emit('typing', { to: otherUser._id, from: currentUserId });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            // Typing stopped
        }, 1000);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-user-info">
                    <div className="chat-avatar">
                        {otherUser.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3>{otherUser.userName}</h3>
                        {isTyping && <span className="typing-indicator">typing...</span>}
                    </div>
                </div>
                <div className="chat-header-actions">
                    {onVideoCall && (
                        <i onClick={onVideoCall} className="bi bi-camera-video"></i>
                    )}
                    <button onClick={onClose} className="close-chat-btn">✕</button>
                </div>
            </div>

            <div className="messages-container">
                {messages.map((message, index) => (
                    <div
                        key={message._id || message.tempId || index}
                        className={`message ${message.sender._id === currentUserId || message.sender === currentUserId ? 'sent' : 'received'}`}
                    >
                        <div className="message-content">
                            <p>{message.text}</p>
                            <span className="message-time">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="message-input-form">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                    }}
                    placeholder="Type a message..."
                    className="message-input"
                />
                <button type="submit" className="send-btn">
                    Send
                </button>
            </form>
        </div>
    );
}

export default Chat;
