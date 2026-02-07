// ShopLocation.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';
import SubscriptionRequired from '../RequiredSubscription';
import '../../css/component/shop/MapFeatures.css';

const ShopLocation = ({ shopLat, shopLng }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Load subscription from localStorage
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const cache = localStorage.getItem("subscription_cache");
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
        } else {
          setSubscriptionStatus(null);
        }
      } catch (error) {
        console.error("Failed to load subscription_cache:", error);
        setSubscriptionStatus(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    loadSubscription();
  }, []);

  const handleLocationAndOpenMaps = async () => {
    // Wait for subscription to load
    if (subscriptionLoading) return;

    // Check subscription status
    if (subscriptionStatus !== "standard" && subscriptionStatus !== "premium") {
      setModalVisible(true);
      return;
    }

    // Validate shop coordinates
    if (!shopLat || !shopLng || isNaN(shopLat) || isNaN(shopLng)) {
      alert("Error: Invalid shop location coordinates");
      return;
    }

    setIsGettingLocation(true);

    try {
      // Request geolocation permission and get user location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Construct Google Maps URL (works on all platforms)
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${shopLat},${shopLng}&travelmode=driving`;
      
      // Open in new tab/window
      window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('Geolocation error:', error);
      
      if (error.code === 1) {
        alert("Location access denied. Please enable location permissions to get directions.");
      } else {
        alert("Unable to get your location. Please try again or open maps manually.");
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleDirectMapLink = () => {
    if (!shopLat || !shopLng || isNaN(shopLat) || isNaN(shopLng)) {
      alert("Invalid shop location coordinates");
      return;
    }

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${shopLat},${shopLng}`;
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <motion.button
        className={`location-button ${subscriptionLoading || isGettingLocation ? 'disabled' : ''}`}
        onClick={handleLocationAndOpenMaps}
        disabled={subscriptionLoading || isGettingLocation}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="button-content">
          {isGettingLocation ? (
            <>
              <Loader2 className="loading-icon" size={24} />
              <span>Getting Location...</span>
            </>
          ) : subscriptionLoading ? (
            <>
              <Loader2 className="loading-icon" size={24} />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <MapPin size={24} />
              <span>View in Maps</span>
            </>
          )}
        </div>
      </motion.button>

      {/* Direct Map Link (always available) 
      <motion.button
        className="direct-map-button"
        onClick={handleDirectMapLink}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <MapPin size={20} />
        <span>View Location</span>
        <ExternalLink size={18} />
      </motion.button> */}

      <SubscriptionRequired
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

export default ShopLocation;
