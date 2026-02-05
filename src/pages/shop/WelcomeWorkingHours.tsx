import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';
import CheckmarkModal from "@/components/shop/ModalComponent";
import '../../css/shop/WelcomeWorkingHours.css';

interface OpeningHours {
  [key: string]: { open: string | null; close: string | null };
}

export default function WelcomeWorkingHours() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shopId = searchParams.get('shopId');

  const [is24_7, setIs24_7] = useState(false);
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"open" | "close" | null>(null);
  const [tempTime, setTempTime] = useState('09:00');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sameAsMonday, setSameAsMonday] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shopId) fetchWorkingHours();
  }, [shopId]);

  const fetchWorkingHours = async () => {
    try {
      const res = await axios.get(`/shop/${shopId}/working-hours/`);
      const data = res.data;

      const hours: OpeningHours = {
        Monday: data.monday || { open: null, close: null },
        Tuesday: data.tuesday || { open: null, close: null },
        Wednesday: data.wednesday || { open: null, close: null },
        Thursday: data.thursday || { open: null, close: null },
        Friday: data.friday || { open: null, close: null },
        Saturday: data.saturday || { open: null, close: null },
        Sunday: data.sunday || { open: null, close: null },
      };

      setIs24_7(data.is_24_7 || false);
      setOpeningHours(hours);
    } catch (err) {
      console.error("Fetch working hours error:", err);
    }
  };

  const updateWorkingHours = async () => {
    if (!shopId) return;

    try {
      const formatted = {
        is_24_7,
        monday:    is24_7 ? { open: null, close: null } : openingHours.Monday,
        tuesday:   is24_7 ? { open: null, close: null } : openingHours.Tuesday,
        wednesday: is24_7 ? { open: null, close: null } : openingHours.Wednesday,
        thursday:  is24_7 ? { open: null, close: null } : openingHours.Thursday,
        friday:    is24_7 ? { open: null, close: null } : openingHours.Friday,
        saturday:  is24_7 ? { open: null, close: null } : openingHours.Saturday,
        sunday:    is24_7 ? { open: null, close: null } : openingHours.Sunday,
      };

      await axios.post(`/shop/${shopId}/working-hours/`, formatted);
      setShowSuccessModal(true);

      setTimeout(() => {
        setShowSuccessModal(false);
        navigate(`/shop/UpdateProduct?shop_id=${shopId}`);
      }, 2000);
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to save hours.");
    }
  };

  const handleTimeChange = (time: string | null, type: 'open' | 'close') => {
    if (!selectedDay || !time) return;

    const [h, m] = time.split(':');
    const formatted = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;

    setOpeningHours(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [type]: formatted,
      },
    }));

    setShowTimePicker(false);
  };

  const parseTime = (time: string | null) => time ? time.slice(0, 5) : '';

  const applySameAsMonday = () => {
    if (!openingHours.Monday) return;
    setOpeningHours(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(day => {
        if (day !== "Monday") updated[day] = { ...prev.Monday };
      });
      return updated;
    });
    setSameAsMonday(true);
  };

  const toggleClosed = (day: string) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: prev[day]?.open || prev[day]?.close
        ? { open: null, close: null }
        : { open: "09:00:00", close: "17:00:00" },
    }));
  };

  if (!shopId) {
    return <div className="error-screen">Error: Shop ID missing.</div>;
  }

  return (
    <div className="create-shop-screen">
      {/* Header – matching ShopHomePage style */}
      <header className="header-container">
        <div className="header-inner">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
          <h1 className="header-title">Working Hours</h1>
        </div>
      </header>

      <main className="main-container">
        {/* 24/7 Toggle */}
        <div className="toggle-card">
          <label className="toggle-label">24/7 Open</label>
          <label className="switch">
            <input
              type="checkbox"
              checked={is24_7}
              onChange={e => {
                const val = e.target.checked;
                setIs24_7(val);
                if (val) {
                  setOpeningHours({
                    Monday: { open: null, close: null },
                    Tuesday: { open: null, close: null },
                    Wednesday: { open: null, close: null },
                    Thursday: { open: null, close: null },
                    Friday: { open: null, close: null },
                    Saturday: { open: null, close: null },
                    Sunday: { open: null, close: null },
                  });
                }
              }}
            />
            <span className="slider"></span>
          </label>
        </div>

        {is24_7 ? (
          <div className="info-card">
            <p>Business is open 24/7 — no specific hours needed.</p>
          </div>
        ) : (
          <>
            <button className="same-as-btn" onClick={applySameAsMonday}>
              Apply Monday to All Days
            </button>

            {Object.entries(openingHours).map(([day, hours]) => {
              const isClosed = !hours?.open && !hours?.close;

              return (
                <div key={day} className={`day-card ${isClosed ? 'closed' : ''}`}>
                  <div className="day-header">
                    <span className="day-title">
                      {day} {isClosed ? '(Closed)' : ''}
                    </span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={isClosed}
                        onChange={() => toggleClosed(day)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="time-row">
                    <button
                      className={`time-btn ${isClosed ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!isClosed) {
                          setSelectedDay(day);
                          setSelectedType("open");
                          setTempTime(parseTime(hours?.open) || '09:00');
                          setShowTimePicker(true);
                        }
                      }}
                      disabled={isClosed}
                    >
                      {parseTime(hours?.open) || 'Open Time'}
                    </button>

                    <button
                      className={`time-btn ${isClosed ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!isClosed) {
                          setSelectedDay(day);
                          setSelectedType("close");
                          setTempTime(parseTime(hours?.close) || '17:00');
                          setShowTimePicker(true);
                        }
                      }}
                      disabled={isClosed}
                    >
                      {parseTime(hours?.close) || 'Close Time'}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Time Picker Modal */}
        {showTimePicker && selectedDay && selectedType && (
          <div className="modal-backdrop" onClick={() => setShowTimePicker(false)}>
            <div className="time-modal" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">
                Set {selectedType === 'open' ? 'Opening' : 'Closing'} Time – {selectedDay}
              </h3>

              <TimePicker
                onChange={time => handleTimeChange(time as string, selectedType)}
                value={tempTime}
                format="HH:mm"
                disableClock={false}
                hourPlaceholder="HH"
                minutePlaceholder="MM"
                className="time-picker"
              />

              <div className="modal-actions">
                <button className="modal-btn cancel" onClick={() => setShowTimePicker(false)}>
                  Cancel
                </button>
                <button className="modal-btn confirm" onClick={() => handleTimeChange(tempTime, selectedType)}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save */}
        <button
          className={`save-btn ${isSubmitting ? 'loading' : ''}`}
          onClick={updateWorkingHours}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Working Hours'}
        </button>

        <CheckmarkModal visible={showSuccessModal} message="Working hours updated!" />
      </main>
    </div>
  );
}