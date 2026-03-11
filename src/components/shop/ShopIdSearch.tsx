// src/components/shop/ShopIdSearch.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from "axios";

export default function ShopIdSearch() {
  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    setSessionToken(token);
  }, []);

  const handleSearch = async () => {
    if (!shopId.trim()) {
      setError('Please enter a Shop ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(
        '/search-shop-id/',
        { shop_id: shopId.trim() },
        {
          headers: {
            Authorization: sessionToken || '',
          },
        }
      );

      if (res.data.shop_id) {
        navigate(`/shop/shop-page/${res.data.shop_id}`);
      } else {
        setError(res.data.error || 'Shop not found');
      }
    } catch (err: any) {
      setError('Invalid Shop ID or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="shopid-search"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="input-group">
        <input
          type="text"
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
          placeholder="Enter Space / Shop ID"
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
          {loading ? 'Searching...' : 'Find Shop'}
        </motion.button>
      </div>
    </motion.div>
  );
}