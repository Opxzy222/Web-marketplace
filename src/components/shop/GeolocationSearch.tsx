// src/components/shop/GeolocationSearch.tsx
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSpinner, FaExclamationTriangle } from 'react-icons/fa';

interface GeolocationSearchProps {
  onSearch: (shops: any[]) => void;
}

export default function GeolocationSearch({ onSearch }: GeolocationSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = useCallback(() => {
    if (!query.trim()) {
      setError('Please enter what you are looking for');
      return;
    }

    setLoading(true);
    setError(null);

    // This is the exact pattern that triggers the permission prompt reliably on iOS Safari
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
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
              setLoading(false);
              return;
            }

            const shops = response.data.shops || [];
            if (shops.length === 0) {
              setError('No shops found nearby. Try a different search term.');
              setLoading(false);
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
        },
        (err) => {
          let message = 'Could not get your location.';

          if (err.code === 1) {
            message =
              'Location access denied. Please enable it in Settings → Safari → Website Settings → Allow Location for this site.';
          } else if (err.code === 2) {
            message = 'Location information is unavailable. Check your device settings.';
          } else if (err.code === 3) {
            message = 'Location request timed out. Please try again.';
          } else {
            message = err.message || 'Unknown location error.';
          }

          setError(message);
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,       // Longer timeout helps on iOS
          maximumAge: 0,
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  }, [query, onSearch, navigate]);

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

      <div className="sb-input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nearby shops (e.g. supermarket, fashion...)"
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
              <span>Searching...</span>
            </>
          ) : (
            'Search Nearby'
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}