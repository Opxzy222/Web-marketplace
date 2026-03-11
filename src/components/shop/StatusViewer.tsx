// StatusViewer.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import '../../css/component/shop/StatusViewer..css';

const IMAGE_TEXT_DURATION = 6000;
const VIDEO_MAX_DURATION = 30000;
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
  visible?: boolean;
  statuses: any[];
  initialIndex?: number;
  onClose: () => void;
  onStatusViewed?: (data: any) => void;
  onSingleStatusViewed?: (statusId: string | number, shopId: string | number) => void;
  userId?: string | number;
  authToken?: string;
}

const StatusViewer: React.FC<StatusViewerProps> = ({
  visible = true,
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

  const progressRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const pausedTimeRef = useRef(0);
  const isNavigatingRef = useRef(false);
  const currentIndexRef = useRef(initialIndex);
  const finishedIdsRef = useRef(new Set<string | number>());
  const startedWithUnviewedRef = useRef(false);

  const flattened = useMemo(() => statuses ?? [], [statuses]);

  // Determine smart starting point (first unviewed in the same shop)
  const smartStartIndex = useMemo(() => {
    if (!flattened.length) return 0;

    const clicked = flattened[initialIndex];
    const shopId = clicked?.shop?.id;
    if (!shopId) return 0;

    const shopStart = flattened.findIndex((s: any) => s.shop?.id === shopId);
    if (shopStart === -1) return 0;

    const shopSlice = flattened.slice(shopStart).filter((s: any) => s.shop?.id === shopId);
    const firstUnviewed = shopSlice.findIndex(
      (s: any) => !s.viewed && !finishedIdsRef.current.has(s.id)
    );

    startedWithUnviewedRef.current = firstUnviewed >= 0;
    return firstUnviewed >= 0 ? shopStart + firstUnviewed : shopStart;
  }, [flattened, initialIndex]);

  useEffect(() => {
    setCurrentIndex(smartStartIndex);
    currentIndexRef.current = smartStartIndex;
  }, [smartStartIndex]);

  const currentStatus = useMemo(() => {
    let s = flattened[currentIndex] ?? {};
    if (s.media && /\.(mp4|mov|avi)$/i.test(s.media) && s.media_type !== "video") {
      s = { ...s, media_type: "video" };
    }
    return s;
  }, [flattened, currentIndex]);

  const isImage = currentStatus.media_type === "image";
  const isVideo = currentStatus.media_type === "video";
  const isText = currentStatus.media_type === "text";
  const hasMedia = (isImage || isVideo) && !!currentStatus.media;
  const statusText = currentStatus.text?.trim() ?? "";

  const { shopStatuses, effectiveIndex } = useMemo(() => {
    const shopId = currentStatus.shop?.id ?? 0;
    const list = flattened.filter((s: any) => s.shop?.id === shopId);
    const start = flattened.findIndex((s: any) => s.shop?.id === shopId);
    const effIdx = currentIndex - start;
    return {
      shopStatuses: list,
      effectiveIndex: effIdx >= 0 ? effIdx : 0,
    };
  }, [currentStatus, flattened, currentIndex]);

  const videoRef = useRef<HTMLVideoElement>(null);

  const getStatusDuration = useCallback(() => {
    return IMAGE_TEXT_DURATION; // You can make this dynamic later
  }, []);

  // ── 1. handleNext ──
  const handleNext = useCallback(
    (fromTimer = false) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      if (!fromTimer && isPausedRef.current) {
        isPausedRef.current = false;
        isNavigatingRef.current = false;
        return;
      }

      const video = videoRef.current;
      if (video) video.pause();

      setIsLoading(false);
      setLoadError(null);

      let nextIdx = currentIndexRef.current + 1;

      // Skip to next shop with unviewed content if possible
      while (nextIdx < flattened.length) {
        const nxt = flattened[nextIdx];
        const shopId = nxt.shop?.id;
        const shopStart = flattened.findIndex((s: any) => s.shop?.id === shopId);
        const shopEndIndex = flattened.slice(shopStart).findIndex((s: any) => s.shop?.id !== shopId);
        const shopEnd = shopEndIndex === -1 ? flattened.length : shopStart + shopEndIndex;

        const shopSlice = flattened.slice(shopStart, shopEnd);
        const hasUnviewed = shopSlice.some(
          (s: any) => !s.viewed && !finishedIdsRef.current.has(s.id)
        );

        if (hasUnviewed) {
          const firstUnviewed = shopSlice.findIndex(
            (s: any) => !s.viewed && !finishedIdsRef.current.has(s.id)
          );
          nextIdx = shopStart + firstUnviewed;
          break;
        } else {
          nextIdx = shopEnd;
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
    },
    [flattened, onClose]
  );

  // ── 2. startProgress (depends on handleNext) ──
  const startProgress = useCallback(
    (overrideDuration?: number) => {
      if (isPausedRef.current || isNavigatingRef.current) return;

      const duration = overrideDuration ?? getStatusDuration();
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        progressRef.current = progress;

        if (progress < 1 && !isPausedRef.current && !isNavigatingRef.current) {
          animationRef.current = requestAnimationFrame(animate);
        } else if (progress >= 1) {
          const statusId = currentStatus.id;
          const shopId = currentStatus.shop?.id;

          if (statusId && shopId) {
            onSingleStatusViewed?.(statusId, shopId);
          }
          finishedIdsRef.current.add(statusId);

          if (shopId) {
            const shopSlice = flattened.filter((s: any) => s.shop?.id === shopId);
            const allDone = shopSlice.every(
              (s: any) => s.viewed || finishedIdsRef.current.has(s.id)
            );
            if (allDone) {
              onStatusViewed?.({
                shopId,
                shop: currentStatus.shop?.name,
                shopImage: currentStatus.shop?.image,
                statuses: shopSlice.map((s: any) => ({ ...s, viewed: true })),
              });
            }
          }

          handleNext(true);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [currentStatus, onSingleStatusViewed, onStatusViewed, flattened, handleNext, getStatusDuration]
  );

  // ── 3. handlePrev ──
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
      const shopStart = flattened.findIndex((s: any) => s.shop?.id === curShopId);
      if (prevIdx < shopStart) {
        const prevShopId = flattened[prevIdx]?.shop?.id;
        const lastInPrev = flattened
          .slice(0, shopStart)
          .findLastIndex((s: any) => s.shop?.id === prevShopId);
        prevIdx = lastInPrev >= 0 ? lastInPrev : prevIdx;
      }
    }

    currentIndexRef.current = prevIdx;
    setCurrentIndex(prevIdx);
    isPausedRef.current = false;
    isNavigatingRef.current = false;
  }, [flattened, onClose]);

  // ── 4. togglePause (depends on startProgress) ──
  const togglePause = useCallback(() => {
    isPausedRef.current = !isPausedRef.current;
    const video = videoRef.current;

    if (isPausedRef.current) {
      pausedTimeRef.current = progressRef.current * getStatusDuration();
      if (video) video.pause();
      if (animationRef.current !== null) {
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

  const markStatusAsViewed = useCallback(
    async (status: any) => {
      if (!status || status.viewed || !userId) return;
      try {
        const formData = new FormData();
        formData.append("user_id", String(userId));
        formData.append("status_ids[]", String(status.id));

        await fetch('/api/mark_status_viewed/', {
          method: 'POST',
          headers: {
            Authorization: authToken || '',
          },
          body: formData,
        });
      } catch (e) {
        console.error('Failed to mark status as viewed:', e);
      }
    },
    [userId, authToken]
  );

  // Main lifecycle effect
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

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Mark earlier items in same shop
    const shopId = status.shop?.id;
    if (shopId) {
      const shopStart = flattened.findIndex((s: any) => s.shop?.id === shopId);
      for (let i = shopStart; i < currentIndex; i++) {
        finishedIdsRef.current.add(flattened[i].id);
      }
    }

    markStatusAsViewed(status);

    if (isVideo && status.media && videoRef.current) {
      setIsLoading(true);
      const video = videoRef.current;

      video.src = status.media;
      video.load();

      const timeout = setTimeout(() => {
        setLoadError("Video load timeout");
        handleNext(true);
      }, LOAD_TIMEOUT);

      const onLoaded = () => {
        clearTimeout(timeout);
        setIsLoading(false);
        if (!isPausedRef.current) {
          video.play().catch(() => handleNext(true));
          startProgress();
        }
      };

      const onError = () => {
        clearTimeout(timeout);
        setLoadError("Video failed to load");
        setTimeout(() => handleNext(true), 2000);
      };

      video.addEventListener('loadeddata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });

      return () => {
        video.removeEventListener('loadeddata', onLoaded);
        video.removeEventListener('error', onError);
      };
    } else {
      setIsLoading(false);
      startProgress();
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, [
    currentIndex,
    visible,
    flattened,
    isVideo,
    markStatusAsViewed,
    startProgress,
    handleNext,
    onClose,
  ]);

  // Final cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, []);

  if (!visible || currentIndex >= flattened.length) return null;

  return (
    <div className={`status-viewer ${visible ? 'visible' : ''}`}>
      <div className="stv-backdrop" onClick={onClose} />

      <div className="stv-viewer-container">
        <div className="stv-header">
          <div className="stv-shop-info">
            <span className="stv-shop-name">{currentStatus.shop?.name ?? "Unknown Shop"}</span>
            <span className="stv-created-at">{formatRelativeTime(currentStatus.created_at)}</span>
          </div>
          <button className="stv-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="stv-progress-container">
          {shopStatuses.map((status: any, i: number) => {
            const isCurrent = i === effectiveIndex;
            const isPast = i < effectiveIndex;
            const isViewed = status.viewed || finishedIdsRef.current.has(status.id);
            const progress = isCurrent
              ? progressRef.current
              : isPast || (isViewed && !isCurrent)
              ? 1
              : 0;

            return (
              <div key={status.id} className="stv-progress-background">
                <div
                  className="stv-progress-bar"
                  style={{
                    transform: `scaleX(${progress})`,
                    backgroundColor: isCurrent ? 'white' : 'rgba(255,255,255,0.6)',
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="stv-content-wrapper">
          {isText && statusText ? (
            <div className="stv-text-status">
              <p>{statusText}</p>
            </div>
          ) : isLoading && isVideo ? (
            <div className="stv-loading-container">
              <div className="stv-spinner" />
            </div>
          ) : loadError && isVideo ? (
            <div className="stv-error-container">
              <p>{loadError}</p>
            </div>
          ) : hasMedia ? (
            <>
              {isVideo ? (
                <video
                  ref={videoRef}
                  className="stv-media video"
                  playsInline
                  muted
                  preload="metadata"
                  disablePictureInPicture
                />
              ) : isImage ? (
                <img
                  src={currentStatus.media}
                  className="stv-media image"
                  alt="Status content"
                  loading="eager"
                />
              ) : null}
            </>
          ) : null}
        </div>

        {hasMedia && statusText && (
          <div className="stv-caption-container">
            <div className="stv-caption-bubble">
              <p>{statusText}</p>
            </div>
          </div>
        )}

        <button className="stv-tap-zone left" onClick={handlePrev} />
        <button className="stv-tap-zone center" onClick={togglePause} />
        <button className="stv-tap-zone right" onClick={() => handleNext(false)} />
      </div>
    </div>
  );
};

export default StatusViewer;