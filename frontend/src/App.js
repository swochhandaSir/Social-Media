// App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Home from './Home';
import CreatePost from './CreatePost';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import Messages from './components/Messages';
import Calls from './components/Calls';
import PrivateRoute from './components/PrivateRoute';
import SearchBar from './components/SearchBar';
import { SocketProvider } from './contexts/SocketContext';
import GlobalCallListener from './components/GlobalCallListener';
import './App.css';
import './AppLayout.css';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const [showMobileSearch, setShowMobileSearch] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="app-container">
      {token && (
        <header className="app-header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">
                <img src="/logo-icon.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h1 className="app-title">SabPara</h1>
            </div>

            <div className="desktop-search-container">
              <SearchBar />
            </div>

            <button className="mobile-search-btn" onClick={() => setShowMobileSearch(true)}>
              <i className="bi bi-search"></i>
            </button>

            {showMobileSearch && (
              <div className="mobile-search-overlay">
                <div className="search-bar-wrapper">
                  <SearchBar />
                </div>
                <button className="close-search-btn" onClick={() => setShowMobileSearch(false)}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
            )}

            <button onClick={() => navigate('/create')} className="create-btn">
              <i className="bi bi-plus-circle"></i>
              <span>Create</span>
            </button>
          </div>
        </header>
      )
      }

      <main className="main-content">
        <Routes>
          <Route path="/create" element={
            <PrivateRoute>
              <CreatePost />
            </PrivateRoute>
          } />
          <Route path="/messages" element={
            <PrivateRoute>
              <Messages />
            </PrivateRoute>
          } />
          <Route path="/calls" element={
            <PrivateRoute>
              <Calls />
            </PrivateRoute>
          } />
          <Route path="/profile/:userId" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
        </Routes>
      </main>

      {
        token && (
          <nav className="bottom-nav">
            <div className="nav-content">
              <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                <i className={`bi ${isActive('/') ? 'bi-house-fill' : 'bi-house'}`} style={{ fontSize: '1.5rem' }}></i>
                <span className="nav-label">Feed</span>
              </Link>

              <Link to="/messages" className={`nav-item ${isActive('/messages') ? 'active' : ''}`}>
                <i className={`bi ${isActive('/messages') ? 'bi-chat-dots-fill' : 'bi-chat-dots'}`} style={{ fontSize: '1.5rem' }}></i>
                <span className="nav-label">Messages</span>
              </Link>

              <Link to="/calls" className={`nav-item ${isActive('/calls') ? 'active' : ''}`}>
                <i className={`bi ${isActive('/calls') ? 'bi-telephone-fill' : 'bi-telephone'}`} style={{ fontSize: '1.5rem' }}></i>
                <span className="nav-label">Calls</span>
              </Link>

              <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                <i className={`bi ${isActive('/profile') ? 'bi-person-fill' : 'bi-person'}`} style={{ fontSize: '1.5rem' }}></i>
                <span className="nav-label">Profile</span>
              </Link>

              <button onClick={handleLogout} className="nav-item">
                <i className="bi bi-box-arrow-right" style={{ fontSize: '1.5rem' }}></i>
                <span className="nav-label">Logout</span>
              </button>
            </div>
          </nav>
        )
      }
    </div >
  );
}

function App() {
  return (
    <Router>
      <SocketProvider>
        <GlobalCallListener />
        <AppContent />
      </SocketProvider>
    </Router>
  );
}

export default App;