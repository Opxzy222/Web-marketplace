// components/shop/FullShopPosts.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  X,
  Image as ImageIcon,
  Video,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import '../../css/shop/FullShopPosts.css';

const BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';
const FALLBACK_IMAGE = 'https://via.placeholder.com/150/E3F2FD/6B7280?text=No+Image';

const getFullUrl = (url?: string) => {
  if (!url) return FALLBACK_IMAGE;
  return url.startsWith('http') ? url : `${BASE_URL}${url}`;
};

const isRecentPost = (createdAt?: string) => {
  if (!createdAt) return false;
  const postTime = new Date(createdAt);
  const currentTime = new Date();
  const hoursDifference = (currentTime.getTime() - postTime.getTime()) / (1000 * 60 * 60);
  return hoursDifference < 3;
};

interface MediaItem {
  url: string;
  thumbnail_url?: string;
  type: 'image' | 'video';
}

interface Post {
  id: string;
  shop_name: string;
  created_at: string;
  description: string;
  media: MediaItem[];
  shop_id: string | number;
  shop_image?: string;
  distance?: number;
}

const Thumbnail: React.FC<{ media: MediaItem; isVideo: boolean }> = ({ media, isVideo }) => {
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  const thumbnailSrc = isVideo && media.thumbnail_url ? getFullUrl(media.thumbnail_url) : getFullUrl(media.url);

  return (
    <div className="thumbnail-container">
      {isLoading && (
        <div className="loading-overlay">
          <Loader2 className="spinner" size={24} />
        </div>
      )}
      <img
        ref={imgRef}
        src={thumbnailSrc}
        alt="Post thumbnail"
        className={`thumbnail ${isLoading ? 'loading' : ''}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          if (imgRef.current) imgRef.current.src = FALLBACK_IMAGE;
        }}
        loading="lazy"
      />
      {isVideo && (
        <div className="play-overlay">
          <Play size={32} />
        </div>
      )}
    </div>
  );
};

const FullShopPosts: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isMountedRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ─── Parse initial posts from URL params ───────────────────────────
  useEffect(() => {
    const paramsPosts = searchParams.get('posts');
    const type = searchParams.get('type') || 'unknown';

    let initialPosts: Post[] = [];

    try {
      if (paramsPosts) {
        const decoded = decodeURIComponent(paramsPosts);
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          initialPosts = parsed.map((p: any, idx: number) => ({
            id: p?.id?.toString() || `fallback-${Date.now()}-${idx}`,
            shop_name: p?.shop_name || 'Unknown Shop',
            created_at: p?.created_at || new Date().toISOString(),
            description: p?.description || 'No description available',
            media: Array.isArray(p?.media)
              ? p.media.map((m: any) => ({
                  url: m?.url || '',
                  thumbnail_url: m?.thumbnail_url || '',
                  type: m?.type || 'image',
                }))
              : [],
            shop_id: p?.shop_id ?? null,
            shop_image: p?.shop_image || null,
            distance: p?.distance ?? null,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to parse posts from URL:', err);
    }

    if (isMountedRef.current) {
      setPosts(initialPosts);
      setHasMore(initialPosts.length >= 20); // assume more if we got a full page
      console.log('Initial posts loaded from URL:', initialPosts.length);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [searchParams]);

  // ─── Video handling ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPost?.media?.[currentIndex]) return;

    const media = selectedPost.media[currentIndex];
    const isVideo = media.type === 'video';

    if (isVideo && videoRef.current) {
      setIsVideoLoading(true);
      setVideoError(null);

      const fullUrl = getFullUrl(media.url);
      videoRef.current.src = fullUrl;
      videoRef.current.load();

      const handleLoaded = () => {
        setIsVideoLoading(false);
        videoRef.current?.play().catch((e) => console.error('Video play failed:', e));
      };

      const handleError = () => {
        setIsVideoLoading(false);
        setVideoError('Failed to load video');
      };

      videoRef.current.addEventListener('loadeddata', handleLoaded, { once: true });
      videoRef.current.addEventListener('error', handleError, { once: true });

      return () => {
        videoRef.current?.removeEventListener('loadeddata', handleLoaded);
        videoRef.current?.removeEventListener('error', handleError);
        videoRef.current?.pause();
      };
    } else {
      setIsVideoLoading(false);
      setVideoError(null);
    }
  }, [selectedPost, currentIndex]);

  const pauseVideo = useCallback(() => {
    if (videoRef.current) videoRef.current.pause();
  }, []);

  // ─── Modal controls ────────────────────────────────────────────────
  const handleMediaClick = useCallback((post: Post) => {
    if (post.media?.length > 0) {
      setSelectedPost(post);
      setCurrentIndex(0);
      setIsFullscreen(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    pauseVideo();
    setSelectedPost(null);
    setCurrentIndex(0);
    setIsVideoLoading(false);
    setVideoError(null);
    setIsFullscreen(false);
  }, [pauseVideo]);

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

  // ─── Mock load more (replace with real API) ────────────────────────
  const fetchMorePosts = useCallback(async () => {
    if (loading || !hasMore || !isMountedRef.current) return;

    setLoading(true);
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Mock new posts – replace this with real pagination API
      const mockNewPosts: Post[] = Array.from({ length: 8 }, (_, i) => ({
        id: `mock-${Date.now()}-${page}-${i}`,
        shop_name: `Shop ${Math.floor(Math.random() * 200)}`,
        created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        description: 'Exciting new post with fresh content and high-quality media.',
        media: [
          {
            url: `https://picsum.photos/600/800?random=${Math.random()}`,
            thumbnail_url: `https://picsum.photos/300/400?random=${Math.random()}`,
            type: Math.random() > 0.6 ? 'video' : 'image',
          },
        ],
        shop_id: Math.floor(Math.random() * 1000),
        distance: Math.random() * 8000,
      }));

      if (isMountedRef.current) {
        setPosts((prev) => [...prev, ...mockNewPosts]);
        setPage((p) => p + 1);
        setHasMore(Math.random() > 0.25); // ~75% chance of more data
      }
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [loading, hasMore, page]);

  // ─── Pull-to-refresh simulation ────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (isMountedRef.current) {
        setPosts([]);
        setPage(2);
        setHasMore(true);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  }, []);

  // ─── Infinite scroll trigger ───────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 300 && !loading && hasMore) {
        fetchMorePosts();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [fetchMorePosts, loading, hasMore]);

  // ─── Render single post ────────────────────────────────────────────
  const renderPostItem = useCallback((post: Post, index: number) => {
    const firstMedia = post.media?.[0];
    const isVideo = firstMedia?.type === 'video';
    const isNew = isRecentPost(post.created_at);

    return (
      <article className="post-item" key={post.id || `post-${index}`}>
        <button className="thumbnail-wrapper" onClick={() => handleMediaClick(post)} title="View post">
          <div className="thumbnail-container">
            {firstMedia ? (
              <>
                <Thumbnail media={firstMedia} isVideo={isVideo} />
                {isNew && <div className="new-badge"><span>New</span></div>}
                {isVideo && <div className="play-icon-overlay"><Play size={32} /></div>}
                {post.media.length > 1 && (
                  <div className="multi-media-indicator">
                    <span>{post.media.length}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="fallback-container">
                <span>No media</span>
              </div>
            )}
          </div>
        </button>

        <div className="post-info">
          <button className="shop-info" onClick={() => navigate(`/shop-page/${post.shop_id}`)}>
            <h3 className="shop-name">{post.shop_name}</h3>
            <time className="created-at" dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString()}
            </time>
            {searchParams.get('type') === 'nearby' && post.distance && (
              <span className="distance">
                {(post.distance / 1000).toFixed(1)} km away
              </span>
            )}
          </button>
          <p className="description">{post.description}</p>
        </div>
      </article>
    );
  }, [handleMediaClick, navigate, searchParams]);

  // ─── Render ────────────────────────────────────────────────────────
  const type = searchParams.get('type') || 'posts';

  return (
    <div className="full-shop-posts">
      <header className="header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>
        <h1 className="header-title">
          {type === 'followed' ? 'Followed Posts' : type === 'nearby' ? 'Nearby Posts' : 'All Posts'}
        </h1>
        <button className="refresh-header-btn" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={20} className={refreshing ? 'spin' : ''} />
        </button>
      </header>

      {posts.length === 0 && !loading && !refreshing ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2>No posts to show</h2>
          <p>Check back later or refresh</p>
          <button className="refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={20} />
            Refresh
          </button>
        </div>
      ) : (
        <div className="posts-grid" ref={scrollContainerRef}>
          {posts.map(renderPostItem)}

          {loading && (
            <div className="loading-footer">
              <Loader2 className="spinner" size={28} />
              <span>Loading more posts...</span>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="end-message">You've reached the end</div>
          )}
        </div>
      )}

      {refreshing && (
        <div className="refresh-overlay">
          <Loader2 className="spinner" size={40} />
          <span>Refreshing...</span>
        </div>
      )}

      {/* Fullscreen Media Modal */}
      {selectedPost && (
        <div className={`media-modal-overlay ${isFullscreen ? 'fullscreen-mode' : ''}`}>
          <div className="modal-backdrop" onClick={handleCloseModal} />

          <div className="modal-content">
            <div className="modal-header">
              <button className="close-modal-btn" onClick={handleCloseModal} aria-label="Close">
                <X size={28} />
              </button>

              <button
                className="fullscreen-toggle-btn"
                onClick={() => setIsFullscreen(!isFullscreen)}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? 'Exit' : 'Full'}
              </button>
            </div>

            <div className="media-viewer">
              {(() => {
                const media = selectedPost.media[currentIndex];
                if (!media) return null;

                const isVideo = media.type === 'video';

                if (isVideo) {
                  return (
                    <div className="video-wrapper">
                      {isVideoLoading && (
                        <div className="media-loading">
                          <Loader2 className="spinner" size={40} />
                          <span>Loading video...</span>
                        </div>
                      )}

                      {videoError && (
                        <div className="media-error">
                          <AlertCircle size={40} />
                          <span>{videoError}</span>
                        </div>
                      )}

                      <video
                        ref={videoRef}
                        className="post-video"
                        controls
                        playsInline
                        preload="metadata"
                        autoPlay={false}
                        muted={false}
                      />
                    </div>
                  );
                }

                return (
                  <img
                    src={getFullUrl(media.url)}
                    alt="Post media"
                    className="fullscreen-image"
                    loading="lazy"
                  />
                );
              })()}
            </div>

            {selectedPost.media.length > 1 && (
              <div className="media-nav">
                <button className="nav-arrow left" onClick={handlePrevMedia}>
                  ←
                </button>
                <span className="media-counter">
                  {currentIndex + 1} / {selectedPost.media.length}
                </span>
                <button className="nav-arrow right" onClick={handleNextMedia}>
                  →
                </button>
              </div>
            )}

            <div className="modal-footer">
              <p className="post-description">{selectedPost.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullShopPosts;