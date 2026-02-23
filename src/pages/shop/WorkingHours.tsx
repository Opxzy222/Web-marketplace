// WorkingHours.jsx - Google Business Hours Editor
import React, { useState, useEffect, useCallback } from 'react';
import "../../css/shop/WorkingHours.css";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WorkingHours({ searchParams }) {
  const shopId = searchParams?.shopId;
  
  const [is24_7, setIs24_7] = useState(false);
  const [hours, setHours] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'open' | 'close'
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize data
  useEffect(() => {
    if (shopId) {
      fetchHours();
    }
  }, [shopId]);

  const fetchHours = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/shop/${shopId}/working-hours/`);
      const data = await response.json();
      
      // Normalize data structure
      const normalized = DAYS.reduce((acc, day) => {
        const dayKey = day.toLowerCase();
        acc[day] = data[dayKey] || { open: null, close: null };
        return acc;
      }, {});
      
      setHours(normalized);
      setIs24_7(data.is_24_7 || false);
    } catch (error) {
      console.error('Failed to fetch hours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveHours = async () => {
    if (!shopId) return;
    
    setIsSaving(true);
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

      setSuccessMessage('Hours updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save hours. Please try again.');
    } finally {
      setIsSaving(false);
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
    const [hours, minutes] = timeStr.split(':').slice(0, 2);
    const now = new Date();
    now.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return now;
  };

  const formatTime = (date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}:00`;
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return 'Closed';
    const [h, m] = timeStr.split(':').slice(0, 2);
    const hour = parseInt(h);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${period}`;
  };

  if (isLoading) {
    return <div className="loading">Loading hours...</div>;
  }

  if (!shopId) {
    return <div className="error">Shop ID required</div>;
  }

  return (
    <div className="working-hours">
      {/* Header */}
      <header className="hours-header">
        <button className="back-btn" onClick={() => window.history.back()}>
          ←
        </button>
        <h1>Business Hours</h1>
      </header>

      <main className="hours-main">
        {/* 24/7 Toggle */}
        <section className="toggle-section">
          <div className="toggle-content">
            <div>
              <h2>Open 24/7</h2>
              <p>Your business is always open</p>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                checked={is24_7}
                onChange={(e) => {
                  setIs24_7(e.target.checked);
                  if (e.target.checked) {
                    setHours(DAYS.reduce((acc, day) => {
                      acc[day] = { open: null, close: null };
                      return acc;
                    }, {}));
                  }
                }}
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </section>

        {!is24_7 && (
          <>
            {/* Copy Monday */}
            <button className="copy-monday-btn" onClick={copyMondayHours}>
              📋 Copy Monday's hours to all days
            </button>

            {/* Day Schedule Cards */}
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

        {/* Save Button */}
        <button 
          className="save-hours-btn"
          onClick={saveHours}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Hours'}
        </button>

        {/* Success Message */}
        {successMessage && (
          <div className="success-toast">
            ✅ {successMessage}
          </div>
        )}
      </main>

      {/* Time Picker Modal */}
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

// Reusable Schedule Card Component
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

// Time Picker Modal
const TimePickerModal = ({ time, onConfirm, onCancel, onChange }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="time-picker">
          <input 
            type="time" 
            value={time.toTimeString().slice(0,5)}
            onChange={(e) => onChange(new Date(`1970-01-01T${e.target.value}:00`))}
            step={300} // 5 minutes
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
};
