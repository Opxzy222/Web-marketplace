// ShopStatus.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PageShell from '../../components/PageShell';
import '../../css/shop/ShopStatus.css';
import StatusViewer from '../../components/shop/StatusViewer';

const API_BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';
const FALLBACK_IMAGE = 'https://randomuser.me/api/portraits/lego/1.jpg';

const StatusItem = ({ item, index, onPress, onDelete, regenerateMediaUrl, sessionId }) => {
  const [mediaUrls, setMediaUrls] = useState({
    media: item.media,
    thumbnail: item.thumbnail_url,
  });

  const handleImageError = async (type) => {
    try {
      const response = await fetch(`${API_BASE_URL}/status/regenerate-url/?status_id=${item.id}`, {
        headers: { Authorization: `Bearer ${sessionId}` },
      });
      if (!response.ok) throw new Error('Regenerate failed');
      const { media_url, thumbnail_url } = await response.json();
      setMediaUrls({ media: media_url, thumbnail: thumbnail_url });
      regenerateMediaUrl?.(item.id, media_url, thumbnail_url);
    } catch (error) {
      console.error(`Failed to regenerate ${type} URL:`, error);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Delete this status? This cannot be undone.')) {
      onDelete(item.id);
    }
  };

  return (
    <motion.article
      className={`shpst-status-item ${!item.viewed ? 'shpst-unread' : ''}`}
      onClick={() => onPress(index)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className="shpst-status-media">
        {item.media_type === 'image' && (
          <img
            src={mediaUrls.media || FALLBACK_IMAGE}
            alt={`${item.shop} status image`}
            onError={() => handleImageError('media')}
            loading="lazy"
          />
        )}
        {item.media_type === 'video' && (
          <div className="shpst-video-thumb">
            <img
              src={mediaUrls.thumbnail || FALLBACK_IMAGE}
              alt={`${item.shop} status video thumbnail`}
              onError={() => handleImageError('thumbnail')}
              loading="lazy"
            />
            <div className="shpst-play-overlay">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        {item.media_type === 'text' && (
          <div className="shpst-text-placeholder">
            <p>{item.text?.slice(0, 60) || 'Text update'}</p>
          </div>
        )}
      </div>

      <div className="shpst-status-info">
        <div className="shpst-shop-name">{item.shop}</div>
        <div className="shpst-status-meta">
          <time dateTime={item.created_at}>
            {new Date(item.created_at).toLocaleString([], {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'short',
            })}
          </time>
          <span className="shpst-views">👀 {item.views_count || 0}</span>
        </div>
      </div>

      <button
        className="shpst-delete-btn"
        onClick={handleDelete}
        aria-label="Delete this status"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </motion.article>
  );
};

const ShopStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const shopId = location.state?.shopId;

  const [statuses, setStatuses] = useState([]);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(null);

  const fileInputRef = useRef(null);

  // Load token and subscription once on mount
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    setSessionId(token);

    const subCache = localStorage.getItem('subscription_cache');
    if (subCache) {
      try {
        setSubscriptionStatus(JSON.parse(subCache)?.plan?.toLowerCase() || null);
      } catch (e) {
        console.error('Failed to parse subscription_cache:', e);
      }
    }
  }, []);

  // Fetch statuses when both sessionId and shopId are available
  const fetchStatuses = useCallback(async () => {
    if (!sessionId || !shopId) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/shop/${shopId}/active_status/`, {
        headers: {
          Authorization: `Bearer ${sessionId}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      const formatted = data.statuses.map((status) => ({
        id: status.id,
        shop_id: status.shop_id,
        shop: status.shop.name,
        text: status.text,
        media: status.media,
        thumbnail_url: status.thumbnail_url,
        media_type: status.media_type,
        created_at: status.created_at,
        views_count: status.views_count,
        image: status.shop.image,
        viewed: status.viewed ?? false,
      }));

      setStatuses(formatted);
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, shopId]);

  useEffect(() => {
    if (sessionId && shopId) {
      fetchStatuses();
    }
  }, [sessionId, shopId, fetchStatuses]);

  const handleDeleteStatus = async (statusId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/status/${statusId}/delete/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionId}` },
      });

      if (!response.ok) throw new Error('Delete failed');
      fetchStatuses();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete status');
    }
  };

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(
      (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    const newMedia = files.slice(0, 10).map((file) => ({
      id: `${file.name}_${Date.now()}_${Math.random()}`,
      uri: URL.createObjectURL(file),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      size: file.size,
      valid: file.size < 10 * 1024 * 1024,
      file,
    })).filter((item) => item.valid);

    setSelectedMedia((prev) => [...prev, ...newMedia]);
    e.target.value = '';
  };

  const removeMedia = (id) => {
    setSelectedMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const postStatus = async (isMedia = false) => {
    if (!statusText.trim() && (!isMedia || selectedMedia.length === 0)) {
      alert('Please add text or media');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (statusText.trim()) formData.append('text', statusText.trim());

      if (isMedia) {
        selectedMedia.forEach((media) => {
          formData.append('media', media.file, media.name);
        });
      }

      const response = await fetch(`${API_BASE_URL}/shop/${shopId}/status/`, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${sessionId}` },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Post failed');
      }

      setStatusText('');
      setSelectedMedia([]);
      setIsTextModalOpen(false);
      setIsMediaModalOpen(false);
      fetchStatuses();
    } catch (error) {
      console.error('Post failed:', error);
      alert(error.message || 'Network error while posting');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStatus = (index) => {
    setCurrentStatusIndex(index);
  };

  return (
    <PageShell title="My Status" showBackButton={true} onBack={() => navigate('/shop/myshop')}>
      <div className="shpst-status-screen">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaSelect}
          style={{ display: 'none' }}
        />

        <main className="shpst-status-main">
          <motion.section
            className="shpst-my-status-card"
            onClick={() => statuses.length > 0 && handleViewStatus(0)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="shpst-status-avatar">
              <img src={statuses[0]?.image || FALLBACK_IMAGE} alt="Your profile" />
              {statuses.length > 0 && <div className="shpst-status-count">+{statuses.length}</div>}
            </div>
            <div className="shpst-my-status-info">
              <h3>My Status</h3>
              <p>
                {statuses.length
                  ? `Tap to view ${statuses.length} update${statuses.length > 1 ? 's' : ''}`
                  : 'No updates yet • Tap to post'}
              </p>
            </div>
          </motion.section>

          <div className="shpst-post-actions">
            <motion.button
              className="shpst-post-btn shpst-text-post"
              onClick={() => setIsTextModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="shpst-btn-icon">✍️</span>
              <span>Text Status</span>
            </motion.button>

            <motion.button
              className="shpst-post-btn shpst-media-post"
              onClick={() => setIsMediaModalOpen(true)}
              disabled={!['standard', 'premium'].includes(subscriptionStatus || '')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="shpst-btn-icon">📸</span>
              <span>Photo/Video</span>
              {subscriptionStatus !== 'standard' && subscriptionStatus !== 'premium' && (
                <span className="shpst-premium-lock">Premium</span>
              )}
            </motion.button>
          </div>

          <section className="shpst-status-list-section">
            <h2 className="shpst-section-title">Recent Updates</h2>

            {loading && statuses.length === 0 ? (
              <div className="shpst-loading">Loading your statuses...</div>
            ) : statuses.length === 0 ? (
              <div className="shpst-empty-state">
                <div className="shpst-empty-icon">📢</div>
                <h3>No status updates yet</h3>
                <p>Share moments with your followers — post your first status above.</p>
              </div>
            ) : (
              <div className="shpst-statuses-grid">
                {statuses.map((status, index) => (
                  <StatusItem
                    key={status.id}
                    item={status}
                    index={index}
                    onPress={handleViewStatus}
                    onDelete={handleDeleteStatus}
                    regenerateMediaUrl={(id, media, thumb) =>
                      setStatuses((prev) =>
                        prev.map((s) => (s.id === id ? { ...s, media, thumbnail_url: thumb } : s))
                      )
                    }
                    sessionId={sessionId}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <AnimatePresence mode="wait">
          {isTextModalOpen && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTextModalOpen(false)}
            >
              <motion.div
                className="modal-card"
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3>📝 Post Text Status</h3>
                  <button
                    onClick={() => setIsTextModalOpen(false)}
                    className="close-btn"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="What's happening?"
                  maxLength={500}
                  rows={4}
                  autoFocus
                />
                <div className="modal-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setIsTextModalOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => postStatus(false)}
                    disabled={!statusText.trim() || loading}
                  >
                    {loading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isMediaModalOpen && (
            ['standard', 'premium'].includes(subscriptionStatus || '') ? (
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMediaModalOpen(false)}
              >
                <motion.div
                  className="modal-card media-modal"
                  variants={modalVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h3>🖼️ Post Media Status</h3>
                    <button
                      onClick={() => setIsMediaModalOpen(false)}
                      className="close-btn"
                    >
                      ✕
                    </button>
                  </div>

                  {selectedMedia.length > 0 && (
                    <div className="media-preview">
                      <div className="media-grid">
                        {selectedMedia.map((item) => (
                          <div key={item.id} className="media-item">
                            {item.type === 'video' ? (
                              <div className="video-thumb">
                                <video src={item.uri} muted loop playsInline />
                                <div className="play-icon">▶</div>
                              </div>
                            ) : (
                              <img src={item.uri} alt="Preview" />
                            )}
                            <button
                              className="remove-media"
                              onClick={() => removeMedia(item.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="Add caption (optional)"
                    rows={3}
                    autoFocus
                  />

                  {loading && (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                  )}

                  <div className="modal-actions">
                    <button
                      className="btn-primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      + Add Media
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setIsMediaModalOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => postStatus(true)}
                      disabled={loading || (selectedMedia.length === 0 && !statusText.trim())}
                    >
                      {loading ? 'Uploading...' : 'Post'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <SubscriptionWall onClose={() => setIsMediaModalOpen(false)} />
            )
          )}

          {currentStatusIndex !== null && (
            <StatusViewer
              key={`viewer-${currentStatusIndex}`}
              statuses={statuses}
              initialIndex={currentStatusIndex}
              onClose={() => setCurrentStatusIndex(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.94, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.94, y: 10, transition: { duration: 0.18, ease: 'easeIn' } },
};

const SubscriptionWall = ({ onClose }) => (
  <motion.div
    className="modal-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      className="modal-card"
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="subscription-wall">
        <div className="lock-icon">🔒</div>
        <h3>Premium Feature</h3>
        <p>Upgrade to Standard or Premium plan to post media statuses</p>
        <div className="plan-buttons">
          <button className="plan-btn standard">Standard</button>
          <button className="plan-btn premium">Premium</button>
        </div>
        <button className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </motion.div>
  </motion.div>
);

export default ShopStatus;