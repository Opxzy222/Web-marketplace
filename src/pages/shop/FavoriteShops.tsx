// AllFollowedShops.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageShell from "../../components/PageShell";
import "../../css/shop/FavoriteShops.css";

const CACHE_KEY = "followedShopsCache";
const API_BASE = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";

const AllFollowedShops = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { prevRoute } = location.state || {};

  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasMounted = useRef(false);

  useEffect(() => {
    const loadFollowedShops = async () => {
      const token = localStorage.getItem("sessionToken");

      if (!token) {
        setError("No authentication token found. Please log in.");
        setLoading(false);
        return;
      }

      let cachedData = null;

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          cachedData = JSON.parse(cached);
          if (!hasMounted.current) {
            setShops(cachedData);
            setFilteredShops(cachedData);
          }
        }
      } catch (err) {
        console.error("Cache read error:", err);
      }

      try {
        const response = await fetch(`${API_BASE}/shops/followed/`, {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));

        if (!hasMounted.current || JSON.stringify(sorted) !== JSON.stringify(cachedData)) {
          setShops(sorted);
          setFilteredShops(sorted);
          localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
        }

        setError(null);
      } catch (err) {
        console.error("Failed to load followed shops:", err);
        setError("Could not load favorite spaces. Please try again later.");
      } finally {
        setLoading(false);
        hasMounted.current = true;
      }
    };

    loadFollowedShops();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
      return;
    }

    const q = searchQuery.toLowerCase();
    const filtered = shops.filter((shop) =>
      shop.name?.toLowerCase().includes(q)
    );
    setFilteredShops(filtered);
  }, [searchQuery, shops]);

  const handleShopPress = (shopId) => {
    navigate(`/shop/shop-page/${shopId}`, { state: { from: location.pathname } });
  };

  const handleBack = () => {
    if (prevRoute) {
      navigate(prevRoute);
    } else {
      navigate("/(tabs)/shop");
    }
  };

  return (
    <PageShell
      title="Favorite Spaces"
      showBackButton={true}
      onBack={handleBack}
      className="alfs-followed-shops-page"
    >
      <div className="alfs-content-wrapper">
        <div className="alfs-search-bar-container">
          <div className="alfs-search-input-wrapper">
            <span className="alfs-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search favorite spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="alfs-search-input"
            />
            {searchQuery && (
              <button
                className="alfs-clear-search-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="alfs-loading-state">
            <div className="alfs-spinner" />
            <p>Loading your favorite spaces...</p>
          </div>
        ) : error ? (
          <div className="alfs-error-state">
            <p className="alfs-error-text">{error}</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="alfs-empty-state">
            <p className="alfs-empty-text">
              {searchQuery
                ? "No spaces match your search."
                : "You haven't followed any spaces yet."}
            </p>
          </div>
        ) : (
          <div className="alfs-shops-grid">
            {filteredShops.map((shop) => (
              <button
                key={shop.id}
                className="alfs-shop-card"
                onClick={() => handleShopPress(shop.id)}
              >
                <div className="alfs-shop-image-container">
                  <img
                    src={shop.image}
                    alt={shop.name || "Shop"}
                    className="alfs-shop-image"
                    onError={(e) => {
                      e.currentTarget.src = "/fallback-shop.png";
                      e.currentTarget.alt = "Image not available";
                    }}
                  />
                </div>
                <div className="alfs-shop-info">
                  <h3 className="alfs-shop-name">{shop.name}</h3>
                </div>
                <span className="alfs-chevron">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default AllFollowedShops;