import React from 'react';
import './SkeletonProfileHeader.css';

const SkeletonProfileHeader = () => {
    return (
        <div className="skeleton-profile-container" aria-hidden="true">
            <div className="skeleton-banner placeholder"></div>
            <div className="skeleton-header-content">
                <div className="skeleton-avatar-wrapper">
                    <div className="skeleton-avatar-large placeholder"></div>
                </div>
                <div className="skeleton-info">
                    <span className="placeholder col-6 skeleton-name"></span>
                    <span className="placeholder col-4 skeleton-username"></span>
                    <span className="placeholder col-8 skeleton-bio"></span>
                </div>
            </div>
        </div>
    );
};

export default SkeletonProfileHeader;
