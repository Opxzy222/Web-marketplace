// components/FollowedShops.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import '../../css/component/shop/FollowedShops.css';

interface Shop {
  id: number;
  name: string;
  image?: string;
}

interface FollowedShopsProps {
  shops: Shop[];
}

const FollowedShops: React.FC<FollowedShopsProps> = ({ shops }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const sessionIdString = localStorage.getItem('sessionToken');
    setSessionId(sessionIdString);
  }, []);

  // Limit display to first 5 shops + alphabetical sort
  const limitedShops = shops.slice(0, 5);
  const sortedShops = [...limitedShops].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const handleSeeAll = () => {
    navigate('/favorite-space', {
      state: { prevRoute: location.pathname },
    });
  };

  const handleShopPress = (shop_id: string, shopId: number) => {
   navigate(`/shop-page/${shop_id}`, {
    state: { shopId }
  });
  };

  const renderShopItem = (shop: Shop, index: number) => (
    <motion.div
      key={shop.id}
      className="fs-shop-card-wrapper"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.08,
        type: 'spring',
        stiffness: 300,
        damping: 24,
      }}
      whileHover={{ scale: 1.04 }}
    >
      <button
        className="fs-shop-card"
        onClick={() => handleShopPress(shop.shop_id, shop.id)}
        type="button"
      >
        <div className="fs-image-container">
          {shop.image ? (
            <img
              src={shop.image}
              alt={shop.name}
              className="fs-shop-image"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="fs-shop-image-placeholder">
              <span>{shop.name.charAt(0).toUpperCase()}</span>
            </div>
          )}

          <div className="fs-follow-badge">
            <Heart size={14} fill="white" />
          </div>
        </div>

        <h3 className="fs-shop-name">{shop.name}</h3>
      </button>
    </motion.div>
  );

  const renderEmptyState = () => (
    <motion.div
      className="fs-empty-container"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Heart className="fs-empty-icon" size={56} strokeWidth={1.4} />
      <h3 className="fs-empty-title">No Favorite Shops Yet</h3>
      <p className="fs-empty-subtitle">
        Follow shops you love to see their latest updates here.
      </p>
    </motion.div>
  );

  return (
    <section className="fs-followed-shops-container">
      <div className="fs-section-header">
        <h2 className="fs-section-title">Favorite Space</h2>

        {sortedShops.length > 0 && (
          <motion.button
            className="fs-see-all-button"
            onClick={handleSeeAll}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            See All
          </motion.button>
        )}
      </div>

      {shops.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="fs-shops-horizontal-list">
          {sortedShops.map((shop, index) => renderShopItem(shop, index))}
        </div>
      )}
    </section>
  );
};

export default FollowedShops;