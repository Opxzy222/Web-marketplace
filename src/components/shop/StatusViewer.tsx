// StatusViewer.tsx - FIXED: Closes after LAST status, NO restart
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import "../../css/component/shop/StatusViewer.css";

const IMAGE_TEXT_DURATION = 6000;
const VIDEO_MAX_DURATION = 30000;
const LOAD_TIMEOUT = 20000;
const MARK_DEBOUNCE_MS = 350;

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
  const [currentProgress, setCurrentProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(IMAGE_TEXT_DURATION);
  const isNavigatingRef = useRef(false);
  const finishedIdsRef = useRef<Set<string | number>>(new Set());
  const wasStartedFromUnreadRef = useRef(false);
  const markTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewedRef = useRef<Set<string | number>>(new Set());
  const isClosingRef = useRef(false); // 🔒 PREVENT RESTART

  const flattened = useMemo(() => statuses ?? [], [statuses]);

  // Utilities
  const getDuration = useCallback((isVideo: boolean): number => {
    return isVideo ? VIDEO_MAX_DURATION : IMAGE_TEXT_DURATION;
  }, []);

  const clearAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  }, []);

  const markStatusAsViewed = useCallback(
    async (status: any) => {
      if (!status?.id || status.viewed || !userId || viewedRef.current.has(status.id)) return;

      viewedRef.current.add(status.id);

      if (markTimeoutRef.current) clearTimeout(markTimeoutRef.current);

      markTimeoutRef.current = setTimeout(async () => {
        try {
          const formData = new FormData();
          formData.append("user_id", String(userId));
          formData.append("status_ids[]", String(status.id));

          await fetch("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/mark_status_viewed/", {
            method: "POST",
            headers: { Authorization: authToken || "" },
            body: formData,
          });
        } catch (e) {
          console.error("Failed to mark status as viewed:", e);
        }
      }, MARK_DEBOUNCE_MS);
    },
    [userId, authToken]
  );

  // Shop grouping & smart start
  const shopGroups = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    flattened.forEach((status) => {
      const shopId = status.shop?.id;
      if (shopId) {
        if (!groups[shopId]) groups[shopId] = [];
        groups[shopId].push(status);
      }
    });
    return groups;
  }, [flattened]);

  const shopIds = useMemo(() => Object.keys(shopGroups), [shopGroups]);

  const getSmartStartIndex = useCallback(() => {
    if (!flattened.length || initialIndex >= flattened.length) return 0;

    const clickedStatus = flattened[initialIndex];
    const startShopId = clickedStatus?.shop?.id;
    if (!startShopId) return initialIndex;

    const shopStatuses = shopGroups[startShopId] || [];
    const clickedWasUnread = !clickedStatus.viewed;
    wasStartedFromUnreadRef.current = clickedWasUnread;

    if (clickedWasUnread) {
      const firstUnreadIndex = shopStatuses.findIndex(
        (s: any) => !s.viewed && !finishedIdsRef.current.has(s.id)
      );
      const shopStartGlobalIndex = flattened.findIndex((s: any) => s.shop?.id === startShopId);
      return firstUnreadIndex >= 0
        ? shopStartGlobalIndex + firstUnreadIndex
        : shopStartGlobalIndex;
    }
    return initialIndex;
  }, [flattened, initialIndex, shopGroups]);

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

  const currentShopId = currentStatus.shop?.id;
  const currentShopStatuses = useMemo(
    () => shopGroups[currentShopId || ""] || [],
    [shopGroups, currentShopId]
  );
  const currentShopIndex = useMemo(
    () => currentShopStatuses.findIndex((s: any) => s.id === currentStatus.id),
    [currentShopStatuses, currentStatus.id]
  );

  // ANIMATION
  const animateProgress = useCallback(() => {
    if (isClosingRef.current) return;

    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / durationRef.current, 1.0);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    setCurrentProgress(easedProgress);

    if (progress >= 1.0) {
      clearAnimation();
      handleNext(true);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(animateProgress);
  }, []);

  const startProgressAnimation = useCallback(() => {
    if (isClosingRef.current) return;

    clearAnimation();
    setIsPaused(false);
    setCurrentProgress(0);

    durationRef.current = getDuration(isVideo);
    startTimeRef.current = Date.now();

    animationFrameRef.current = requestAnimationFrame(animateProgress);
  }, [isVideo, getDuration]);

  const pauseProgress = useCallback(() => {
    clearAnimation();
    setIsPaused(true);
  }, [clearAnimation]);

  const resumeProgress = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const remaining = durationRef.current - elapsed;
      startTimeRef.current = now - (durationRef.current - remaining);
      animationFrameRef.current = requestAnimationFrame(animateProgress);
    }
  }, [isPaused, animateProgress]);

  const togglePauseResume = useCallback(() => {
    const video = videoRef.current;
    if (isPaused) {
      resumeProgress();
      if (video && isVideo) video.play().catch(() => handleNext(true));
    } else {
      pauseProgress();
      if (video && isVideo) video.pause();
    }
  }, [isPaused, isVideo, resumeProgress, pauseProgress]);

  // FIXED handleNext - CLOSE after last status
  const handleNext = useCallback(
    (fromTimer = false) => {
      if (isNavigatingRef.current || isClosingRef.current) return;

      isNavigatingRef.current = true;
      isClosingRef.current = true;

      clearAnimation();

      const video = videoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
        video.src = "";
      }

      const currentId = currentStatus.id;
      const shopId = currentStatus.shop?.id;
      if (currentId && shopId) {
        finishedIdsRef.current.add(currentId);
        onSingleStatusViewed?.(currentId, shopId);
        markStatusAsViewed(currentStatus);
      }

      let nextGlobalIndex = -1;

      // Only unread‑only on auto‑advance from timer AND started unread
      const useUnreadOnly = fromTimer && wasStartedFromUnreadRef.current;

      if (useUnreadOnly) {
        const nextInShopIndex = currentShopStatuses.findIndex(
          (s: any, idx: number) =>
            idx > currentShopIndex && !s.viewed && !finishedIdsRef.current.has(s.id)
        );

        if (nextInShopIndex !== -1) {
          nextGlobalIndex = flattened.findIndex(
            (s: any) => s.id === currentShopStatuses[nextInShopIndex].id
          );
        } else {
          for (let i = 0; i < shopIds.length; i++) {
            const nextShopId = shopIds[i];
            if (nextShopId === currentShopId) continue;
            const nextShop = shopGroups[nextShopId] || [];
            const firstUnread = nextShop.findIndex(
              (s: any) => !s.viewed && !finishedIdsRef.current.has(s.id)
            );
            if (firstUnread !== -1) {
              nextGlobalIndex = flattened.findIndex(
                (s: any) => s.id === nextShop[firstUnread].id
              );
              break;
            }
          }
        }
      } else {
        // Manual tap: just go to next index
        nextGlobalIndex = currentIndex + 1;
      }

      // Close after last status
      if (nextGlobalIndex === -1 || nextGlobalIndex >= flattened.length) {
        setTimeout(() => {
          onClose();
        }, 100);
      } else {
        setTimeout(() => {
          isClosingRef.current = false;
          setCurrentIndex(nextGlobalIndex);
        }, 50);
      }

      isNavigatingRef.current = false;
    },
    [
      currentIndex,
      currentStatus,
      currentShopIndex,
      currentShopId,
      currentShopStatuses,
      shopGroups,
      shopIds,
      flattened.length,
      onClose,
      onSingleStatusViewed,
      markStatusAsViewed,
      clearAnimation,
    ]
  );

  const handlePrev = useCallback(() => {
    if (isNavigatingRef.current || currentIndex <= 0 || isClosingRef.current) {
      onClose();
      return;
    }

    isNavigatingRef.current = true;
    clearAnimation();

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.src = "";
    }

    setCurrentIndex((prev) => Math.max(0, prev - 1));
    isNavigatingRef.current = false;
  }, [currentIndex, onClose, clearAnimation]);

  // Effects
  useEffect(() => {
    if (visible) {
      setCurrentIndex(getSmartStartIndex());
      finishedIdsRef.current.clear();
      wasStartedFromUnreadRef.current = false;
      viewedRef.current.clear();
      isClosingRef.current = false;
      setCurrentProgress(0);
    }
  }, [visible, getSmartStartIndex]);

  useEffect(() => {
    if (!visible || currentIndex >= flattened.length || isClosingRef.current) {
      return;
    }

    const status = flattened[currentIndex];
    if (!status) return;

    clearAnimation();
    setIsLoading(false);
    setLoadError(null);
    setIsPaused(false);
    setCurrentProgress(0);

    if (isVideo && status.media && videoRef.current) {
      setIsLoading(true);
      const video = videoRef.current;
      video.src = status.media;
      video.load();
      video.currentTime = 0;

      const timeoutId = setTimeout(() => {
        setLoadError("Video failed to load");
        handleNext(true);
      }, LOAD_TIMEOUT);

      const onCanPlay = () => {
        clearTimeout(timeoutId);
        setIsLoading(false);
        video.play().catch(() => handleNext(true));
        startProgressAnimation();
      };

      const onError = () => {
        clearTimeout(timeoutId);
        setLoadError("Failed to load video");
        setTimeout(() => handleNext(true), 1500);
      };

      video.addEventListener("canplay", onCanPlay, { once: true });
      video.addEventListener("error", onError, { once: true });

      return () => {
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onError);
      };
    } else {
      startProgressAnimation();
    }

    return () => {
      clearAnimation();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
        videoRef.current.currentTime = 0;
      }
    };
  }, [currentIndex, visible, flattened.length, isVideo]);

  // Safety net
  useEffect(() => {
    if (currentIndex >= flattened.length && visible && !isClosingRef.current) {
      isClosingRef.current = true;
      onClose();
    }
  }, [currentIndex, flattened.length, visible, onClose]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearAnimation();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
      if (markTimeoutRef.current) clearTimeout(markTimeoutRef.current);
    };
  }, [clearAnimation]);

  if (!visible || currentIndex >= flattened.length) return null;

  return (
    <div className={`status-viewer ${visible ? "visible" : ""}`}>
      <div className="stv-backdrop" onClick={onClose} />
      <div className={`stv-viewer-container ${isPaused ? "paused" : ""}`}>
        <div className="stv-header">
          <div className="stv-shop-info">
            <span className="stv-shop-name">
              {currentStatus.shop?.name ?? "Unknown Shop"}
            </span>
            <span className="stv-created-at">
              {formatRelativeTime(currentStatus.created_at)}
            </span>
          </div>
          <button className="stv-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="stv-progress-container">
          {currentShopStatuses.map((status: any, i: number) => {
            const isCurrent = i === currentShopIndex;
            const isPast = i < currentShopIndex;
            const isFinished = status.viewed || finishedIdsRef.current.has(status.id);

            if (!isPast && !isFinished && !isCurrent) return null;

            const progressClass = `stv-progress-bar ${
              isCurrent ? "current blue" : isPast || isFinished ? "finished white" : "inactive"
            }`;

            const progressWidth = isCurrent
              ? currentProgress
              : isPast || isFinished
              ? 1
              : 0;

            return (
              <div key={status.id} className="stv-progress-background">
                <div
                  className={progressClass}
                  style={{ width: `${progressWidth * 100}%` }}
                />
              </div>
            );
          })}
        </div>

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

        {currentStatus.text && (isImage || isVideo) && (
          <div className="stv-caption-container">
            <div className="stv-caption-bubble">
              <p>{currentStatus.text}</p>
            </div>
          </div>
        )}

        <button className="stv-tap-zone left" onClick={handlePrev} />
        <button className="stv-tap-zone center" onClick={togglePauseResume} />
        <button className="stv-tap-zone right" onClick={() => handleNext(false)} />
      </div>
    </div>
  );
};

export default StatusViewer;