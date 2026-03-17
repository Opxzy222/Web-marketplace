// FollowedShopStatusScreen.jsx
import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import StatusRing from "../components/shop/StatusRing";
import StatusViewer from "../components/shop/StatusViewer";
import ShopPostsFeed from "../components/shop/ShopPostsFeed";
import "../css/tab/FollowedShopStatus.css";

const BACKEND_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
const FALLBACK_IMAGE = "https://via.placeholder.com/150x150/E3F2FD/6B7280?text=No+Image";
const FETCH_TIMEOUT = 30000; // 15 seconds

const FollowedShopStatusScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [unviewedGroups, setUnviewedGroups] = useState([]);
  const [viewedGroups, setViewedGroups] = useState([]);
  const [followedPosts, setFollowedPosts] = useState([]);
  const [nearbyPosts, setNearbyPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerFlattenedStatuses, setViewerFlattenedStatuses] = useState([]);
  const [viewerKey, setViewerKey] = useState(0);
  const [currentlyViewingShopId, setCurrentlyViewingShopId] = useState(null);

  // Refs
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef(null);

  const validateUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    if (url.startsWith("http")) return url;
    return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isMountedRef.current) return;

    // Cancel any previous request
    abortControllerRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      if (!isRefresh) setLoading(true);
      setRefreshing(isRefresh);
      setErrorMessage(null);

      const userIdString = localStorage.getItem("user_id");
      if (!userIdString) {
        setErrorMessage("Please log in to view content");
        navigate("/login");
        return;
      }

      const userIdNum = parseInt(userIdString, 10);
      setUserId(userIdNum);

      const token = localStorage.getItem("sessionToken") || userIdString;

      const url = `${BACKEND_URL}/combined-feed/?user_id=${userIdNum}`;
      console.log(`[FETCH ${isRefresh ? "REFRESH" : "START"}] URL:`, url);

      // Set timeout to prevent hanging forever
      timeoutRef.current = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, FETCH_TIMEOUT);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal,
      });

      console.log(`[FETCH ${isRefresh ? "REFRESH" : ""}] Status:`, response.status, response.statusText);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("[FETCH ERROR BODY]:", text.substring(0, 300));
        throw new Error(`Server responded with ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const text = await response.text().catch(() => "");
        console.error("[FETCH] Not JSON response:", text.substring(0, 300));
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();
      console.log("[FETCH SUCCESS] Data received:", {
        statuses: data.statuses?.length || 0,
        followed_posts: data.followed_posts?.length || 0,
        nearby_posts: data.nearby_posts?.length || 0,
      });

      const { statuses: fetchedStatuses = [], followed_posts = [], nearby_posts = [] } = data;

      // Group statuses by shop
      const grouped = {};
      fetchedStatuses
        .filter((status) => status?.shop?.id)
        .forEach((status) => {
          const shopId = status.shop.id;
          if (!grouped[shopId]) {
            grouped[shopId] = {
              shopId,
              shop: status.shop.name || "Unknown Shop",
              shopImage: validateUrl(status.shop.image) || FALLBACK_IMAGE,
              statuses: [],
              hasUnviewed: false,
            };
          }
          grouped[shopId].statuses.push({
            ...status,
            media: validateUrl(status.media),
            thumbnail_url: validateUrl(status.thumbnail_url),
            shop: {
              ...status.shop,
              image: validateUrl(status.shop.image),
            },
          });
          if (!status.viewed) grouped[shopId].hasUnviewed = true;
        });

      Object.values(grouped).forEach((group) => {
        group.statuses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });

      const groups = Object.values(grouped);

      const unviewed = groups
        .filter((g) => g.hasUnviewed)
        .sort((a, b) => {
          const latestA = [...a.statuses].reverse().find((s) => !s.viewed)?.created_at || 0;
          const latestB = [...b.statuses].reverse().find((s) => !s.viewed)?.created_at || 0;
          return new Date(latestB) - new Date(latestA);
        });

      const viewed = groups
        .filter((g) => !g.hasUnviewed)
        .sort((a, b) => {
          const latestA = a.statuses[a.statuses.length - 1]?.created_at || 0;
          const latestB = b.statuses[b.statuses.length - 1]?.created_at || 0;
          return new Date(latestB) - new Date(latestA);
        });

      const transformPosts = (posts = []) =>
        posts.map((post) => ({
          id: post.id ?? `post-${Date.now()}-${Math.random()}`,
          ...post,
          shop_image: validateUrl(post.shop_image) || "",
          media: Array.isArray(post.media)
            ? post.media.map((item) => ({
                url: validateUrl(item.url) || "",
                thumbnail_url: validateUrl(item.thumbnail_url) || "",
                type: item.type || "image",
              }))
            : [],
        }));

      if (isMountedRef.current) {
        setUnviewedGroups(unviewed);
        setViewedGroups(viewed);
        setFollowedPosts(transformPosts(followed_posts));
        setNearbyPosts(transformPosts(nearby_posts));
        setCurrentlyViewingShopId(null);
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("[FETCH ABORTED] - likely timeout or manual cancel");
        if (!isRefresh && isMountedRef.current) {
          setErrorMessage("Request timed out. Please check your connection and try again.");
        }
        return;
      }

      console.error("[FETCH ERROR]:", error);
      let msg = "Failed to load content";

      if (error.message.includes("Network") || error.message.includes("Failed to fetch")) {
        msg = "Network error – check your internet connection";
      } else if (error.message.includes("401") || error.message.includes("403")) {
        msg = "Session expired – please log in again";
        navigate("/login");
      } else if (error.message.includes("JSON") || error.message.includes("non-JSON")) {
        msg = "Server returned invalid data";
      } else if (error.message.includes("timed out")) {
        msg = "Request timed out. Please try again.";
      }

      if (isMountedRef.current) setErrorMessage(msg);
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [navigate]);

  // Initial fetch + periodic refresh
  useEffect(() => {
    fetchData(false); // initial load

    const interval = setInterval(() => {
      fetchData(true); // refresh
    }, 15 * 60 * 1000); // every 15 minutes

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      abortControllerRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchData]);

  const handleRefresh = () => fetchData(true);

  // Mark single status as viewed
  const handleSingleStatusViewed = (statusId, shopId) => {
    setUnviewedGroups((prev) =>
      prev.map((group) =>
        group.shopId === shopId
          ? {
              ...group,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, viewed: true } : s
              ),
              hasUnviewed: group.statuses.some((s) => s.id !== statusId && !s.viewed),
            }
          : group
      )
    );

    setViewedGroups((prev) =>
      prev.map((group) =>
        group.shopId === shopId
          ? {
              ...group,
              statuses: group.statuses.map((s) =>
                s.id === statusId ? { ...s, viewed: true } : s
              ),
            }
          : group
      )
    );
  };

  // Mark whole group viewed
  const handleStatusViewed = (viewedStatusGroup) => {
    const shopId = viewedStatusGroup.statuses[0]?.shop?.id;
    if (!shopId) return;

    setCurrentlyViewingShopId(null);

    setUnviewedGroups((prev) => prev.filter((g) => g.shopId !== shopId));

    setViewedGroups((prev) => {
      const exists = prev.find((g) => g.shopId === shopId);
      const newStatuses = viewedStatusGroup.statuses.map((s) => ({ ...s, viewed: true }));

      let updated;
      if (exists) {
        updated = prev.map((g) =>
          g.shopId === shopId
            ? {
                ...g,
                hasUnviewed: false,
                statuses: [...g.statuses, ...newStatuses]
                  .filter((s, i, self) => self.findIndex((t) => t.id === s.id) === i)
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
              }
            : g
        );
      } else {
        updated = [
          ...prev,
          {
            shopId,
            shop: viewedStatusGroup.shop || "Unknown",
            shopImage: viewedStatusGroup.statuses[0]?.shop?.image || FALLBACK_IMAGE,
            statuses: newStatuses,
            hasUnviewed: false,
          },
        ];
      }

      return updated.sort((a, b) => {
        const latestA = a.statuses[a.statuses.length - 1]?.created_at || 0;
        const latestB = b.statuses[b.statuses.length - 1]?.created_at || 0;
        return new Date(latestB) - new Date(latestA);
      });
    });
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setViewerInitialIndex(0);
    setViewerFlattenedStatuses([]);
    setCurrentlyViewingShopId(null);
    setViewerKey((k) => k + 1);
  };

  const getTimeAgo = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now - created;

    if (isNaN(diffMs) || diffMs < 0) return "Just now";

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSeconds < 60) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const flattenedStatuses = useMemo(() => {
    return [...unviewedGroups, ...viewedGroups].flatMap((group) =>
      group.statuses.map((s) => ({
        ...s,
        shop: { ...s.shop, image: group.shopImage },
      }))
    );
  }, [unviewedGroups, viewedGroups]);

  const handleOpenViewer = (groupIndex) => {
    const allGroups = [...unviewedGroups, ...viewedGroups];
    if (groupIndex < 0 || groupIndex >= allGroups.length) return;

    const selectedGroup = allGroups[groupIndex];
    if (!selectedGroup?.statuses?.length) return;

    const firstUnviewed = selectedGroup.statuses.find((s) => !s.viewed);
    const startStatus = firstUnviewed || selectedGroup.statuses[0];

    const correctInitialIndex = flattenedStatuses.findIndex(
      (s) => s.id === startStatus.id && s.shop?.id === selectedGroup.shopId
    );

    if (correctInitialIndex === -1) return;

    setCurrentlyViewingShopId(selectedGroup.shopId);
    setViewerFlattenedStatuses(flattenedStatuses);
    setViewerInitialIndex(correctInitialIndex);
    setViewerOpen(true);
    setViewerKey((k) => k + 1);
  };

  const renderStatusItem = ({ item: group, index }) => {
    const latestStatus = group.statuses[0];
    let thumbnailUri = FALLBACK_IMAGE;

    if (latestStatus?.media_type === "image" && latestStatus.media) {
      thumbnailUri = validateUrl(latestStatus.media) || FALLBACK_IMAGE;
    } else if (latestStatus?.media_type === "video") {
      thumbnailUri =
        validateUrl(latestStatus.thumbnail_url) ||
        validateUrl(latestStatus.shop?.image) ||
        FALLBACK_IMAGE;
    } else if (latestStatus?.shop?.image) {
      thumbnailUri = validateUrl(latestStatus.shop.image) || FALLBACK_IMAGE;
    }

    const timeAgo = latestStatus?.created_at ? getTimeAgo(latestStatus.created_at) : "N/A";
    const isViewing = currentlyViewingShopId === group.shopId;
    const hasUnviewed = group.hasUnviewed && !isViewing;
    const viewedCount = isViewing
      ? group.statuses.filter((s) => s.viewed).length
      : group.statuses.length;

    return (
      <button
        className="status-item"
        onClick={() => handleOpenViewer(index)}
        key={group.shopId || index}
      >
        <StatusRing
          imageUri={thumbnailUri}
          totalStatuses={group.statuses.length}
          viewedStatuses={hasUnviewed ? viewedCount : group.statuses.length}
        />
        <div className="status-text">
          <div className="status-name" title={group.shop}>
            {group.shop}
          </div>
          <div className="status-time">{timeAgo}</div>
        </div>
      </button>
    );
  };

  const allShops = useMemo(() => [...unviewedGroups, ...viewedGroups], [unviewedGroups, viewedGroups]);

  const handleSeeMorePosts = (posts, type) => {
    if (!posts?.length) return;
    navigate(`/more-posts?posts=${encodeURIComponent(JSON.stringify(posts))}&type=${type}`);
  };

  return (
    <PageShell title="Stories & Posts" showBackButton={false}>
      <div className="status-feed-container">
        {loading ? (
          <div className="loader-container">
            <div className="spinner large" />
            <p className="loading-text">Loading your feed...</p>
          </div>
        ) : errorMessage ? (
          <div className="error-container">
            <p>{errorMessage}</p>
            <button className="retry-button" onClick={handleRefresh}>
              Try Again
            </button>
          </div>
        ) : allShops.length === 0 && followedPosts.length === 0 && nearbyPosts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h2>No content yet</h2>
            <p>Follow more shops or check back later for new stories and posts</p>
            <button className="refresh-btn" onClick={handleRefresh}>
              Refresh Feed
            </button>
          </div>
        ) : (
          <div className="feed-scroll">
            {/* Stories Section */}
            {allShops.length > 0 && (
              <section className="stories-section">
                <h2>Stories</h2>
                <div className="status-wrapper">
                  <div className="status-list">
                    {allShops.map((group, index) => renderStatusItem({ item: group, index }))}
                  </div>
                  <div className="fade-effect" />
                </div>
              </section>
            )}

            {/* Followed Posts */}
            {followedPosts.length > 0 && (
              <section className="posts-section">
                <div className="section-header">
                  <h2>Latest Posts</h2>
                  <button
                    className="see-more-btn"
                    onClick={() => handleSeeMorePosts(followedPosts, "followed")}
                  >
                    See More →
                  </button>
                </div>
                <ShopPostsFeed posts={followedPosts.slice(0, 6)} showDistance={false} />
              </section>
            )}

            {/* Nearby Posts */}
            {nearbyPosts.length > 0 && (
              <section className="posts-section">
                <div className="section-header">
                  <h2>Nearby Posts</h2>
                  <button
                    className="see-more-btn"
                    onClick={() => handleSeeMorePosts(nearbyPosts, "nearby")}
                  >
                    See More →
                  </button>
                </div>
                <ShopPostsFeed posts={nearbyPosts.slice(0, 6)} showDistance={true} />
              </section>
            )}
          </div>
        )}

        {/* Status Viewer Modal */}
        {viewerOpen && viewerFlattenedStatuses.length > 0 && (
          <StatusViewer
            key={viewerKey}
            visible={viewerOpen}
            statuses={viewerFlattenedStatuses}
            initialIndex={viewerInitialIndex}
            onClose={handleCloseViewer}
            onStatusViewed={handleStatusViewed}
            onSingleStatusViewed={handleSingleStatusViewed}
            userId={userId}
            authToken={userId?.toString()}
          />
        )}
      </div>
    </PageShell>
  );
};

export default FollowedShopStatusScreen;