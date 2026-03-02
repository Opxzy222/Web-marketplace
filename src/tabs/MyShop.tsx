// src/pages/MyShop.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store,
  ShoppingCart,
  Wrench,
  RefreshCw,
  PlusCircle,
  BarChart3,
  Info,
  LogOut,
} from "lucide-react";
import axios from "axios";
import PageShell from "../components/PageShell"; // adjust path if needed
import '../css/tab/MyShop.css';

const CACHE_KEY = "MyShop_Cache";
const NAVIGATION_THRESHOLD = 3;
const SESSION_CHECK_INTERVAL = 1000; // ms
const FETCH_DEBOUNCE_MS = 10000; // ms

const MyShop = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [shops, setShops] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const isMountedRef = useRef(true);
  const lastFetchTimeRef = useRef(0);
  const lastRouteRef = useRef(location.pathname);

  // Load subscription from cache
  useEffect(() => {
    const loadSubscription = () => {
      try {
        const cache = localStorage.getItem("subscription_cache");
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
        }
      } catch (err) {
        console.error("Failed to load subscription_cache:", err);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    loadSubscription();
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      setShops([]);
      setHasFetched(false);
    } catch (err) {
      console.error("Error clearing cache:", err);
    }
  }, []);

  // Session change detection
  const checkSession = useCallback(async () => {
    const newSessionId = localStorage.getItem("sessionToken");
    if (newSessionId !== sessionId) {
      setSessionId(newSessionId);
      if (newSessionId) {
        await clearCache();
        setLoading(true);
        await fetchShops(newSessionId);
      } else {
        setShops([]);
        setLoading(false);
        navigate("/login");
      }
    }
  }, [sessionId, clearCache, navigate]);

  // Load cached shops
  const loadCachedData = useCallback(async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setShops(data || []);
        setLoading(false);
      }
    } catch (err) {
      console.error("Cache load error:", err);
    }
  }, []);

  // Save to cache
  const saveToCache = useCallback((data: any) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Cache save error:", err);
    }
  }, []);

  // Fetch shops
  const fetchShops = useCallback(
    async (currentSessionId = sessionId) => {
      if (!currentSessionId) return;

      const now = Date.now();
      if (now - lastFetchTimeRef.current < FETCH_DEBOUNCE_MS) return;
      lastFetchTimeRef.current = now;

      try {
        const res = await axios.post(
          "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops-product-count/",
          {},
          {
            headers: {
              Authorization: currentSessionId,
              "Content-Type": "application/json",
            },
          }
        );
        setShops(res.data);
        setHasFetched(true);
        saveToCache(res.data);
        setError(null);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load shops. Please check your connection.");
      } finally {
        setLoading(false);
      }
    },
    [sessionId, saveToCache]
  );

  // Navigation count for ads/interstitials
  const incrementNavigationCount = useCallback(async () => {
    try {
      let count = parseInt(localStorage.getItem("navigationCount") || "0", 10);
      count += 1;
      localStorage.setItem("navigationCount", count.toString());
      return count;
    } catch (err) {
      console.error("Count error:", err);
      return 0;
    }
  }, []);

  // Initialize
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      await checkSession();
      await loadCachedData();
      if (sessionId) await fetchShops(sessionId);
    };
    init();

    const interval = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [checkSession, loadCachedData, fetchShops, sessionId]);

  // Route change → ad threshold
  useEffect(() => {
    if (lastRouteRef.current !== location.pathname) {
      lastRouteRef.current = location.pathname;
      incrementNavigationCount().then((count) => {
        if (count >= NAVIGATION_THRESHOLD) {
          console.log("Navigation threshold reached – show ad/interstitial");
          // → Add your ad logic here
          localStorage.setItem("navigationCount", "0");
        }
      });
    }
  }, [location.pathname, incrementNavigationCount]);

  // Handlers
  const handleReload = useCallback(() => {
    setLoading(true);
    checkSession().then(() => {
      if (sessionId) fetchShops();
    });
  }, [checkSession, fetchShops, sessionId]);

  const handleCloseShop = useCallback(
    async (shopId: number) => {
      if (!window.confirm("Are you sure you want to close this space?")) return;

      try {
        await axios.delete(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/close-shop/${shopId}/`, {
          headers: { Authorization: sessionId },
        });
        setShops((prev) => prev.filter((s) => s.id !== shopId));
        saveToCache(shops.filter((s) => s.id !== shopId));
        alert("Space closed successfully.");
      } catch (err) {
        alert("Failed to close space.");
      }
    },
    [sessionId, shops, saveToCache]
  );

  const handleCreateShop = useCallback(async () => {
    if (shops.length > 0) {
      alert("You cannot create a new space while your current space is active.");
      return;
    }
    try {
      const count = await incrementNavigationCount();
      navigate("/create-space");
      if (count >= NAVIGATION_THRESHOLD) {
        console.log("Would show ad here");
        localStorage.setItem("navigationCount", "0");
      }
    } catch (err) {
      alert("Failed to navigate to Create Space.");
    }
  }, [shops, navigate, incrementNavigationCount]);

  if (loading && shops.length === 0 && !hasFetched) {
    return (
      <div className="myshp-loading">
        <div className="myshp-spinner" />
        <p>Loading your spaces...</p>
      </div>
    );
  }

  return (
    <PageShell
      title="My Shop"
      isLoading={loading}
      error={error}
      onRetry={handleReload}
      backPath={-1}
    >
      <div className="myshp-page">
        <div className="myshp-content">
          {error && shops.length === 0 && (
            <div className="myshp-error">
              <p>Failed to load your spaces. Please check your connection.</p>
              <motion.button
                className="myshp-reload-btn"
                onClick={handleReload}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw size={20} />
                Retry
              </motion.button>
            </div>
          )}

          {!error && hasFetched && shops.length === 0 && (
            <motion.button
              className="myshp-create-space-btn"
              onClick={handleCreateShop}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.96 }}
            >
              <PlusCircle size={24} />
              Create Your Business Space
            </motion.button>
          )}

          {shops.length > 0 && (
            <div className="myshp-grid">
              {shops.map((shop) => {
                const isService = shop.category?.toLowerCase() === "services";

                return (
                  <motion.div
                    key={shop.id}
                    className="myshp-card"
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <h3 className="myshp-shop-name">{shop.name}</h3>
                    <p className="myshp-shop-info">
                      {isService ? "Services" : "Products"}: {shop.product_count}
                    </p>

                    <div className="myshp-actions">
                      <button
                        className="myshp-action-btn myshp-admin"
                        onClick={() => navigate("/admin-shop-page", { state: { shopId: shop.id } })}
                      >
                        <Store size={24} />
                        <span>Admin</span>
                      </button>

                      <button
                        className="myshp-action-btn myshp-services"
                        onClick={() =>
                          navigate("/shop-products", {
                            state: { shopId: shop.id, category: shop.category },
                          })
                        }
                      >
                        {isService ? <Wrench size={24} /> : <ShoppingCart size={24} />}
                        <span>{isService ? "Services" : "Products"}</span>
                      </button>

                      <button
                        className="myshp-action-btn myshp-stories"
                        onClick={() => navigate("/status-updates", { state: { shopId: shop.id } })}
                      >
                        <RefreshCw size={24} />
                        <span>Stories</span>
                      </button>

                      <button
                        className="myshp-action-btn myshp-sales"
                        onClick={() => navigate("/sales-action", { state: { shopId: shop.id } })}
                      >
                        <BarChart3 size={24} />
                        <span>Sales</span>
                      </button>

                      <button
                        className="myshp-action-btn myshp-details"
                        onClick={() => navigate("/details", { state: { shopId: shop.id } })}
                      >
                        <Info size={24} />
                        <span>Details</span>
                      </button>

                      <button
                        className="myshp-action-btn myshp-quit"
                        onClick={() => handleCloseShop(shop.id)}
                      >
                        <LogOut size={24} />
                        <span>Quit Space</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default MyShop;