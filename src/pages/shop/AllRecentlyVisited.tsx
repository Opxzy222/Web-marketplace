// AllRecentlyVisitedShops.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/PageShell";
import "../../css/shop/AllRecentlyVisitedShops.css";

const API_BASE = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";

const formatVisitedAt = (dateStr) => {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid date";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const AllRecentlyVisitedShops = () => {
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const loadRecentlyVisited = async () => {
      const token = localStorage.getItem("sessionToken");
      if (!token) {
        setError("Please log in to view your visit history.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/shops/all-recently-visited/`, {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }

        const data = await res.json();
        const visited = data.recently_visited_shops || data || [];
        setShops(visited);
      } catch (err) {
        console.error("Failed to load recently visited shops:", err);
        setError("Unable to load visit history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadRecentlyVisited();
  }, []);

  const filteredShops = useMemo(() => {
    return shops
      .filter((shop) => {
        if (!shop?.visited_at) return false;
        const visitDate = new Date(shop.visited_at);
        let matches = true;

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matches = matches && visitDate >= start;
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matches = matches && visitDate <= end;
        }

        return matches;
      })
      .sort((a, b) => new Date(b.visited_at) - new Date(a.visited_at));
  }, [shops, startDate, endDate]);

  const groupedData = useMemo(() => {
    const result = [];
    let lastDateKey = null;

    filteredShops.forEach((shop) => {
      const dateKey = formatVisitedAt(shop.visited_at);
      if (dateKey !== lastDateKey) {
        result.push({ type: "separator", date: dateKey });
        lastDateKey = dateKey;
      }
      result.push({ type: "shop", shop });
    });

    return result;
  }, [filteredShops]);

  const handleDateChange = (type, value) => {
    if (type === "start") {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setShowFilter(false);
  };

  const handleBack = () => navigate("/(tabs)/shop");

  return (
  <PageShell
    title="Recently Visited Spaces"
    showBackButton={true}
    onBack={handleBack}
    className="alrt-recently-visited-page"
  >
    <div className="alrt-content-wrapper">
      {/* Filter Bar – compact & sticky-friendly */}
      <div className="alrt-filter-bar">
        <button
          className="alrt-filter-toggle-btn"
          onClick={() => setShowFilter((prev) => !prev)}
          type="button"
          aria-expanded={showFilter}
          aria-controls="date-filter-panel"
        >
          <span className="alrt-icon">📅</span>
          <span>Filter by Date</span>
        </button>

        {(startDate || endDate) && (
          <div className="alrt-active-filter-pill">
            <span className="alrt-filter-range">
              {startDate ? formatVisitedAt(startDate) : "Any start"} –{" "}
              {endDate ? formatVisitedAt(endDate) : "Any end"}
            </span>
            <button
              className="alrt-clear-filter-btn"
              onClick={clearFilters}
              aria-label="Clear date filters"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Filter Panel */}
      <div
        id="date-filter-panel"
        className={`alrt-date-filter-panel ${showFilter ? "visible" : ""}`}
      >
        <div className="alrt-date-input-group">
          <label htmlFor="start-date">From</label>
          <input
            id="start-date"
            type="date"
            value={startDate ? new Date(startDate).toISOString().slice(0, 10) : ""}
            onChange={(e) => handleDateChange("start", e.target.value)}
            max={
              endDate
                ? new Date(endDate).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10)
            }
          />
        </div>

        <div className="alrt-date-input-group">
          <label htmlFor="end-date">To</label>
          <input
            id="end-date"
            type="date"
            value={endDate ? new Date(endDate).toISOString().slice(0, 10) : ""}
            onChange={(e) => handleDateChange("end", e.target.value)}
            min={startDate ? new Date(startDate).toISOString().slice(0, 10) : ""}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="alrt-filter-actions">
          <button
            className="alrt-apply-filter-btn"
            onClick={() => setShowFilter(false)}
          >
            Apply
          </button>
          <button
            className="alrt-cancel-filter-btn"
            onClick={clearFilters}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="alrt-loading-state">
          <div className="alrt-spinner" />
          <p>Loading visit history...</p>
        </div>
      ) : error ? (
        <div className="alrt-error-state">
          <p>{error}</p>
        </div>
      ) : groupedData.length === 0 ? (
        <div className="alrt-empty-state">
          <div className="alrt-empty-icon">🏪</div>
          <h3>No recent visits</h3>
          <p>Places you visit will appear here.</p>
        </div>
      ) : (
        <div className="alrt-visits-list">
          {groupedData.map((item, index) => {
            if (item.type === "separator") {
              return (
                <div
                  key={`sep-${item.date}-${index}`}
                  className="alrt-date-separator"
                >
                  <h3 className="alrt-date-title">{item.date}</h3>
                  <div className="alrt-date-line" />
                </div>
              );
            }

            const { shop } = item;

            return (
              <div
                key={`visit-${shop.id}`}
                className="alrt-visit-card"
                onClick={() => navigate(`/shop/shop-page/${shop.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/shop/shop-page/${shop.id}`);
                  }
                }}
              >
                <div className="alrt-visit-image-wrapper">
                  <img
                    src={shop.image || "/placeholder-shop.jpg"}
                    alt={shop.name || "Shop image"}
                    className="alrt-visit-image"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-shop.jpg";
                    }}
                  />
                </div>

                <div className="alrt-visit-info">
                  <h4 className="alrt-shop-title">
                    {shop.name || "Unnamed Space"}
                  </h4>
                  <p className="alrt-shop-address">
                    {shop.address || "No address available"}
                  </p>
                  <p className="alrt-visit-meta">
                    Visited <strong>{formatVisitedAt(shop.visited_at)}</strong>
                  </p>
                </div>

                <span className="alrt-card-arrow">›</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </PageShell>
);
};

export default AllRecentlyVisitedShops;