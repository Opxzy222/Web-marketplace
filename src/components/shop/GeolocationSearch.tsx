// src/components/shop/GeolocationSearch.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaLocationArrow, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

interface GeolocationSearchProps {
  onSearch: (shops: any[]) => void;
}

export default function GeolocationSearch({ onSearch }: GeolocationSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoSupported, setGeoSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const navigate = useNavigate();

  // Check geolocation support & permission status on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoSupported(false);
      setError('Geolocation is not supported by your browser.');
      return;
    }

    // Check current permission status (works in modern browsers)
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setPermissionStatus(result.state);
          result.onchange = () => setPermissionStatus(result.state);
        })
        .catch(() => {
          // Fallback if permissions API not supported
        });
    }
  }, []);

  const getUserLocation = useCallback(async (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,          // Longer timeout helps on iOS
          maximumAge: 0,           // Always get fresh location
        }
      );
    });
  }, []);

  const handleUseMyLocation = useCallback(async () => {
    setError(null);

    try {
      const position = await getUserLocation();
      const { latitude, longitude } = position.coords;

      // Optional: show success briefly
      setError(null);

      // You can store coords or use them directly in search
      return { latitude, longitude };
    } catch (err: any) {
      let message = 'Could not get your location.';

      if (err.code === 1) {
        // Permission denied
        message =
          permissionStatus === 'denied'
            ? 'Location permission was previously denied. Please enable it in your browser or device settings.'
            : 'Please allow location access when prompted.';
      } else if (err.code === 2) {
        message = 'Location information is unavailable. Check your device settings.';
      } else if (err.code === 3) {
        message = 'Location request timed out. Please try again.';
      } else {
        message = err.message || 'Unknown error occurred.';
      }

      setError(message);
      console.error('Geolocation error:', err);
      return null;
    }
  }, [getUserLocation, permissionStatus]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setError('Please enter what you are looking for');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to get location first
      const coords = await handleUseMyLocation();

      if (!coords) {
        // User denied or error → stop here
        setLoading(false);
        return;
      }

      const { latitude, longitude } = coords;

      // Perform search with real lat/long
      const response = await axios.get(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-product-search/',
        {
          params: {
            input: query.trim(),
            lat: latitude,
            lon: longitude,
          },
          timeout: 15000,
        }
      );

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      const shops = response.data.shops || [];
      if (shops.length === 0) {
        setError('No shops found nearby. Try a different search term or location.');
        return;
      }

      const limitedShops = shops.slice(0, 50);
      onSearch(limitedShops);

      navigate('/search-result', {
        state: { searchTerm: query.trim(), shops: limitedShops },
      });
    } catch (err: any) {
      setError('Search failed. Please check your connection and try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, onSearch, navigate, handleUseMyLocation]);

  return (
    <motion.div
      className="sb-geo-search"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {error && (
        <div className="sb-error-message" role="alert">
          <FaExclamationTriangle style={{ marginRight: '8px' }} />
          {error}
        </div>
      )}

      {!geoSupported && (
        <div className="sb-info-message">
          Location services not available on this device/browser.
        </div>
      )}

      <div className="sb-input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for nearby? (supermarket, fashion...)"
          className="sb-search-input"
          disabled={loading}
          aria-label="Search term for nearby shops"
        />

        <motion.button
          className="sb-search-btn"
          onClick={handleSearch}
          disabled={loading}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Search nearby shops using your location"
        >
          {loading ? (
            <>
              <FaSpinner className="sb-spinner" style={{ marginRight: '8px' }} />
              Searching...
            </>
          ) : (
            'Search Nearby'
          )}
        </motion.button>
      </div>

      {/* Explicit location trigger – critical for iOS reliability */}
      {geoSupported && (
        <div className="sb-geo-hint">
          <button
            type="button"
            className="sb-geo-link"
            onClick={handleUseMyLocation}
            disabled={loading}
            aria-label="Get my current location"
          >
            <FaLocationArrow size={14} />
            <span>Use my current location</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}