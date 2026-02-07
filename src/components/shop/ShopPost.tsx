import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactPlayer from "react-player";
import { FaVideo, FaImage, FaSpinner, FaXmark, FaExpand, FaCompress, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import "../../css/component/shop/ShopPost.css";

const BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
const FALLBACK_IMAGE = "https://via.placeholder.com/150x150?text=No+Image";

const getFullUrl = (url: string) => {
  return url && url.startsWith("http") ? url : `${BASE_URL}${url || ""}`;
};

const isVideoFile = (media: any): boolean => {
  if (!media || !media.url) return false;
  if (media.type) return media.type === "video";
  const extension = media.url.toLowerCase().split(".").pop();
  return ["mp4", "mov", "avi", "mkv", "webm"].includes(extension || "");
};

interface MediaItem {
  url: string;
  thumbnail_url?: string;
  type?: string;
}

interface Post {
  id: string | number;
  media: MediaItem[];
  description?: string;
}

interface ShopPostsProps {
  posts: Post[];
  scrollEnabled?: boolean;
}

const ShopPosts: React.FC<ShopPostsProps> = ({ posts, scrollEnabled = false }) => {
  const [selectedPost, setSelectedPost] = useState<{ items: MediaItem[]; description?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [imageLoading, setImageLoading] = useState<{ [key: number]: boolean }>({});

  const playerRef = useRef<ReactPlayer | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Video handling
  useEffect(() => {
    if (selectedPost && selectedPost.items[currentIndex]) {
      const media = selectedPost.items[currentIndex];
      const fullUrl = getFullUrl(media.url);
      const isVideo = isVideoFile(media);

      if (isVideo) {
        const loadVideo = async () => {
          try {
            setIsVideoLoading(true);
            setVideoError(null);
            setTimeout(() => playerRef.current?.seekTo(0), 100);
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
      playerRef.current?.getInternalPlayer()?.pause?.();
    };
  }, [selectedPost, currentIndex]);

  const pausePlayer = useCallback(() => {
    playerRef.current?.getInternalPlayer()?.pause?.();
  }, []);

  const toggleFullscreenMode = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleMediaClick = useCallback((post: Post) => {
    if (post.media && post.media.length > 0) {
      setSelectedPost({ items: post.media, description: post.description });
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
    if (selectedPost && selectedPost.items) {
      const nextIndex = (currentIndex + 1) % selectedPost.items.length;
      setCurrentIndex(nextIndex);
    }
  }, [selectedPost, currentIndex]);

  const handlePrevMedia = useCallback(() => {
    if (selectedPost && selectedPost.items) {
      const prevIndex = (currentIndex - 1 + selectedPost.items.length) % selectedPost.items.length;
      setCurrentIndex(prevIndex);
    }
  }, [selectedPost, currentIndex]);

  const handleImageLoad = useCallback((index: number) => {
    setImageLoading(prev => ({ ...prev, [index]: false }));
  }, []);

  const renderThumbnail = useCallback((media: MediaItem, index: number) => {
    const thumbnailUrl = media.thumbnail_url 
      ? getFullUrl(media.thumbnail_url)
      : isVideoFile(media) 
      ? FALLBACK_IMAGE 
      : getFullUrl(media.url);

    const isVideo = isVideoFile(media);

    return (
      <div className={`thumbnail-container ${imageLoading[index] ? 'loading' : ''}`}>
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
          onLoadStart={() => setImageLoading(prev => ({ ...prev, [index]: true }))}
          onError={(e) => {
            console.error("Thumbnail load error:", thumbnailUrl);
            handleImageLoad(index);
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {isVideo && (
          <div className="play-icon-overlay">
            <FaVideo />
          </div>
        )}
      </div>
    );
  }, [handleImageLoad]);

  const renderMediaViewer = useCallback(() => {
    if (!selectedPost || !selectedPost.items[currentIndex]) {
      return (
        <div className="fallback-container">
          <span>No media available</span>
        </div>
      );
    }

    const media = selectedPost.items[currentIndex];
    const fullUrl = getFullUrl(media.url);
    const isVideo = isVideoFile(media);

    if (isVideo) {
      return (
        <div className={`media-container ${isFullscreen ? 'fullscreen' : ''}`}>
          {isVideoLoading ? (
            <div className="loading-overlay">
              <FaSpinner className="spinner" />
              <span>Loading video...</span>
            </div>
          ) : videoError ? (
            <div className="fallback-container">
              <span>{videoError}</span>
            </div>
          ) : (
            <ReactPlayer
              ref={playerRef}
              url={fullUrl}
              className={`video-player ${isFullscreen ? 'fullscreen' : ''}`}
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

    // Image viewer logic
    const imageItems = selectedPost.items.filter(item => !isVideoFile(item));
    const imageUrls = imageItems.map(item => ({ url: getFullUrl(item.url) }));
    const currentImageIndex = imageItems.findIndex(item => getFullUrl(item.url) === fullUrl);

    return (
      <div className={`image-viewer-container ${isFullscreen ? 'fullscreen' : ''}`}>
        {imageLoading[currentIndex] && (
          <div className="loading-overlay">
            <FaSpinner className="spinner" />
            <span>Loading image...</span>
          </div>
        )}
        <div 
          className={`image-viewer ${isFullscreen ? 'fullscreen' : ''}`}
          style={{ 
            transform: `translateX(-${currentImageIndex * 100}%)`,
            width: `${imageUrls.length * 100}%`
          }}
        >
          {imageUrls.map((img, idx) => (
            <div key={idx} className="image-slide" style={{ width: "100%" }}>
              <img
                src={img.url}
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
  }, [selectedPost, currentIndex, isFullscreen, isVideoLoading, videoError, imageLoading, handleImageLoad]);

  return (
    <div className="shop-posts-container">
      {posts && posts.length > 0 ? (
        <div 
          className={`posts-grid ${scrollEnabled ? 'scrollable' : ''}`}
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${scrollEnabled ? '160px' : '(100vw - 80px)/2'}px, 1fr))` }}
        >
          {posts.map((post, index) => {
            const firstMedia = post.media?.[0];
            return (
              <motion.div
                key={post.id}
                className="post-item"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleMediaClick(post)}
              >
                {firstMedia ? renderThumbnail(firstMedia, index) : (
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
        <div className="no-posts">
          No posts available
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            className={`modal-overlay ${isFullscreen ? 'fullscreen' : ''}`}
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
                {selectedPost.items.length > 1 && (
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
                      {currentIndex + 1} / {selectedPost.items.length}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShopPosts;
