import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './SearchBar.css';

function SearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (query.trim().length > 0) {
                searchUsers();
            } else {
                setResults([]);
                setShowResults(false);
            }
        }, 300); // Debounce search

        return () => clearTimeout(delaySearch);
    }, [query]);

    const searchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': token }
            });
            setResults(response.data);
            setShowResults(true);
        } catch (error) {
            console.error('Error searching users:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUserClick = (userId) => {
        navigate(`/profile/${userId}`);
        setShowResults(false);
        setQuery('');
    };

    const handleBlur = () => {
        // Delay hiding results to allow click events to fire
        setTimeout(() => setShowResults(false), 300);
    };

    return (
        <div className="search-bar-container">
            <div className="search-input-wrapper">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search users..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.trim().length > 0 && setShowResults(true)}
                    onBlur={handleBlur}
                />
                <i className="bi bi-search search-icon"></i>
            </div>

            {showResults && (
                <div className="search-results">
                    {loading ? (
                        <>

                        </>
                    ) : results.length > 0 ? (
                        results.map((user) => (
                            <div
                                key={user._id}
                                className="search-result-item"
                                onMouseDown={() => handleUserClick(user._id)}
                            >
                                <div className="user-avatar">
                                    {user.userName.charAt(0).toUpperCase()}
                                </div>
                                <div className="user-info">
                                    <div className="user-name">{user.userName}</div>
                                    <div className="user-email">{user.email}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="search-result-item no-results">
                            No users found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SearchBar;
