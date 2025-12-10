import React from 'react';
import './SkeletonProfileHeader.css';

const SkeletonProfileHeader = () => {
    return (
        <div className="profile-header skeleton-profile-header" aria-hidden="true">
            <div className="skeleton-avatar-large placeholder"></div>
            <div className="profile-info skeleton-info">
                <span className="placeholder col-6 skeleton-name"></span>
                <span className="placeholder col-4 skeleton-email"></span>
                <span className="placeholder col-5 skeleton-date"></span>
            </div>
        </div>
    );
};

export default SkeletonProfileHeader;
