import React from 'react';
import './SkeletonPost.css';

const SkeletonPost = () => {
    return (
        <div className="post-card skeleton-post" aria-hidden="true">
            <div className="post-header placeholder-glow">
                <span className="placeholder col-4"></span>
            </div>
            <div className="post-content placeholder-glow">
                <span className="placeholder col-7"></span>
                <span className="placeholder col-4"></span>
                <span className="placeholder col-4"></span>
                <span className="placeholder col-6"></span>
                <span className="placeholder col-8"></span>
            </div>
            <div className="skeleton-media placeholder"></div>
            <div className="post-actions placeholder-glow">
                <span className="placeholder col-3"></span>
                <span className="placeholder col-3"></span>
            </div>
        </div>
    );
};

export default SkeletonPost;
