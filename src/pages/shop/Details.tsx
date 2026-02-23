// Details.jsx
import React from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import PageShell from "../../components/PageShell";
import "../../css/shop/Details.css";

const Details = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const shopId = searchParams.get('shopId');
  const prevRoute = searchParams.get('prevRoute') || location.pathname;

  const handleEditProfile = () => {
    navigate(`/shop/ShopProfile?shopId=${shopId}&prevRoute=${encodeURIComponent(prevRoute)}`);
  };

  const handleWorkingHours = () => {
    navigate(`/shop/work-hours?shopId=${shopId}&prevRoute=${encodeURIComponent(prevRoute)}`);
  };

  const options = [
    {
      id: 'edit-profile',
      icon: '✏️',
      title: 'Edit Profile',
      onPress: handleEditProfile
    },
    {
      id: 'working-hours',
      icon: '🕒',
      title: 'Working Hours',
      onPress: handleWorkingHours
    }
    // Notification settings commented out to match original
  ];

  return (
    <PageShell 
      title="Space Settings" 
      showBackButton={true}
      onBack={() => navigate('/(tabs)/myshop')}
    >
      <div className="details-container">
        <div className="options-container">
          {options.map(({ id, icon, title, onPress }) => (
            <button
              key={id}
              className="option-card"
              onClick={onPress}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onPress()}
            >
              <div className="icon-wrapper">
                <span className="option-icon">{icon}</span>
              </div>
              <span className="option-text">{title}</span>
              <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default Details;
