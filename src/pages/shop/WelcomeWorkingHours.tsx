// WorkingHours.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import PageShell from "../../components/PageShell";
import "../../css/shop/WorkingHours.css";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const API_BASE = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";

export default function WorkingHours() {
  const navigate = useNavigate();
  const location = useLocation();
  const shopId = location.state?.shopId;

  const [is24_7, setIs24_7] = useState(false);
  const [hours, setHours] = useState<Record<string, { open: string | null; close: string | null }>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"open" | "close" | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const getToken = () => localStorage.getItem("sessionToken") || "";

  useEffect(() => {
    if (shopId) {
      fetchHours();
    } else {
      setErrorMessage("No shop ID provided");
    }
  }, [shopId]);

  const fetchHours = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/shop/${shopId}/working-hours/`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          Accept: "application/json",
        },
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();

      const normalized = DAYS.reduce((acc, day) => {
        const dayKey = day.toLowerCase();
        acc[day] = data[dayKey] || { open: null, close: null };
        return acc;
      }, {} as Record<string, { open: string | null; close: string | null }>);

      setHours(normalized);
      setIs24_7(data.is24_7 || false);
    } catch (error) {
      console.error("Fetch failed:", error);
      setErrorMessage("Could not load hours. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveHours = async () => {
    if (!shopId) return;

    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const token = getToken();
      const payload = {
        is24_7,
        ...DAYS.reduce((acc, day) => {
          const dayKey = day.toLowerCase();
          const h = hours[day] || {};
          acc[dayKey] = {
            open: is24_7 ? null : h.open,
            close: is24_7 ? null : h.close,
            closed: !h.open && !h.close,
          };
          return acc;
        }, {} as Record<string, any>),
      };

      const response = await fetch(`${API_BASE}/shop/${shopId}/working-hours/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Save failed: ${response.status}`);

      setSuccessMessage("Hours updated successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
      navigate("/update-products", { state: { shopId } })
    } catch (error) {
      console.error("Save failed:", error);
      setErrorMessage("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectTime = useCallback((day: string, type: "open" | "close") => {
    setSelectedDay(day);
    setSelectedType(type);
    const current = hours[day]?.[type];
    setTempTime(current ? parseTime(current) : new Date());
    setShowTimePicker(true);
  }, [hours]);

  const confirmTime = () => {
    if (!selectedDay || !selectedType) return;

    const timeStr = formatTime(tempTime);

    if (selectedType === "close") {
      const openStr = hours[selectedDay]?.open;
      if (openStr && timeStr <= openStr) {
        alert("Closing time must be after opening time");
        return;
      }
    }

    setHours((prev) => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay] || {},
        [selectedType]: timeStr,
      },
    }));

    setShowTimePicker(false);
  };

  const toggleClosed = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: prev[day]?.open || prev[day]?.close
        ? { open: null, close: null }
        : { open: "09:00:00", close: "17:00:00" },
    }));
  };

  const copyMondayHours = () => {
    const monday = hours.Monday;
    if (!monday) return;

    setHours((prev) => ({
      ...prev,
      ...DAYS.slice(1).reduce((acc, day) => {
        acc[day] = { ...monday };
        return acc;
      }, {} as Record<string, any>),
    }));
  };

  const isDayClosed = (day: string) => !hours[day]?.open && !hours[day]?.close;

  const parseTime = (timeStr: string | null) => {
    if (!timeStr) return new Date();
    const [h, m] = timeStr.split(":").slice(0, 2).map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}:00`;
  };

  const formatDisplayTime = (timeStr: string | null) => {
    if (!timeStr) return "Closed";
    const [h, m] = timeStr.split(":").slice(0, 2).map(Number);
    const hour12 = h % 12 || 12;
    const period = h >= 12 ? "PM" : "AM";
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <PageShell
      title="Business Hours"
      isLoading={isLoading}
      error={errorMessage}
      onRetry={fetchHours}
      backPath={-1}
    >
      <div className="wrkhr-working-hours">
        <div className="wrkhr-content-container">
          <section className="wrkhr-toggle-section">
            <div className="wrkhr-toggle-content">
              <div>
                <h2>Open 24/7</h2>
                <p>Your business is always open</p>
              </div>
              <label className="wrkhr-toggle-switch">
                <input
                  type="checkbox"
                  checked={is24_7}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIs24_7(checked);
                    if (checked) {
                      setHours(
                        DAYS.reduce((acc, day) => {
                          acc[day] = { open: null, close: null };
                          return acc;
                        }, {} as Record<string, { open: string | null; close: string | null }>)
                      );
                    }
                  }}
                />
                <span className="wrkhr-toggle-slider"></span>
              </label>
            </div>
          </section>

          {!is24_7 && (
            <>
              <button className="wrkhr-copy-monday-btn" onClick={copyMondayHours}>
                📋 Copy Monday's hours to all days
              </button>

              <div className="wrkhr-schedule-grid">
                {DAYS.map((day) => (
                  <ScheduleRow
                    key={day}
                    day={day}
                    hours={hours[day]}
                    isClosed={isDayClosed(day)}
                    onToggleClosed={() => toggleClosed(day)}
                    onSelectTime={selectTime}
                    formatTime={formatDisplayTime}
                  />
                ))}
              </div>
            </>
          )}

          <button
            className="wrkhr-save-hours-btn"
            onClick={saveHours}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Hours"}
          </button>

          {successMessage && (
            <div className="wrkhr-success-toast">✅ {successMessage}</div>
          )}
        </div>

        {showTimePicker && (
          <TimePickerModal
            time={tempTime}
            onConfirm={confirmTime}
            onCancel={() => setShowTimePicker(false)}
            onChange={setTempTime}
          />
        )}
      </div>
    </PageShell>
  );
}

