import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import VideoCall from './VideoCall';
import './Calls.css';

function Calls() {
    const [activeTab, setActiveTab] = useState('contacts');
    const [searchTerm, setSearchTerm] = useState('');
    const [contacts, setContacts] = useState([]);
    const [callHistory, setCallHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [activeCallUser, setActiveCallUser] = useState(null);
    const currentUserId = localStorage.getItem('userId');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');

                // Fetch Call History
                const callsRes = await axios.get('${API_URL}/api/calls', {
                    headers: { Authorization: token }
                });
                setCallHistory(callsRes.data);

                // Fetch Contacts (All users for now, filtered by search)
                const usersRes = await axios.get(`${API_URL}/api/users/search?q=${searchTerm || 'a'}`,
                    {
                        headers: { Authorization: token }
                    });
                setContacts(usersRes.data.filter(u => u._id !== currentUserId));

            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [searchTerm, currentUserId]);

    const handleStartCall = (contact, type) => {
        console.log(`Starting ${type} call with ${contact.userName}`);
        setActiveCallUser(contact);
        setShowVideoCall(true);
    };

    const handleCloseCall = () => {
        setShowVideoCall(false);
        setActiveCallUser(null);
        // Refresh call history after call ends
        setSearchTerm(prev => prev); // Trigger re-fetch or call fetchData directly if extracted
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        if (diff < 24 * 60 * 60 * 1000) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <div className="calls-page">
            <div className="calls-tabs">
                <button
                    className={`tab-trigger ${activeTab === 'contacts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('contacts')}
                >
                    Contacts
                </button>
                <button
                    className={`tab-trigger ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    Recent
                </button>
            </div>

            {activeTab === 'contacts' && (
                <div className="contacts-view">
                    <div className="search-container">
                        <i className="bi bi-search search-icon"></i>
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="list-container">
                        {loading ? <div className="empty-state">Loading...</div> : (
                            contacts.map(contact => (
                                <div key={contact._id} className="contact-card">
                                    <div className="avatar-container">
                                        <div className="avatar-image">
                                            {contact.userName.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="info-container">
                                        <h3 className="contact-name">{contact.userName}</h3>
                                        <p className="contact-status">
                                            {contact.email}
                                        </p>
                                    </div>
                                    <div className="actions-container">
                                        <button
                                            className="action-icon-btn"
                                            onClick={() => handleStartCall(contact, 'voice')}
                                        >
                                            <i className="bi bi-telephone"></i>
                                        </button>
                                        <button
                                            className="action-icon-btn"
                                            onClick={() => handleStartCall(contact, 'video')}
                                        >
                                            <i className="bi bi-camera-video"></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                        {!loading && contacts.length === 0 && (
                            <div className="empty-state">No contacts found</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="history-view">
                    <div className="list-container">
                        {loading ? <div className="empty-state">Loading...</div> : (
                            callHistory.map(call => {
                                const isCaller = call.caller._id === currentUserId;
                                const otherUser = isCaller ? call.receiver : call.caller;
                                const callTypeDisplay = call.status === 'missed' ? 'Missed' : (isCaller ? 'Outgoing' : 'Incoming');

                                return (
                                    <div key={call._id} className="history-card">
                                        <div className="avatar-container">
                                            <div className="avatar-image">
                                                {otherUser?.userName?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                        </div>
                                        <div className="info-container">
                                            <h3 className="contact-name">{otherUser?.userName || 'Unknown'}</h3>
                                            <div className="call-details">
                                                <i className={`bi ${call.type === 'video' ? 'bi-camera-video' : 'bi-telephone'}`}></i>
                                                <span className={call.status === 'missed' ? 'missed-call' : ''}>
                                                    {callTypeDisplay}
                                                </span>
                                                <span>•</span>
                                                <span>{formatDate(call.createdAt)}</span>
                                                {call.duration > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatDuration(call.duration)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="actions-container">
                                            <button
                                                className="action-icon-btn"
                                                onClick={() => handleStartCall(otherUser, call.type)}
                                            >
                                                <i className={`bi ${call.type === 'video' ? 'bi-camera-video' : 'bi-telephone'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {!loading && callHistory.length === 0 && (
                            <div className="empty-state">No call history</div>
                        )}
                    </div>
                </div>
            )}

            {showVideoCall && activeCallUser && (
                <VideoCall
                    otherUser={activeCallUser}
                    onClose={handleCloseCall}
                />
            )}
        </div>
    );
}

export default Calls;
