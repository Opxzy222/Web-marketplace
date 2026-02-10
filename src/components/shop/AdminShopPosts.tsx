// src/components/shop/AdminShopPosts.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import { FaVideo, FaImage, FaSpinner, FaXmark, FaExpand, FaCompress, FaChevronLeft, FaChevronRight, FaTrash } from "react-icons/fa6";
import axios from "axios";
import "../../css/component/shop/ShopPost.css"; // ← same CSS as ShopPosts

const BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
const FALLBACK_IMAGE = "https://via.placeholder.com/150x150?text=No+Image";

const getFullUrl = (url) => {
  return url && url.startsWith("http") ? url : `${BASE_URL}${url || ""}`;
};

const isVideoFile = (media) => {
  if (!media || !media.url) return false;
  if (media.type) return media.type === "video";
  const extension = media.url.toLowerCase().split(".").pop();
  return ["mp4", "mov", "avi", "mkv", "webm"].includes(extension || "");
};

const AdminShopPosts = ({ posts, shopId, onPostDeleted }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [imageLoading, setImageLoading] = useState({});

  const playerRef = useRef(null);
  const modalRef = useRef(null);

  // Sort posts newest first (like RN version)
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = new Date(a.created_at || 0);
    const dateB = new Date(b.created_at || 0);
    return dateB - dateA;
  });

  // Video handling
  useEffect(() => {
    if (selectedPost && selectedPost.media?.[currentIndex]) {
      const media = selectedPost.media[currentIndex];
      const fullUrl = getFullUrl(media.url);
      const isVideo = isVideoFile(media);

      if (isVideo) {
        const loadVideo = async () => {
          try {
            setIsVideoLoading(true);
            setVideoError(null);
            // ReactPlayer handles src change automatically
          } catch (error) {
            console.error("Video load error:", fullUrl, error);
            setVideoError("Failed to load video");
            setIsVideoLoading(false);
          }
        };
        loadVideo();
      } else {
        setIsVideoLoading(false);
        setVideoError(null);
      }
    }

    return () => {
      if (playerRef.current) {
        playerRef.current?.getInternalPlayer()?.pause?.();
      }
    };
  }, [selectedPost, currentIndex]);

  const pausePlayer = useCallback(() => {
    playerRef.current?.getInternalPlayer()?.pause?.();
  }, []);

  const toggleFullscreenMode = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleMediaClick = useCallback((post) => {
    if (post.media?.length > 0) {
      setSelectedPost(post);
      setCurrentIndex(0);
      setIsFullscreen(true);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    pausePlayer();
    setSelectedPost(null);
    setCurrentIndex(0);
    setIsVideoLoading(false);
    setVideoError(null);
    setIsFullscreen(true);
  }, [pausePlayer]);

  const handleNextMedia = useCallback(() => {
    if (selectedPost?.media) {
      setCurrentIndex((prev) => (prev + 1) % selectedPost.media.length);
    }
  }, [selectedPost]);

  const handlePrevMedia = useCallback(() => {
    if (selectedPost?.media) {
      setCurrentIndex((prev) => (prev - 1 + selectedPost.media.length) % selectedPost.media.length);
    }
  }, [selectedPost]);

  const handleImageLoad = useCallback((index) => {
    setImageLoading((prev) => ({ ...prev, [index]: false }));
  }, []);

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${BASE_URL}/shops/${shopId}/posts/${postId}/`, {
        headers: {
          Authorization: localStorage.getItem("sessionToken"),
        },
      });
      alert("Post deleted successfully");
      onPostDeleted(postId); // Notify parent to remove from list
      handleCloseModal();
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete post. Please try again.");
    }
  };

  const renderThumbnail = useCallback((media, index) => {
    const thumbnailUrl = media.thumbnail_url
      ? getFullUrl(media.thumbnail_url)
      : isVideoFile(media)
      ? FALLBACK_IMAGE
      : getFullUrl(media.url);

    const isVideo = isVideoFile(media);

    return (
      <div className={`thumbnail-container ${imageLoading[index] ? "loading" : ""}`}>
        {imageLoading[index] && (
          <div className="loading-overlay">
            <FaSpinner className="spinner" />
            <span>Loading...</span>
          </div>
        )}
        <img
          src={thumbnailUrl}
          alt="Thumbnail"
          className="thumbnail"
          onLoad={() => handleImageLoad(index)}
          onLoadStart={() => setImageLoading((prev) => ({ ...prev, [index]: true }))}
          onError={() => {
            console.error("Thumbnail load error:", thumbnailUrl);
            handleImageLoad(index);
          }}
        />
        {isVideo && (
          <div className="play-icon-overlay">
            <FaVideo />
          </div>
        )}
      </div>
    );
  }, [imageLoading, handleImageLoad]);

  const renderMediaViewer = useCallback(() => {
    if (!selectedPost || !selectedPost.media?.[currentIndex]) {
      return <div className="fallback-container"><span>No media available</span></div>;
    }

    const media = selectedPost.media[currentIndex];
    const fullUrl = getFullUrl(media.url);
    const isVideo = isVideoFile(media);

    if (isVideo) {
      return (
        <div className={`media-container ${isFullscreen ? "fullscreen" : ""}`}>
          {isVideoLoading ? (
            <div className="loading-overlay">
              <FaSpinner className="spinner" />
              <span>Loading video...</span>
            </div>
          ) : videoError ? (
            <div className="fallback-container"><span>{videoError}</span></div>
          ) : (
            <ReactPlayer
              ref={playerRef}
              url={fullUrl}
              className={`video-player ${isFullscreen ? "fullscreen" : ""}`}
              width="100%"
              height="100%"
              controls
              playing={!isVideoLoading}
              loop={false}
              onError={(e) => {
                console.error("Video playback error:", fullUrl, e);
                setVideoError("Video playback failed");
              }}
            />
          )}
        </div>
      );
    }

    // Image carousel for multi-image posts
    const imageItems = selectedPost.media.filter((item) => !isVideoFile(item));
    const imageUrls = imageItems.map((item) => getFullUrl(item.url));
    const currentImageIndex = imageItems.findIndex(
      (item) => getFullUrl(item.url) === fullUrl
    );

    return (
      <div className={`image-viewer-container ${isFullscreen ? "fullscreen" : ""}`}>
        {imageLoading[currentIndex] && (
          <div className="loading-overlay">
            <FaSpinner className="spinner" />
            <span>Loading image...</span>
          </div>
        )}
        <div
          className={`image-viewer ${isFullscreen ? "fullscreen" : ""}`}
          style={{
            transform: `translateX(-${currentImageIndex * 100}%)`,
            width: `${imageUrls.length * 100}%`,
          }}
        >
          {imageUrls.map((imgUrl, idx) => (
            <div key={idx} className="image-slide" style={{ width: "100%" }}>
              <img
                src={imgUrl}
                alt={`Post image ${idx + 1}`}
                className="modal-image"
                onLoad={() => handleImageLoad(idx)}
                onError={() => handleImageLoad(idx)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }, [
    selectedPost,
    currentIndex,
    isFullscreen,
    isVideoLoading,
    videoError,
    imageLoading,
    handleImageLoad,
  ]);

  return (
    <div className="shop-posts-container">
      {sortedPosts?.length > 0 ? (
        <div
          className="posts-grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
        >
          {sortedPosts.map((post, index) => {
            const firstMedia = post.media?.[0];
            return (
              <motion.div
                key={post.id}
                className="post-item"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleMediaClick(post)}
              >
                {firstMedia ? (
                  renderThumbnail(firstMedia, index)
                ) : (
                  <div className="fallback-container">
                    <FaImage />
                    <span>No media</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="no-posts">No posts available</div>
      )}

      {/* Admin Modal with Delete */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="modal-container"
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <motion.button
                  className="modal-close"
                  onClick={handleCloseModal}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FaXmark />
                </motion.button>

                <motion.button
                  className="fullscreen-toggle"
                  onClick={toggleFullscreenMode}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isFullscreen ? <FaCompress /> : <FaExpand />}
                </motion.button>
              </div>

              {renderMediaViewer()}

              <div className="modal-controls">
                {selectedPost.description && (
                  <motion.div
                    className="post-description"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {selectedPost.description}
                  </motion.div>
                )}

                {selectedPost.media?.length > 1 && (
                  <div className="slide-controls">
                    <motion.button
                      className="nav-button prev"
                      onClick={handlePrevMedia}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FaChevronLeft />
                    </motion.button>
                    <span className="slide-indicator">
                      {currentIndex + 1} / {selectedPost.media.length}
                    </span>
                    <motion.button
                      className="nav-button next"
                      onClick={handleNextMedia}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FaChevronRight />
                    </motion.button>
                  </div>
                )}

                {/* Admin Delete Button */}
                <motion.button
                  className="delete-button"
                  onClick={() => handleDelete(selectedPost.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaTrash size={18} />
                  <span>Delete Post</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminShopPosts;