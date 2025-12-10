import React from 'react';
import './SkeletonConversation.css';

const SkeletonConversation = () => {
    return (
        <div className="conversation-item skeleton-conversation" aria-hidden="true">
            <div className="skeleton-avatar placeholder"></div>
            <div className="conversation-info skeleton-info">
                <div className="skeleton-header-row">
                    <span className="placeholder col-4 skeleton-name"></span>
                    <span className="placeholder col-2 skeleton-time"></span>
                </div>
                <span className="placeholder col-8 skeleton-message"></span>
            </div>
        </div>
    );
};

export default SkeletonConversation;
