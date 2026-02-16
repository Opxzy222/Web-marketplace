import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaArrowRotateRight, FaFilter, FaReceipt, FaCalendarDays, FaCheck, FaXmark, FaCalendar, FaSpinner } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import ViewReceipt from "../../components/shop/ViewReceipt";
import "../../css/shop/CustomerReceipts.css";

const API_BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";
const FALLBACK_IMAGE = "https://f003.backblazeb2.com/file/gogo-digital-media/profile_picture/default/user_default.png";

const statusStyles = {
  pending: { color: "#F59E0B", label: "Pending", icon: "⏰" },
  accepted: { color: "#22C55E", label: "Accepted", icon: "✅" },
  rejected: { color: "#EF4444", label: "Rejected", icon: "❌" },
  voided: { color: "#6B7280", label: "Voided", icon: "➖" },
};

const TABS = ["All", "Accepted", "Pending", "Rejected", "Voided"];

const ReceiptCard = React.memo(({ item, handleAction }) => {
  const receipt = item.data;
  const status = statusStyles[receipt.status?.toLowerCase()] || {};
  
  return (
    <motion.div 
      className="receipt-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="card-touchable">
        <div className="card-background">
          <div className="card-header">
            <div 
              className="shop-image"
              style={{ backgroundImage: `url(${receipt.shop_image || FALLBACK_IMAGE})` }}
            />
            <div className="card-details">
              <h3 className="receipt-id">{receipt.shop || "Unknown Shop"}</h3>
              <div className="receipt-info">
                <span className="receipt-amount">₦{receipt.total_amount || "0.00"}</span>
                <span className="receipt-date">• {formatDate(receipt.created_at)}</span>
              </div>
              <div className="status-container">
                <div className="status-chip" style={{ backgroundColor: status.color }}>
                  <span className="status-icon">{status.icon}</span>
                  <span className="status-text">{status.label || "Unknown"}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="card-divider" />
          <div className="button-container">
            <ViewReceipt receipt={receipt} />
            {receipt.status?.toLowerCase() === "pending" && (
              <>
                <motion.button
                  className="action-button accept"
                  onClick={() => handleAction(receipt.id, "accept")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="button-gradient">
                    <FaCheck size={16} />
                    <span>Accept</span>
                  </div>
                </motion.button>
                <motion.button
                  className="action-button reject"
                  onClick={() => handleAction(receipt.id, "reject")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="button-gradient">
                    <FaXmark size={16} />
                    <span>Reject</span>
                  </div>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Invalid";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const CustomerReceipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState("All");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());
  const [spendingMonth, setSpendingMonth] = useState(new Date().getMonth());
  const [spendingYear, setSpendingYear] = useState(new Date().getFullYear());
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  // Fetch session ID
  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = localStorage.getItem("sessionToken");
        if (!sessionIdString) {
          alert("Please log in to view receipts.");
          navigate("/login");
          setLoading(false);
          return;
        }
        setSessionId(sessionIdString);
      } catch (error) {
        console.error("Error fetching session ID:", error);
        setLoading(false);
      }
    };
    fetchSessionId();
  }, [navigate]);

  // Fetch receipts
  const fetchReceipts = useCallback(async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/receipts/customer/`, {
        headers: { Authorization: sessionId },
      });
      const fetchedReceipts = Array.isArray(response.data.receipts)
        ? response.data.receipts.filter(
            (item) => item && typeof item === "object" && item.id && item.created_at
          )
        : [];
      setReceipts(fetchedReceipts);
    } catch (error) {
      console.error("Error fetching receipts:", error.response?.data || error.message);
      alert("Failed to fetch receipts. Please try again.");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Reset filters on tab change
  useEffect(() => {
    setStartDate(null);
    setEndDate(null);
    setTempStartDate(null);
    setTempEndDate(null);
    setFilterModalVisible(false);
    setPickerVisible(false);
    setPickerType(null);
  }, [activeTab]);

  // Handle accept/reject actions
  const handleAction = useCallback(async (receiptId, action) => {
    const actionTitle = action === "accept" ? "Accept" : "Reject";
    if (!confirm(`Are you sure you want to ${action} this receipt?`)) return;

    try {
      await axios.post(
        `${API_BASE_URL}/receipts/${receiptId}/${action}/`,
        {},
        { headers: { Authorization: sessionId } }
      );
      alert(`Receipt ${action}ed successfully.`);
      setReceipts((prev) =>
        prev.map((receipt) =>
          receipt.id === receiptId ? { ...receipt, status: action + "ed" } : receipt
        )
      );
    } catch (error) {
      console.error(`Error ${action}ing receipt:`, error.response?.data || error.message);
      alert(`Failed to ${action} receipt. Please try again.`);
    }
  }, [sessionId]);

  // Date picker handlers
  const showDatePicker = useCallback((type) => {
    setPickerType(type);
    setTempDate(
      type === "start" && tempStartDate
        ? tempStartDate
        : type === "end" && tempEndDate
        ? tempEndDate
        : new Date()
    );
    setPickerVisible(true);
  }, [tempStartDate, tempEndDate]);

  const handleDateChange = useCallback((selectedDate) => {
    if (!selectedDate || isNaN(selectedDate.getTime())) {
      setPickerVisible(false);
      setPickerType(null);
      return;
    }
    if (pickerType === "start") {
      setTempStartDate(selectedDate);
    } else if (pickerType === "end") {
      setTempEndDate(selectedDate);
    }
    setPickerVisible(false);
    setPickerType(null);
  }, [pickerType]);

  const handleApplyFilters = useCallback(() => {
    if (tempStartDate && tempEndDate && tempStartDate > tempEndDate) {
      alert("Start date cannot be after end date.");
      return;
    }
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setFilterModalVisible(false);
  }, [tempStartDate, tempEndDate]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts
      .filter((receipt) => {
        if (!receipt?.id || !receipt?.created_at) return false;
        const receiptDate = new Date(receipt.created_at);
        const receiptStatus = receipt.status?.toLowerCase() || "";
        const tabStatus = activeTab.toLowerCase();

        const matchesStatus = tabStatus === "all" || receiptStatus === tabStatus;
        let matchesDate = true;
        
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matchesDate = matchesDate && receiptDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && receiptDate <= end;
        }

        return matchesStatus && matchesDate;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [receipts, activeTab, startDate, endDate]);

  // Monthly spending
  const calculateMonthlySpending = useMemo(() => {
    const startOfMonth = new Date(spendingYear, spendingMonth, 1);
    const endOfMonth = new Date(spendingYear, spendingMonth + 1, 0, 23, 59, 59, 999);

    const acceptedReceipts = receipts.filter((receipt) => {
      if (!receipt?.id || !receipt?.created_at) return false;
      const receiptDate = new Date(receipt.created_at);
      return (
        receipt.status?.toLowerCase() === "accepted" &&
        receiptDate >= startOfMonth &&
        receiptDate <= endOfMonth
      );
    });

    const total = acceptedReceipts.reduce((sum, receipt) => {
      const amount = parseFloat(receipt.total_amount) || 0;
      return sum + amount;
    }, 0);
    return total.toFixed(2);
  }, [receipts, spendingMonth, spendingYear]);

  const monthName = new Date(spendingYear, spendingMonth).toLocaleString("en-US", { month: "short" });

  // FlatList data
  const flatData = useMemo(() => {
    const data = [];
    let lastDate = null;
    filteredReceipts.forEach((receipt) => {
      const dateKey = formatDate(receipt.created_at);
      if (dateKey !== lastDate) {
        data.push({ type: "separator", date: dateKey });
        lastDate = dateKey;
      }
      data.push({ type: "receipt", data: receipt });
    });
    return data;
  }, [filteredReceipts]);

  if (loading) {
    return (
      <div className="receipts-container loading">
        <div className="header">
          <motion.button className="back-button" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </motion.button>
          <h1 className="header-title">Customer Receipts</h1>
          <motion.button className="refresh-button" onClick={fetchReceipts}>
            <FaArrowRotateRight />
          </motion.button>
        </div>
        <div className="centered">
          <FaSpinner className="loading-spinner" />
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="receipts-container">
      <div className="header">
        <motion.button className="back-button" onClick={() => navigate(-1)} whileHover={{ scale: 1.05 }}>
          <FaArrowLeft />
        </motion.button>
        <h1 className="header-title">Customer Receipts</h1>
        <motion.button className="refresh-button" onClick={fetchReceipts} whileHover={{ scale: 1.05 }}>
          <FaArrowRotateRight />
        </motion.button>
      </div>

      <div className="content">
        {/* Spending Summary */}
        <motion.div 
          className="spending-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="spending-header">
            <h3 className="spending-title">
              {monthName} {spendingYear} Spending
            </h3>
            <motion.button 
              className="month-button"
              onClick={() => setMonthPickerVisible(true)}
              whileHover={{ scale: 1.05 }}
            >
              <FaCalendarDays />
            </motion.button>
          </div>
          <div className="spending-amount">₦{calculateMonthlySpending}</div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="nav-bar">
          <div className="nav-bar-inner">
            {TABS.map((tab) => (
              <motion.button
                key={tab}
                className={`nav-button ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>{tab}</span>
                {activeTab === tab && <div className="underline-gradient" />}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Filter */}
        <div className="filter-container">
          <motion.button
            className="filter-button"
            onClick={() => {
              setTempStartDate(startDate);
              setTempEndDate(endDate);
              setFilterModalVisible(true);
            }}
            whileHover={{ scale: 1.05 }}
          >
            <FaFilter />
          </motion.button>
          {(startDate || endDate) && (
            <span className="filter-info-text">
              {startDate ? formatDate(startDate.toISOString()) : "Start"} - {endDate ? formatDate(endDate.toISOString()) : "End"}
            </span>
          )}
        </div>

        {/* Receipts List */}
        {flatData.length === 0 ? (
          <div className="empty-container">
            <FaReceipt size={48} />
            <p className="empty-text">No Receipts Found</p>
          </div>
        ) : (
          <div className="receipts-list">
            {flatData.map((item, index) =>
              item.type === "separator" ? (
                <div key={`sep-${item.date}-${index}`} className="date-header">
                  <span>{item.date}</span>
                  <div className="date-header-underline" />
                </div>
              ) : (
                <ReceiptCard key={`rec-${item.data.id}`} item={item} handleAction={handleAction} />
              )
            )}
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isVisible={filterModalVisible}
        onClose={() => {
          setFilterModalVisible(false);
          setTempStartDate(startDate);
          setTempEndDate(endDate);
        }}
        tempStartDate={tempStartDate}
        tempEndDate={tempEndDate}
        onDatePickerToggle={showDatePicker}
        onApplyFilters={handleApplyFilters}
        pickerVisible={pickerVisible}
        pickerType={pickerType}
        tempDate={tempDate}
        onDateChange={handleDateChange}
        onClearFilters={() => {
          setTempStartDate(null);
          setTempEndDate(null);
          setStartDate(null);
          setEndDate(null);
          setFilterModalVisible(false);
          setPickerVisible(false);
        }}
      />

      {/* Month Picker Modal */}
      <MonthPickerModal
        isVisible={monthPickerVisible}
        spendingMonth={spendingMonth}
        spendingYear={spendingYear}
        onMonthChange={setSpendingMonth}
        onYearChange={setSpendingYear}
        onClose={() => setMonthPickerVisible(false)}
        onReset={() => {
          setSpendingMonth(new Date().getMonth());
          setSpendingYear(new Date().getFullYear());
          setMonthPickerVisible(false);
        }}
      />
    </div>
  );
};

const FilterModal = ({ 
  isVisible, 
  onClose, 
  tempStartDate, 
  tempEndDate, 
  onDatePickerToggle, 
  onApplyFilters, 
  pickerVisible, 
  pickerType, 
  tempDate, 
  onDateChange,
  onClearFilters 
}) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="modal-content"
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="modal-title">Filter by Date</h3>
          <motion.button
            className="date-input"
            onClick={() => onDatePickerToggle("start")}
            whileHover={{ scale: 1.02 }}
          >
            {tempStartDate ? formatDate(tempStartDate.toISOString()) : "Start Date"}
          </motion.button>
          <motion.button
            className="date-input"
            onClick={() => onDatePickerToggle("end")}
            whileHover={{ scale: 1.02 }}
          >
            {tempEndDate ? formatDate(tempEndDate.toISOString()) : "End Date"}
          </motion.button>
          <div className="modal-buttons">
            <motion.button className="apply-button" onClick={onApplyFilters} whileHover={{ scale: 1.05 }}>
              <div className="button-gradient">Apply</div>
            </motion.button>
            <motion.button className="clear-button" onClick={onClearFilters} whileHover={{ scale: 1.05 }}>
              Clear
            </motion.button>
          </div>
        </motion.div>
        {pickerVisible && (
          <input
            type="date"
            value={tempDate.toISOString().split('T')[0]}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => onDateChange(new Date(e.target.value))}
            className="date-picker"
            autoFocus
          />
        )}
      </motion.div>
    )}
  </AnimatePresence>
);

const MonthPickerModal = ({ isVisible, spendingMonth, spendingYear, onMonthChange, onYearChange, onClose, onReset }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="modal-content"
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 50 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="modal-title">Select Month and Year</h3>
          <select 
            value={spendingMonth} 
            onChange={(e) => onMonthChange(parseInt(e.target.value))}
            className="picker"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {new Date(2025, i).toLocaleString("en-US", { month: "long" })}
              </option>
            ))}
          </select>
          <select 
            value={spendingYear} 
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className="picker"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
          <div className="modal-buttons">
            <motion.button className="apply-button" onClick={onClose} whileHover={{ scale: 1.05 }}>
              <div className="button-gradient">Apply</div>
            </motion.button>
            <motion.button className="clear-button" onClick={onReset} whileHover={{ scale: 1.05 }}>
              Reset
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default CustomerReceipts;
