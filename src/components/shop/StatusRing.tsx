// StatusRing.jsx
import React from "react";
import "../../css/component/shop/StatusRing.css";

const StatusRing = ({ totalStatuses, viewedStatuses, imageUri, onError }) => {
  const radius = 30;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const segmentGap = 10;
  const segmentLength = (circumference - segmentGap * totalStatuses) / totalStatuses;

  const segments = Array.from({ length: totalStatuses }, (_, i) => ({
    isViewed: i < viewedStatuses,
    offset: -i * (segmentLength + segmentGap)
  }));

  return (
    <div className="status-ring-container" style={{ width: 70, height: 70 }}>
      <svg width="70" height="70" viewBox="0 0 70 70" className="status-ring-svg">
        {segments.map((segment, i) => (
          <circle
            key={i}
            cx="35"
            cy="35"
            r={radius}
            stroke={segment.isViewed ? "#A9A9A9" : "#25D366"}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={segment.offset}
            fill="none"
            strokeLinecap="round"
            className="status-ring-segment"
          />
        ))}
      </svg>
      
      {/* Profile Picture */}
      <div className="profile-image-container">
        <img
          src={imageUri || "https://via.placeholder.com/50/EEF2F7/6B7280?text=?"}
          alt="Profile"
          className="profile-image"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/50/EEF2F7/6B7280?text=?";
            onError?.();
          }}
        />
      </div>
    </div>
  );
};

export default StatusRing;
