// StatusViewer.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import '../../css/component/shop/StatusViewer..css';

const IMAGE_TEXT_DURATION = 6000;     // 6 seconds
const VIDEO_MAX_DURATION = 30000;     // 30 seconds max
const LOAD_TIMEOUT = 10000;

const formatRelativeTime = (createdAt: string | undefined): string => {
  if (!createdAt) return "";
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

interface StatusViewerProps {
  visible: boolean;
  statuses: any[];
  initialIndex: number;
  onClose: () => void;
  onStatusViewed?: (data: any) => void;
  onSingleStatusViewed?: (statusId: string | number, shopId: string | number) => void;
  userId?: string | number;
  authToken?: string;
}

const StatusViewer: React.FC<StatusViewerProps> = ({
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(IMAGE_TEXT_DURATION);
  const isNavigatingRef = useRef(false);
  const finishedIdsRef = useRef(new Set<string | number>());

  const flattened = useMemo(() => statuses ?? [], [statuses]);

  // Find the correct starting index (first unviewed in the shop)
  const smartStartIndex = useMemo(() => {
    if (!flattened.length || initialIndex >= flattened.length) return 0;

    const clickedStatus = flattened[initialIndex];
    const shopId = clickedStatus?.shop?.id;
    if (!shopId) return initialIndex;

    const shopStartIndex = flattened.findIndex((s: any) => s.shop?.id === shopId);
    if (shopStartIndex === -1) return initialIndex;

    const shopSlice = flattened.slice(shopStartIndex).filter((s: any) => s.shop?.id === shopId);
    const firstUnviewed = shopSlice.findIndex((s: any) => !s.viewed);

    return firstUnviewed >= 0 ? shopStartIndex + firstUnviewed : shopStartIndex;
  }, [flattened, initialIndex]);

  // Update currentIndex when visible or initialIndex changes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(smartStartIndex);
    }
  }, [visible, smartStartIndex]);

  const currentStatus = useMemo(() => {
    let status = flattened[currentIndex] ?? {};
    if (status.media && /\.(mp4|mov|avi|webm)$/i.test(status.media) && status.media_type !== "video") {
      status = { ...status, media_type: "video" };
    }
    return status;
  }, [flattened, currentIndex]);

  const isImage = currentStatus.media_type === "image";
  const isVideo = currentStatus.media_type === "video";
  const isText = currentStatus.media_type === "text";
  const hasMedia = (isImage || isVideo) && !!currentStatus.media;

  const shopStatuses = useMemo(() => {
    const shopId = currentStatus.shop?.id;
    if (!shopId) return [];
    return flattened.filter((s: any) => s.shop?.id === shopId);
  }, [flattened, currentStatus.shop?.id]);

  const effectiveIndex = useMemo(() => {
    const shopId = currentStatus.shop?.id;
    if (!shopId) return 0;
    return shopStatuses.findIndex((s: any) => s.id === currentStatus.id);
  }, [shopStatuses, currentStatus]);

  const getDuration = useCallback(() => {
    return isVideo ? VIDEO_MAX_DURATION : IMAGE_TEXT_DURATION;
  }, [isVideo]);

  const clearProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgress = useCallback(() => {
    clearProgress();
    setIsPaused(false);
    pausedTimeRef.current = 0;
    startTimeRef.current = Date.now();
    durationRef.current = getDuration();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= durationRef.current) {
        clearProgress();
        handleNext(true);
      }
    }, 50);
  }, [getDuration, clearProgress]);

  // WhatsApp-like navigation: finish current shop → go to next shop with unread
  const handleNext = useCallback((fromTimer = false) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    clearProgress();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = "";
    }

    // Mark current status as viewed
    const currentId = currentStatus.id;
    const shopId = currentStatus.shop?.id;
    if (currentId && shopId) {
      finishedIdsRef.current.add(currentId);
      onSingleStatusViewed?.(currentId, shopId);
    }

    // Check if entire current shop is finished
    let nextIdx = currentIndex + 1;

    if (shopId) {
      const currentShopSlice = flattened.filter((s: any) => s.shop?.id === shopId);
      const allDoneInShop = currentShopSlice.every(
        (s: any) => s.viewed || finishedIdsRef.current.has(s.id)
      );

      if (allDoneInShop) {
        // Find next shop that still has unread statuses
        let foundNextShop = false;
        for (let i = nextIdx; i < flattened.length; i++) {
          const candidate = flattened[i];
          if (!candidate?.shop?.id) continue;

          const candidateShopSlice = flattened.filter((s: any) => s.shop?.id === candidate.shop.id);
          const hasUnread = candidateShopSlice.some(
            (s: any) => !s.viewed && !finishedIdsRef.current.has(s.id)
          );

          if (hasUnread) {
            const firstUnread = candidateShopSlice.findIndex(
              (s: any) => !s.viewed && !finishedIdsRef.current.has(s.id)
            );
            const shopStart = flattened.findIndex((s: any) => s.shop?.id === candidate.shop.id);
            nextIdx = shopStart + firstUnread;
            foundNextShop = true;
            break;
          }
        }

        if (!foundNextShop) {
          onClose();
          isNavigatingRef.current = false;
          return;
        }
      }
    }

    if (nextIdx >= flattened.length) {
      onClose();
      isNavigatingRef.current = false;
      return;
    }

    setCurrentIndex(nextIdx);
    isNavigatingRef.current = false;
  }, [flattened, currentIndex, currentStatus, onClose, onSingleStatusViewed]);

  const handlePrev = useCallback(() => {
    if (isNavigatingRef.current || currentIndex <= 0) {
      onClose();
      return;
    }
    isNavigatingRef.current = true;
    clearProgress();

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = "";
    }

    setCurrentIndex((prev) => Math.max(0, prev - 1));
    isNavigatingRef.current = false;
  }, [currentIndex, onClose, clearProgress]);

  const togglePause = useCallback(() => {
    const video = videoRef.current;

    if (isPaused) {
      // Resume
      setIsPaused(false);
      startTimeRef.current = Date.now() - pausedTimeRef.current;
      startProgress();
      if (video && isVideo) video.play().catch(console.error);
    } else {
      // Pause
      setIsPaused(true);
      pausedTimeRef.current = Date.now() - startTimeRef.current;
      clearProgress();
      if (video) video.pause();
    }
  }, [isPaused, isVideo, startProgress, clearProgress]);

  const markStatusAsViewed = useCallback(async (status: any) => {
    if (!status || status.viewed || !userId) return;
    try {
      const formData = new FormData();
      formData.append("user_id", String(userId));
      formData.append("status_ids[]", String(status.id));

      await fetch('/api/mark_status_viewed/', {
        method: 'POST',
        headers: { Authorization: authToken || '' },
        body: formData,
      });
    } catch (e) {
      console.error('Failed to mark status as viewed:', e);
    }
  }, [userId, authToken]);

  // Main effect - runs when current status changes
  useEffect(() => {
    if (!visible || currentIndex >= flattened.length) {
      onClose();
      return;
    }

    const status = flattened[currentIndex];
    if (!status) return;

    clearProgress();
    setIsLoading(false);
    setLoadError(null);
    setIsPaused(false);

    markStatusAsViewed(status);

    if (isVideo && status.media && videoRef.current) {
      setIsLoading(true);
      const video = videoRef.current;
      video.src = status.media;
      video.load();

      const timeoutId = setTimeout(() => {
        setLoadError("Video failed to load");
        handleNext(true);
      }, LOAD_TIMEOUT);

      const onCanPlay = () => {
        clearTimeout(timeoutId);
        setIsLoading(false);
        video.play().catch(() => handleNext(true));
        startProgress();
      };

      const onError = () => {
        clearTimeout(timeoutId);
        setLoadError("Failed to load video");
        setTimeout(() => handleNext(true), 1500);
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('error', onError, { once: true });

      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };
    } else {
      startProgress();
    }

    return () => {
      clearProgress();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, [currentIndex, visible, flattened, isVideo, markStatusAsViewed, startProgress, handleNext, onClose]);

  // Final cleanup
  useEffect(() => {
    return () => {
      clearProgress();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
    };
  }, [clearProgress]);

  if (!visible || currentIndex >= flattened.length) return null;

  return (
    <div className={`status-viewer ${visible ? 'visible' : ''}`}>
      <div className="stv-backdrop" onClick={onClose} />

      <div className={`stv-viewer-container ${isPaused ? 'paused' : ''}`}>
        {/* Header */}
        <div className="stv-header">
          <div className="stv-shop-info">
            <span className="stv-shop-name">{currentStatus.shop?.name ?? "Unknown Shop"}</span>
            <span className="stv-created-at">{formatRelativeTime(currentStatus.created_at)}</span>
          </div>
          <button className="stv-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Progress Bars */}
        <div className="stv-progress-container">
          {shopStatuses.map((status: any, i: number) => {
            const isCurrent = i === effectiveIndex;
            const isPast = i < effectiveIndex;
            const isFinished = status.viewed || finishedIdsRef.current.has(status.id);

            let progress = 0;
            if (isPast || isFinished) progress = 1;
            else if (isCurrent) {
              const elapsed = Date.now() - startTimeRef.current;
              progress = Math.min(elapsed / durationRef.current, 1);
            }

            return (
              <div key={status.id} className="stv-progress-background">
                <div
                  className="stv-progress-bar"
                  style={{
                    transform: `scaleX(${progress})`,
                    backgroundColor: isCurrent ? "#fff" : "rgba(255,255,255,0.65)",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="stv-content-wrapper">
          {isText && currentStatus.text ? (
            <div className="stv-text-status">
              <p>{currentStatus.text}</p>
            </div>
          ) : isLoading && isVideo ? (
            <div className="stv-loading-container">
              <div className="stv-spinner" />
              <p>Loading video...</p>
            </div>
          ) : loadError ? (
            <div className="stv-error-container">
              <p>{loadError}</p>
            </div>
          ) : hasMedia ? (
            isVideo ? (
              <video
                ref={videoRef}
                className="stv-media video"
                playsInline
                muted
                preload="metadata"
                disablePictureInPicture
              />
            ) : (
              <img
                src={currentStatus.media}
                className="stv-media image"
                alt="Status"
                loading="eager"
              />
            )
          ) : null}
        </div>

        {/* Caption */}
        {currentStatus.text && (isImage || isVideo) && (
          <div className="stv-caption-container">
            <div className="stv-caption-bubble">
              <p>{currentStatus.text}</p>
            </div>
          </div>
        )}

        {/* Tap Zones - WhatsApp Style */}
        <button className="stv-tap-zone left" onClick={handlePrev} />
        <button className="stv-tap-zone center" onClick={togglePause} />
        <button className="stv-tap-zone right" onClick={() => handleNext(false)} />
      </div>
    </div>
  );
};

export default StatusViewer;