// src/components/shop/GeolocationSearch.tsx
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface GeolocationSearchProps {
  onSearch: (shops: any[]) => void;
}

export default function GeolocationSearch({ onSearch }: GeolocationSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ── Get user location using browser Geolocation API ──
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      const response = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-product-search/', {
        params: { input: query.trim(), lat: latitude, lon: longitude },
      });

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      const shops = response.data.shops || [];
      if (shops.length === 0) {
        setError('No shops found nearby');
        return;
      }

      const limitedShops = shops.slice(0, 50);
      onSearch(limitedShops);

      navigate('/search-result', {
        state: { searchTerm: query.trim(), shops: limitedShops },
      });
    } catch (err: any) {
      let message = 'Failed to search. Try again.';

      if (err.code === 1) { // user denied permission
        message = 'Location access denied. Please enable it in your browser settings.';
      } else if (err.code === 2) {
        message = 'Location unavailable. Please check your connection or device settings.';
      } else if (err.code === 3) {
        message = 'Location request timed out.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [query, onSearch, navigate]);

  return (
    <motion.div
      className="geo-search"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nearby shops (e.g. supermarket, fashion...)"
          className="search-input"
          disabled={loading}
        />

        <motion.button
          className="search-btn"
          onClick={handleSearch}
          disabled={loading}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? 'Searching...' : 'Search Nearby'}
        </motion.button>
      </div>
    </motion.div>
  );
}