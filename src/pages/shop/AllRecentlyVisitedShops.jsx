// AllRecentlyVisitedShops.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios"; // Assuming you have axios configured
import { format, parseISO, isToday, isYesterday } from "date-fns";
import PageShell from "../../components/PageShell"; // Adjust path as needed
import "../../css/shop/AllRecentlyVisitedShops.css"; // We'll create this

// Format date for display
const formatVisitedAt = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd MMM yyyy"); // e.g., "11 Sep 2025"
  } catch (e) {
    console.error("Error formatting visited_at date:", e);
    return "Unknown date";
  }
};

export default function AllRecentlyVisitedShops() {
  const [shops, setShops] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const sessionIdString = localStorage.getItem("sessionToken");
        setSessionId(sessionIdString);
      } catch (error) {
        console.error("Error fetching session:", error);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (sessionId) {
      const fetchRecentlyVisitedShops = async () => {
        try {
          setLoading(true);
          const response = await axios.get("/shops/all-recently-visited/", {
            headers: { Authorization: sessionId },
          });
          const shopsData = response.data.recently_visited_shops;
          setShops(shopsData);
        } catch (error) {
          console.error("Error fetching recently visited shops:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchRecentlyVisitedShops();
    }
  }, [sessionId]);

  const handleDateChange = useCallback((selectedDate) => {
    setDatePickerVisible(false);
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      setPickerType(null);
      return;
    }
    if (pickerType === "start") {
      setTempStartDate(selectedDate);
    } else if (pickerType === "end") {
      setTempEndDate(selectedDate);
    }
    setPickerType(null);
  }, [pickerType]);

  const showDatePicker = useCallback((type) => {
    setPickerType(type);
    setDatePickerVisible(true);
  }, []);

  const handleApplyFilters = useCallback(() => {
    if (tempStartDate && tempEndDate && tempStartDate > tempEndDate) {
      alert("Invalid Date: Start date cannot be after end date.");
      return;
    }
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setFilterModalVisible(false);
  }, [tempStartDate, tempEndDate]);

  const filteredShops = useMemo(() => {
    return shops
      .filter((shop) => {
        if (!shop?.id || !shop?.visited_at) return false;
        const visitDate = parseISO(shop.visited_at);
        let matchesDate = true;
        if (startDate) matchesDate = matchesDate && visitDate >= new Date(startDate.setHours(0, 0, 0, 0));
        if (endDate) matchesDate = matchesDate && visitDate <= new Date(endDate.setHours(23, 59, 59, 999));
        return matchesDate;
      })
      .sort((a, b) => new Date(b.visited_at) - new Date(a.visited_at));
  }, [shops, startDate, endDate]);

  const flatData = useMemo(() => {
    const data = [];
    let lastDate = null;
    filteredShops.forEach((shop, index) => {
      const dateKey = formatVisitedAt(shop.visited_at);
      if (dateKey !== lastDate) {
        data.push({ type: "separator", date: dateKey, index });
        lastDate = dateKey;
      }
      data.push({ type: "shop", data: shop, index });
    });
    return data;
  }, [filteredShops]);

  const handleShopPress = useCallback((shopId) => {
    navigate(`/shop/shop-page?shopId=${shopId}`);
  }, [navigate]);

  const renderItem = ({ item, index }) => {
    if (item.type === "separator") {
      return (
        <div className="date-header">
          <div className="date-header-content">
            <span className="date-header-text">{item.date}</span>
            <div className="date-header-underline" />
          </div>
        </div>
      );
    }
    const shop = item.data;
    const imageUrl = shop.image ? `https://your-api-domain.com${shop.image}` : null; // Replace with getFullUrl logic
    return (
      <div 
        className="shop-card" 
        onClick={() => handleShopPress(shop.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleShopPress(shop.id)}
      >
        <div className="image-container">
          {imageUrl ? (
            <img src={imageUrl} alt={shop.name} className="shop-image" onError={(e) => console.error(`Image load error for shop ${shop.id}`)} />
          ) : (
            <div className="placeholder-image">
              <svg className="store-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
            </div>
          )}
          <div className="image-gradient" />
          <div className="shop-name-overlay">
            <span>{shop.name}</span>
          </div>
        </div>
        <div className="shop-content">
          <div className="shop-info">
            <p className="shop-address" title={shop.address}>{shop.address}</p>
            <p className="visited-at">Visited: {formatVisitedAt(shop.visited_at)}</p>
            <p className="shop-description" title={shop.description}>{shop.description}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFilterModal = () => (
    <div className={`modal-overlay ${filterModalVisible ? 'visible' : ''}`} onClick={() => {
      setFilterModalVisible(false);
      setDatePickerVisible(false);
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Filter by Visit Date</h3>
        <button 
          type="button" 
          className="date-input" 
          onClick={() => showDatePicker("start")}
        >
          <span>{tempStartDate ? formatVisitedAt(tempStartDate.toISOString()) : "Start Date"}</span>
        </button>
        <button 
          type="button" 
          className="date-input" 
          onClick={() => showDatePicker("end")}
        >
          <span>{tempEndDate ? formatVisitedAt(tempEndDate.toISOString()) : "End Date"}</span>
        </button>
        <div className="modal-buttons">
          <button type="button" className="apply-button" onClick={handleApplyFilters}>
            <span>Apply</span>
          </button>
          <button 
            type="button" 
            className="clear-button" 
            onClick={() => {
              setTempStartDate(null);
              setTempEndDate(null);
              setStartDate(null);
              setEndDate(null);
              setFilterModalVisible(false);
              setDatePickerVisible(false);
            }}
          >
            Clear
          </button>
        </div>
      </div>
      {datePickerVisible && (
        <input 
          type="date" 
          className="date-picker"
          value={pickerType === "start" ? tempStartDate?.toISOString().split('T')[0] : tempEndDate?.toISOString().split('T')[0] || ''}
          onChange={(e) => handleDateChange(new Date(e.target.value))}
          max={new Date().toISOString().split('T')[0]}
        />
      )}
    </div>
  );

  return (
    <PageShell 
      title="Recently Visited Space" 
      isLoading={loading} 
      showBackButton={true}
      onBack={() => navigate("/shop")} // Adjust back navigation
    >
      <div className="recently-visited-shops">
        <div className="filter-container">
          <button 
            type="button" 
            className="filter-button" 
            onClick={() => {
              setTempStartDate(startDate);
              setTempEndDate(endDate);
              setFilterModalVisible(true);
            }}
          >
            <svg className="filter-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>
            <span>Filter</span>
          </button>
          {(startDate || endDate) && (
            <span className="filter-info-text">
              {startDate ? formatVisitedAt(startDate.toISOString()) : "Start"} - {endDate ? formatVisitedAt(endDate.toISOString()) : "End"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="spinner" />
            <p className="loader-text">Loading your recently visited shops...</p>
          </div>
        ) : flatData.length === 0 ? (
          <div className="empty-container">
            <svg className="empty-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            <h3 className="no-data-text">No recently visited shops yet.</h3>
            <p className="no-data-subtext">Explore shops to start building your visit history!</p>
          </div>
        ) : (
          <div className="shops-list">
            {flatData.map((item, index) => (
              <div key={item.type === "separator" ? `sep-${item.date}-${item.index}` : `shop-${item.data.id}`}>
                {renderItem({ item, index })}
              </div>
            ))}
          </div>
        )}

        {renderFilterModal()}
      </div>
    </PageShell>
  );
}