// ────────────────────────────────────────────────
// Compact Row Component (replaces tall cards)
// ────────────────────────────────────────────────

interface ScheduleRowProps {
  day: string;
  hours?: { open: string | null; close: string | null };
  isClosed: boolean;
  onToggleClosed: () => void;
  onSelectTime: (day: string, type: "open" | "close") => void;
  formatTime: (time: string | null) => string;
}

const ScheduleRow = ({
  day,
  hours,
  isClosed,
  onToggleClosed,
  onSelectTime,
  formatTime,
}: ScheduleRowProps) => {
  if (isClosed) {
    return (
      <div className={`wrkhr-schedule-row wrkhr-closed`}>
        <div className="wrkhr-day-name">{day}</div>
        <div className="wrkhr-hours-display closed">Closed</div>
        <label className="wrkhr-toggle-switch wrkhr-small">
          <input type="checkbox" checked={true} onChange={onToggleClosed} />
          <span className="wrkhr-toggle-slider"></span>
        </label>
      </div>
    );
  }

  const openDisplay  = formatTime(hours?.open)  || "Set open";
  const closeDisplay = formatTime(hours?.close) || "Set close";

  return (
    <div className="wrkhr-schedule-row">
      <div className="wrkhr-day-name">{day}</div>

      <div className="wrkhr-time-range-display">
        <span
          className="wrkhr-time-part open"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTime(day, "open");
          }}
        >
          {openDisplay}
        </span>
        <span className="wrkhr-time-separator"> – </span>
        <span
          className="wrkhr-time-part close"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTime(day, "close");
          }}
        >
          {closeDisplay}
        </span>
      </div>

      <label className="wrkhr-toggle-switch wrkhr-small">
        <input type="checkbox" checked={false} onChange={onToggleClosed} />
        <span className="wrkhr-toggle-slider"></span>
      </label>
    </div>
  );
};

// ────────────────────────────────────────────────
// TimePickerModal (unchanged)
// ────────────────────────────────────────────────

interface TimePickerModalProps {
  time: Date;
  onConfirm: () => void;
  onCancel: () => void;
  onChange: (date: Date) => void;
}

const TimePickerModal = ({ time, onConfirm, onCancel, onChange }: TimePickerModalProps) => {
  const handleOverlayClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  const handleContentClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  const timeValue = time.toTimeString().slice(0, 5);

  return (
    <div
      className="wrkhr-modal-overlay"
      onClick={handleOverlayClick}
      onTouchStart={handleOverlayClick}
    >
      <div
        className="wrkhr-modal-content"
        onClick={handleContentClick}
        onTouchStart={handleContentClick}
      >
        <h3>Select Time</h3>

        <div className="wrkhr-time-picker">
          <input
            type="time"
            value={timeValue}
            onChange={(e) => {
              if (e.target.value) {
                const [hh, mm] = e.target.value.split(":");
                const newDate = new Date(time);
                newDate.setHours(Number(hh), Number(mm), 0, 0);
                onChange(newDate);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            step="300"
            autoFocus
          />
        </div>

        <div className="wrkhr-modal-actions">
          <button
            className="wrkhr-btn-secondary"
            onClick={onCancel}
            onTouchStart={(e) => e.stopPropagation()}
          >
            Cancel
          </button>
          <button
            className="wrkhr-btn-primary"
            onClick={onConfirm}
            onTouchStart={(e) => e.stopPropagation()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};