// ShopPostsFeed.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../../css/component/shop/ShopPostsFeed.css";

const BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
const FALLBACK_IMAGE = "https://via.placeholder.com/150/E3F2FD/6B7280?text=No+Image";

const getFullUrl = (url) => {
  return url && url.startsWith("http") ? url : `${BASE_URL}${url || ""}`;
};

const isRecentPost = (createdAt) => {
  if (!createdAt) return false;
  const postTime = new Date(createdAt);
  const currentTime = new Date();
  const hoursDifference = (currentTime - postTime) / (1000 * 60 * 60);
  return hoursDifference < 3;
};

const Thumbnail = ({ media, onThumbnailError }) => {
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef(null);

  const isVideo = media?.type === "video";
  let thumbnailSrc = media.thumbnail_url 
    ? getFullUrl(media.thumbnail_url)
    : isVideo 
    ? FALLBACK_IMAGE 
    : getFullUrl(media.url);

  return (
    <div className="thumbnail-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      )}
      <img
        ref={imgRef}
        src={thumbnailSrc}
        alt="Thumbnail"
        className={`thumbnail ${isLoading ? 'loading' : ''}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          imgRef.current.src = FALLBACK_IMAGE;
          onThumbnailError?.(media.id, media.shop_id, media.index);
        }}
      />
    </div>
  );
};

const ShopPostsFeed = ({ 
  posts, 
  showDistance = false, 
  onSeeMore, 
  hasMore, 
  onThumbnailError,
  regenerateMediaUrl 
}) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const isVideoFile = (media) => media?.type === "video";

  // Video handling
  useEffect(() => {
    if (selectedPost?.media?.[currentIndex]) {
      const media = selectedPost.media[currentIndex];
      const fullUrl = getFullUrl(media.url);
      
      if (isVideoFile(media) && videoRef.current) {
        setIsVideoLoading(true);
        setVideoError(null);
        
        videoRef.current.src = fullUrl;
        videoRef.current.load();
        
        const handleLoaded = () => {
          setIsVideoLoading(false);
          videoRef.current.play().catch(() => {});
        };
        
        const handleError = () => {
          setIsVideoLoading(false);
          setVideoError("Failed to load video");
        };
        
        videoRef.current.addEventListener('loadeddata', handleLoaded);
        videoRef.current.addEventListener('error', handleError);
        
        return () => {
          videoRef.current?.removeEventListener('loadeddata', handleLoaded);
          videoRef.current?.removeEventListener('error', handleError);
          videoRef.current?.pause();
        };
      }
    }
  }, [selectedPost, currentIndex]);

  const handleMediaClick = useCallback((post) => {
    if (post?.media?.length > 0) {
      setSelectedPost(post);
      setCurrentIndex(0);
      setIsFullscreen(false);
    }
  }, []);

  const handleCloseModal = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    setSelectedPost(null);
    setCurrentIndex(0);
    setIsVideoLoading(false);
    setVideoError(null);
    setIsFullscreen(false);
  };

  const handleNextMedia = () => {
    if (selectedPost?.media) {
      const next = (currentIndex + 1) % selectedPost.media.length;
      setCurrentIndex(next);
    }
  };

  const handlePrevMedia = () => {
    if (selectedPost?.media) {
      const prev = (currentIndex - 1 + selectedPost.media.length) % selectedPost.media.length;
      setCurrentIndex(prev);
    }
  };

  const handleShopClick = useCallback((shopId) => {
    navigate(`/shop/shop-page?shopId=${shopId}`);
  }, [navigate]);

  const renderPostItem = (post, index) => {
    const firstMedia = post.media?.[0];
    const isVideo = firstMedia ? isVideoFile(firstMedia) : false;
    const isNew = isRecentPost(post.created_at);

    return (
      <article className="post-item" key={post.id || index}>
        <button 
          className="thumbnail-wrapper"
          onClick={() => handleMediaClick(post)}
        >
          <div className="thumbnail-container">
            {firstMedia ? (
              <>
                <Thumbnail 
                  media={firstMedia} 
                  onThumbnailError={onThumbnailError}
                />
                {isNew && (
                  <div className="new-badge">
                    <span>New</span>
                  </div>
                )}
                {isVideo && (
                  <div className="play-icon-overlay">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                )}
                {post.media.length > 1 && (
                  <div className="multi-media-indicator">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 12H8v-4h6v4zm2-8H5v10h2V9h10v6h2V5z"/>
                    </svg>
                  </div>
                )}
              </>
            ) : (
              <div className="fallback-thumbnail">
                <span>No media</span>
              </div>
            )}
          </div>
        </button>
        
        <div className="shop-info-container">
          <button 
            className="shop-info"
            onClick={() => handleShopClick(post.shop_id)}
          >
            <h3 className="shop-name">{post.shop_name}</h3>
            <time className="created-at">{post.created_at}</time>
            {showDistance && post.distance && (
              <span className="distance">
                {(post.distance / 1000).toFixed(1)} km away
              </span>
            )}
          </button>
          <p className="description">{post.description}</p>
        </div>
      </article>
    );
  };

  return (
    <div className="shop-posts-feed">
      <div className="posts-grid">
        {posts.slice(0, 4).map(renderPostItem)}
      </div>

      {selectedPost && (
        <div className={`modal-overlay ${isFullscreen ? 'fullscreen' : ''}`}>
          <div className="modal-backdrop" onClick={handleCloseModal} />
          
          <div className="modal-content">
            <div className="modal-header">
              <button className="modal-close" onClick={handleCloseModal}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
              <button 
                className="fullscreen-toggle"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  {isFullscreen ? (
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                  ) : (
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                  )}
                </svg>
              </button>
            </div>

            <div className="media-container">
              {(() => {
                const media = selectedPost.media[currentIndex];
                const fullUrl = getFullUrl(media.url);
                const isVideoMedia = isVideoFile(media);

                if (isVideoMedia) {
                  return (
                    <div className="video-wrapper">
                      {isVideoLoading ? (
                        <div className="loading-overlay">
                          <div className="spinner" />
                          <span>Loading video...</span>
                        </div>
                      ) : videoError ? (
                        <div className="error-overlay">
                          <span>{videoError}</span>
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          className="post-video"
                          controls
                          playsInline
                          preload="metadata"
                          onError={() => setVideoError("Video playback failed")}
                        />
                      )}
                    </div>
                  );
                }

                // Image viewer logic (simplified)
                return (
                  <div className="image-viewer">
                    <img 
                      src={fullUrl} 
                      alt="Post"
                      className="fullscreen-image"
                    />
                  </div>
                );
              })()}
            </div>

            <div className="modal-footer">
              <p className="post-description">{selectedPost.description}</p>
              {selectedPost.media.length > 1 && (
                <div className="slide-controls">
                  <button className="nav-btn" onClick={handlePrevMedia}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                  </button>
                  <span className="slide-indicator">
                    {currentIndex + 1} / {selectedPost.media.length}
                  </span>
                  <button className="nav-btn" onClick={handleNextMedia}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPostsFeed;
