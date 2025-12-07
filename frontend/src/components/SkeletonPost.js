import React from 'react';

const SkeletonPost = () => {
    return (
        <div className="post skeleton-wrapper">
            <div className="skeleton-header">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton skeleton-meta"></div>
            </div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-media"></div>
            <div className="skeleton-actions">
                <div className="skeleton skeleton-btn"></div>
                <div className="skeleton skeleton-btn"></div>
            </div>
        </div>
    );
};

export default SkeletonPost;
