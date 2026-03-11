// WelcomeWorkingHours.jsx - Onboarding Business Hours
import React, { useState, useEffect, useCallback } from 'react';
import "../../css/shop/WorkingHours.css"; // Same styling system

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WelcomeWorkingHours({ searchParams }) {
  const shopId = searchParams?.shopId;
  
  const [is24_7, setIs24_7] = useState(false);
  const [hours, setHours] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch existing hours (onboarding flow)
  useEffect(() => {
    if (shopId) {
      fetchHours();
    }
  }, [shopId]);

  const fetchHours = async () => {
    try {
      const response = await fetch(`/api/shop/${shopId}/working-hours/`);
      const data = await response.json();
      
      const normalized = DAYS.reduce((acc, day) => {
        const dayKey = day.toLowerCase();
        acc[day] = data[dayKey] || { open: null, close: null };
        return acc;
      }, {});
      
      setHours(normalized);
      setIs24_7(data.is_24_7 || false);
    } catch (error) {
      console.error('Fetch failed:', error);
      // Default to 9-5 weekdays
      initDefaultHours();
    }
  };

  const initDefaultHours = () => {
    setHours({
      Monday: { open: '09:00:00', close: '17:00:00' },
      Tuesday: { open: '09:00:00', close: '17:00:00' },
      Wednesday: { open: '09:00:00', close: '17:00:00' },
      Thursday: { open: '09:00:00', close: '17:00:00' },
      Friday: { open: '09:00:00', close: '17:00:00' },
      Saturday: { open: '10:00:00', close: '16:00:00' },
      Sunday: { open: null, close: null }
    });
  };

  const saveHours = async () => {
    if (!shopId) return;
    
    try {
      const payload = {
        is_24_7,
        ...DAYS.reduce((acc, day) => {
          const dayKey = day.toLowerCase();
          const dayHours = hours[day];
          acc[dayKey] = {
            open: is24_7 ? null : dayHours.open,
            close: is24_7 ? null : dayHours.close,
            closed: !dayHours.open && !dayHours.close
          };
          return acc;
        }, {})
      };

      await fetch(`/api/shop/${shopId}/working-hours/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setShowSuccess(true);
      
      // Auto-redirect after success (onboarding flow)
      setTimeout(() => {
        window.location.href = `/shop/UpdateProduct?shop_id=${shopId}`;
      }, 2000);
      
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save hours');
    }
  };

  const selectTime = (day, type) => {
    setSelectedDay(day);
    setSelectedType(type);
    const currentTime = hours[day]?.[type];
    setTempTime(currentTime ? parseTime(currentTime) : new Date());
    setShowTimePicker(true);
  };

  const confirmTime = () => {
    if (!selectedDay || !selectedType) return;
    
    const timeStr = formatTime(tempTime);
    setHours(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [selectedType]: timeStr
      }
    }));
    setShowTimePicker(false);
  };

  const toggleClosed = (day) => {
    setHours(prev => ({
      ...prev,
      [day]: prev[day]?.open || prev[day]?.close 
        ? { open: null, close: null }
        : { open: '09:00:00', close: '17:00:00' }
    }));
  };

  const copyMondayHours = () => {
    const mondayHours = hours.Monday;
    if (!mondayHours) return;
    
    setHours(prev => ({
      ...prev,
      ...DAYS.slice(1).reduce((acc, day) => {
        acc[day] = { ...mondayHours };
        return acc;
      }, {})
    }));
  };

  const isDayClosed = (day) => !hours[day]?.open && !hours[day]?.close;

  const parseTime = (timeStr) => {
    if (!timeStr) return new Date();
    const [h, m] = timeStr.split(':').slice(0, 2);
    const now = new Date();
    now.setHours(parseInt(h), parseInt(m), 0, 0);
    return now;
  };

  const formatTime = (date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}:00`;
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return 'Select Time';
    const [h, m] = timeStr.split(':').slice(0, 2);
    const hour = parseInt(h);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${period}`;
  };

  if (!shopId) {
    return <div className="error">Shop ID required</div>;
  }

  return (
    <div className="working-hours onboarding-flow">
      {/* Header */}
      <header className="hours-header">
        <button className="back-btn" onClick={() => window.history.back()}>
          ←
        </button>
        <h1>Set Business Hours</h1>
      </header>

      <main className="hours-main">
        {/* Welcome Card */}
        <div className="welcome-card">
          <div className="welcome-icon">🕒</div>
          <h2>Tell us when you're open</h2>
          <p>Customers will see your availability across the app</p>
        </div>

        {/* 24/7 Toggle */}
        <section className="toggle-section">
          <div className="toggle-content">
            <div>
              <h3>I'm open 24/7</h3>
              <p>No specific hours needed</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={is24_7}
                onChange={(e) => {
                  setIs24_7(e.target.checked);
                  if (e.target.checked) {
                    setHours({});
                  }
                }}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        {!is24_7 && (
          <>
            {/* Quick Setup */}
            <button className="copy-monday-btn" onClick={copyMondayHours}>
              ✨ Use Monday's hours for all days
            </button>

            {/* Schedule Cards */}
            <div className="schedule-grid">
              {DAYS.map(day => (
                <ScheduleCard
                  key={day}
                  day={day}
                  hours={hours[day]}
                  isClosed={isDayClosed(day)}
                  onToggleClosed={() => toggleClosed(day)}
                  onSelectTime={(type) => selectTime(day, type)}
                  formatTime={formatDisplayTime}
                />
              ))}
            </div>
          </>
        )}

        {/* Continue Button */}
        <button 
          className="save-hours-btn primary"
          onClick={saveHours}
        >
          Continue Setup
        </button>

        {/* Success Overlay */}
        {showSuccess && (
          <div className="success-overlay">
            <div className="checkmark-container">
              <div className="checkmark">✅</div>
              <h3>Hours Saved!</h3>
              <p>Redirecting to products...</p>
            </div>
          </div>
        )}
      </main>

      {/* Time Picker */}
      {showTimePicker && (
        <TimePickerModal
          time={tempTime}
          onConfirm={confirmTime}
          onCancel={() => setShowTimePicker(false)}
          onChange={setTempTime}
        />
      )}
    </div>
  );
}

// Reusable components (same as WorkingHours)
const ScheduleCard = ({ day, hours, isClosed, onToggleClosed, onSelectTime, formatTime }) => (
  <article className={`schedule-card ${isClosed ? 'closed' : ''}`}>
    <div className="card-header">
      <h3>{day}</h3>
      <label className="toggle-switch small">
        <input 
          type="checkbox" 
          checked={isClosed}
          onChange={onToggleClosed}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
    
    <div className="time-row">
      <TimeButton
        time={hours?.open}
        label="Open"
        disabled={isClosed}
        formatTime={formatTime}
        onPress={() => onSelectTime('open')}
      />
      <span className="time-separator">to</span>
      <TimeButton
        time={hours?.close}
        label="Close"
        disabled={isClosed}
        formatTime={formatTime}
        onPress={() => onSelectTime('close')}
      />
    </div>
  </article>
);

const TimeButton = ({ time, label, disabled, formatTime, onPress }) => (
  <button 
    className={`time-btn ${disabled ? 'disabled' : ''}`}
    onClick={onPress}
    disabled={disabled}
  >
    {disabled ? 'Closed' : formatTime(time) || label}
  </button>
);

const TimePickerModal = ({ time, onConfirm, onCancel, onChange }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="time-picker">
        <input 
          type="time" 
          value={time.toTimeString().slice(0,5)}
          onChange={(e) => onChange(new Date(`1970-01-01T${e.target.value}:00`))}
          step={300}
        />
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-primary" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </div>
  </div>
);
