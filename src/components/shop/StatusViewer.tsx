// StatusViewer.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import PageShell from "../../components/PageShell"; // For modal overlay if needed
import '../../css/component/shop/StatusViewer..css';

const IMAGE_TEXT_DURATION = 6000;
const VIDEO_MAX_DURATION = 30000;
const LOAD_TIMEOUT = 10000;

const formatRelativeTime = (createdAt) => {
  if (!createdAt) return "";
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const StatusViewer = ({
  visible,
  statuses,
  initialIndex = 0,
  onClose,
  onStatusViewed,
  onSingleStatusViewed,
  userId,
  authToken,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const progressRef = useRef(0);
  const animationRef = useRef(null);
  const isPausedRef = useRef(false);
  const pausedTimeRef = useRef(0);
  const isNavigatingRef = useRef(false);
  const currentIndexRef = useRef(initialIndex);
  const finishedIdsRef = useRef(new Set());
  const startedWithUnviewedRef = useRef(false);

  const flattened = useMemo(() => statuses ?? [], [statuses]);

  // Smart start index - WhatsApp logic
  const smartStartIndex = useMemo(() => {
    if (!flattened.length) return 0;

    const clicked = flattened[initialIndex];
    const shopId = clicked?.shop?.id;
    if (!shopId) return 0;

    const shopStart = flattened.findIndex(s => s.shop?.id === shopId);
    if (shopStart === -1) return 0;

    const shopSlice = flattened.slice(shopStart).filter(s => s.shop?.id === shopId);
    const firstUnviewed = shopSlice.findIndex(s => !s.viewed && !finishedIdsRef.current.has(s.id));

    startedWithUnviewedRef.current = firstUnviewed >= 0;
    return firstUnviewed >= 0 ? shopStart + firstUnviewed : shopStart;
  }, [flattened, initialIndex]);

  useEffect(() => {
    setCurrentIndex(smartStartIndex);
    currentIndexRef.current = smartStartIndex;
  }, [smartStartIndex]);

  const currentStatus = useMemo(() => {
    const s = flattened[currentIndex] ?? {};
    if (s.media && /\.(mp4|mov|avi)$/i.test(s.media) && s.media_type !== "video") {
      return { ...s, media_type: "video" };
    }
    return s;
  }, [flattened, currentIndex]);

  const isImage = currentStatus.media_type === "image";
  const isVideo = currentStatus.media_type === "video";
  const isText = currentStatus.media_type === "text";
  const hasMedia = (isImage || isVideo) && !!currentStatus.media;
  const statusText = currentStatus.text?.trim() ?? "";

  // Shop progress
  const { shopStatuses, effectiveIndex } = useMemo(() => {
    const shopId = currentStatus.shop?.id ?? 0;
    const list = flattened.filter(s => s.shop?.id === shopId);
    const start = flattened.findIndex(s => s.shop?.id === shopId);
    const effIdx = currentIndex - start;
    return {
      shopStatuses: list,
      effectiveIndex: effIdx >= 0 ? effIdx : 0,
    };
  }, [currentStatus, flattened, currentIndex]);

  // Video element ref
  const videoRef = useRef(null);

  const getStatusDuration = useCallback(() => {
    return IMAGE_TEXT_DURATION; // Simplified for web
  }, []);

  const startProgress = useCallback((overrideDuration) => {
    if (isPausedRef.current || isNavigatingRef.current) return;
    
    const duration = overrideDuration ?? getStatusDuration();
    const startTime = Date.now();
    const endTime = startTime + duration;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      progressRef.current = progress;

      if (progress < 1 && !isPausedRef.current && !isNavigatingRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (progress >= 1) {
        // Mark viewed
        const statusId = currentStatus.id;
        const shopId = currentStatus.shop?.id;
        if (statusId && shopId) {
          onSingleStatusViewed?.(statusId, shopId);
        }
        finishedIdsRef.current.add(statusId);

        // Check if shop complete
        if (shopId) {
          const shopSlice = flattened.filter(s => s.shop?.id === shopId);
          const allDone = shopSlice.every(s => s.viewed || finishedIdsRef.current.has(s.id));
          if (allDone) {
            onStatusViewed?.({
              shopId,
              shop: currentStatus.shop?.name,
              shopImage: currentStatus.shop?.image,
              statuses: shopSlice.map(s => ({ ...s, viewed: true })),
            });
          }
        }
        handleNext(true);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [currentStatus, onSingleStatusViewed, onStatusViewed, flattened, handleNext, getStatusDuration]);

  const handleNext = useCallback((fromTimer = false) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    if (!fromTimer && isPausedRef.current) {
      isPausedRef.current = false;
      isNavigatingRef.current = false;
      return;
    }

    // Pause video
    const video = videoRef.current;
    if (video) video.pause();

    setIsLoading(false);
    setLoadError(null);

    let nextIdx = currentIndexRef.current + 1;

    // WhatsApp smart navigation - next unviewed shop first
    while (nextIdx < flattened.length) {
      const nxt = flattened[nextIdx];
      const shopId = nxt.shop?.id;
      const shopStart = flattened.findIndex(s => s.shop?.id === shopId);
      const shopEnd = flattened.slice(shopStart).findIndex(s => s.shop?.id !== shopId);
      const shopSlice = shopEnd === -1 
        ? flattened.slice(shopStart) 
        : flattened.slice(shopStart, shopStart + shopEnd);

      const hasUnviewed = shopSlice.some(s => !s.viewed && !finishedIdsRef.current.has(s.id));
      if (hasUnviewed) {
        const first = shopSlice.findIndex(s => !s.viewed && !finishedIdsRef.current.has(s.id));
        nextIdx = shopStart + first;
        break;
      } else {
        nextIdx = shopStart + shopSlice.length;
      }
    }

    if (nextIdx >= flattened.length) {
      onClose();
      isNavigatingRef.current = false;
      return;
    }

    currentIndexRef.current = nextIdx;
    setCurrentIndex(nextIdx);
    isNavigatingRef.current = false;
  }, [flattened, onClose]);

  const handlePrev = useCallback(() => {
    if (isNavigatingRef.current || currentIndexRef.current <= 0) {
      onClose();
      return;
    }
    isNavigatingRef.current = true;

    const video = videoRef.current;
    if (video) video.pause();

    let prevIdx = currentIndexRef.current - 1;
    const curShopId = flattened[currentIndexRef.current]?.shop?.id;
    if (curShopId) {
      const shopStart = flattened.findIndex(s => s.shop?.id === curShopId);
      if (prevIdx < shopStart) {
        const prevShopId = flattened[prevIdx]?.shop?.id;
        const lastInPrev = flattened.slice(0, shopStart).findLastIndex(s => s.shop?.id === prevShopId);
        prevIdx = lastInPrev >= 0 ? lastInPrev : prevIdx;
      }
    }

    currentIndexRef.current = prevIdx;
    setCurrentIndex(prevIdx);
    isPausedRef.current = false;
    isNavigatingRef.current = false;
  }, [flattened, onClose]);

  const togglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    const video = videoRef.current;
    
    if (isPausedRef.current) {
      pausedTimeRef.current = progressRef.current * getStatusDuration();
      if (video) video.pause();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else {
      const dur = getStatusDuration();
      const rem = dur - pausedTimeRef.current;
      startProgress(rem);
      if (video) video.play().catch(console.error);
    }
  }, [getStatusDuration, startProgress]);

  // Mark viewed API call
  const markStatusAsViewed = useCallback(async (status) => {
    if (!status || status.viewed || !userId) return;
    try {
      const formData = new FormData();
      formData.append("user_id", userId.toString());
      formData.append("status_ids[]", status.id.toString());

      await fetch('/api/mark_status_viewed/', {
        method: 'POST',
        headers: {
          'Authorization': authToken,
        },
        body: formData,
      });
    } catch (e) {
      console.error('Mark viewed error:', e);
    }
  }, [userId, authToken]);

  // Main effect - index change
  useEffect(() => {
    if (!visible || currentIndex >= flattened.length) {
      onClose();
      return;
    }

    const status = flattened[currentIndex];
    progressRef.current = 0;
    pausedTimeRef.current = 0;
    isPausedRef.current = false;
    setIsLoading(false);
    setLoadError(null);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Mark previous as viewed
    const shopId = status.shop?.id;
    if (shopId) {
      const shopStart = flattened.findIndex(s => s.shop?.id === shopId);
      for (let i = shopStart; i < currentIndex; i++) {
        finishedIdsRef.current.add(flattened[i].id);
      }
    }

    markStatusAsViewed(status);

    // Start content
    if (isVideo && status.media && videoRef.current) {
      setIsLoading(true);
      const video = videoRef.current;
      
      video.src = status.media;
      video.load();
      
      const timeout = setTimeout(() => {
        setLoadError("Video load timeout");
        handleNext(true);
      }, 5000);

      video.addEventListener('loadeddata', () => {
        clearTimeout(timeout);
        setIsLoading(false);
        if (!isPausedRef.current) {
          video.play().catch(() => handleNext(true));
          startProgress();
        }
      }, { once: true });

      video.addEventListener('error', () => {
        clearTimeout(timeout);
        setLoadError("Video failed to load");
        setTimeout(() => handleNext(true), 2000);
      }, { once: true });
    } else {
      setIsLoading(false);
      startProgress();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, [currentIndex, visible, flattened, markStatusAsViewed, isVideo, startProgress, handleNext]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.src = '';
      }
    };
  }, []);

  if (!visible || currentIndex >= flattened.length) return null;

  return (
    <div className={`status-viewer ${visible ? 'visible' : ''}`}>
      {/* Backdrop */}
      <div className="backdrop" onClick={onClose} />
      
      {/* Container */}
      <div className="viewer-container">
        {/* Header */}
        <div className="header">
          <div className="shop-info">
            <span className="shop-name">{currentStatus.shop?.name ?? "Unknown Shop"}</span>
            <span className="created-at">{formatRelativeTime(currentStatus.created_at)}</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Progress bars */}
        <div className="progress-container">
          {shopStatuses.map((status, i) => {
            const isCurrent = i === effectiveIndex;
            const isPast = i < effectiveIndex;
            const isViewed = status.viewed || finishedIdsRef.current.has(status.id);
            const progress = isCurrent ? progressRef.current : (isPast || (isViewed && !isCurrent)) ? 1 : 0;

            return (
              <div key={status.id} className="progress-background">
                <div 
                  className="progress-bar" 
                  style={{ 
                    transform: `scaleX(${progress})`,
                    background: isCurrent ? 'white' : 'rgba(255,255,255,0.6)'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="content-wrapper">
          {isText && statusText ? (
            <div className="text-status">
              <p>{statusText}</p>
            </div>
          ) : isLoading && isVideo ? (
            <div className="loading-container">
              <div className="spinner" />
            </div>
          ) : loadError && isVideo ? (
            <div className="error-container">
              <p>{loadError}</p>
            </div>
          ) : hasMedia ? (
            <>
              {isVideo ? (
                <video
                  ref={videoRef}
                  className="media video"
                  playsInline
                  muted
                  preload="metadata"
                  disablePictureInPicture
                />
              ) : isImage ? (
                <img 
                  src={currentStatus.media} 
                  className="media image" 
                  alt="Status"
                  loading="eager"
                />
              ) : null}
            </>
          ) : null}
        </div>

        {/* Caption */}
        {hasMedia && statusText && (
          <div className="caption-container">
            <div className="caption-bubble">
              <p>{statusText}</p>
            </div>
          </div>
        )}

        {/* Tap zones */}
        <button className="tap-zone left" onClick={handlePrev} />
        <button className="tap-zone center" onClick={togglePause} />
        <button className="tap-zone right" onClick={() => handleNext(false)} />
      </div>
    </div>
  );
};

export default StatusViewer;
