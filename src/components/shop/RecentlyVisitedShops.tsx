// components/RecentlyVisitedShops.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../css/component/shop/RecentlyVisitedShops.css';

interface Shop {
  id: number;
  name: string;
  image?: string;
  visited_at: string;
}

interface RecentlyVisitedShopsProps {
  shops: Shop[];
}

const RecentlyVisitedShops: React.FC<RecentlyVisitedShopsProps> = ({ shops }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAll, setShowAll] = useState(false);

  const handleSeeAll = () => {
    navigate('/recently-visited', {
      state: { prevRoute: location.pathname },
    });
  };

  const handleShowMore = () => {
    setShowAll(true);
  };

  const handleShopPress = (shop_id: string, shopId: number) => {
    navigate(`/shop-page/${shop_id}`, {
    state: { shopId }
  });
  };

  const shopsToShow = showAll ? shops : shops.slice(0, 3);

  const renderShopItem = (shop: Shop, index: number) => (
    <motion.div
      key={shop.id}
      className="rv-shop-card-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.06,
        type: 'spring',
        stiffness: 280,
        damping: 24,
      }}
      whileHover={{ scale: 1.03, y: -4 }}
    >
      <button
        className="rv-shop-card"
        onClick={() => handleShopPress(shop.shop_id, shop.id)}
        type="button"
      >
        <div className="rv-image-container">
          {shop.image ? (
            <img
              src={shop.image}
              alt={shop.name}
              className="rv-shop-image"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="rv-shop-image-placeholder">
              <span>{shop.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="rv-shop-info">
          <h3 className="rv-shop-name">{shop.name}</h3>
          <p className="rv-visited-at">
            Visited {new Date(shop.visited_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Optional: keep chevron if you like it, or remove in next styling round */}
        {/* <ChevronRight className="rv-chevron-icon" size={20} /> */}
      </button>
    </motion.div>
  );

  return (
    <section className="rv-recently-visited-section">
      <div className="rv-section-header">
        <h2 className="rv-section-title">Recently Visited</h2>

        {shops.length > 0 && (
          <motion.button
            className="rv-see-all-button"
            onClick={handleSeeAll}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            See All
          </motion.button>
        )}
      </div>

      <div className="rv-shops-list">
        {shopsToShow.map((shop, index) => renderShopItem(shop, index))}
      </div>

      {!showAll && shops.length > 3 && (
        <div className="rv-show-more-wrapper">
          <motion.button
            className="rv-show-more-button"
            onClick={handleShowMore}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
            Show {shops.length - 3} more
          </motion.button>
        </div>
      )}
    </section>
  );
};

export default RecentlyVisitedShops;