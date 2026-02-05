// SearchResults.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Filter,
  X,
  Star,
  ShieldCheck,
  MapPin,
  Store,
  Zap,
} from 'lucide-react';
import { Range } from 'react-range';
import PageShell from '../../components/PageShell';
import '../../css/shop/SearchResults.css';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { searchTerm = '', shops = [] } = location.state || {};

  const [modalVisible, setModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);

  const [tempIsVerified, setTempIsVerified] = useState(false);
  const [tempIsPremium, setTempIsPremium] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [tempMinRating, setTempMinRating] = useState(0);
  const [tempMaxRating, setTempMaxRating] = useState(5);
  const [tempMinDistance, setTempMinDistance] = useState(0);
  const [tempMaxDistance, setTempMaxDistance] = useState(50);

  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(5);
  const [minDistance, setMinDistance] = useState(0);
  const [maxDistance, setMaxDistance] = useState(50);

  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const isMountedRef = useRef(true);

  const allDistancesNull = useMemo(
    () =>
      Array.isArray(searchResults) &&
      searchResults.length > 0 &&
      searchResults.every((shop) => shop?.distance == null),
    [searchResults]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    try {
      const cache = localStorage.getItem('subscription_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
      }
    } catch (err) {
      console.error('Failed to load subscription cache:', err);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!Array.isArray(shops) || shops.length === 0) {
      setSearchResults([]);
      setFilteredResults([]);
      setIsDataLoaded(true);
      return;
    }

    const limitedShops = shops.slice(0, 50);
    setSearchResults(limitedShops);
    setFilteredResults(limitedShops);
    setIsDataLoaded(true);
  }, [shops]);

  useEffect(() => {
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      setFilteredResults([]);
      return;
    }

    const filtered = searchResults.filter((shop) => {
      if (!shop || typeof shop !== 'object') return false;

      const rating = shop.average_rating ?? 0;
      const distance = shop.distance ?? null;
      const verified = shop.verified ?? false;
      const isPremiumPlan = shop.plan === 'standard' || shop.plan === 'premium';

      const ratingOk = rating >= minRating && rating <= maxRating;

      const distanceOk =
        allDistancesNull || distance === null
          ? true
          : distance >= minDistance && distance <= maxDistance;

      const verifiedOk = !isVerified || verified;
      const premiumOk = !isPremium || isPremiumPlan;

      return ratingOk && distanceOk && verifiedOk && premiumOk;
    });

    if (isMountedRef.current) {
      setFilteredResults(filtered);
    }
  }, [
    minRating,
    maxRating,
    minDistance,
    maxDistance,
    isVerified,
    isPremium,
    searchResults,
    allDistancesNull,
  ]);

  const handleFilterPress = useCallback(() => {
    if (['standard', 'premium'].includes(subscriptionStatus || '')) {
      setModalVisible(true);
    } else {
      setSubscriptionModalVisible(true);
    }
  }, [subscriptionStatus]);

  const applyFilters = useCallback(() => {
    setMinRating(tempMinRating);
    setMaxRating(tempMaxRating);
    if (!allDistancesNull) {
      setMinDistance(tempMinDistance);
      setMaxDistance(tempMaxDistance);
    }
    setIsVerified(tempIsVerified);
    setIsPremium(tempIsPremium);
    setModalVisible(false);
  }, [
    tempMinRating,
    tempMaxRating,
    tempMinDistance,
    tempMaxDistance,
    tempIsVerified,
    tempIsPremium,
    allDistancesNull,
  ]);

  const resetFilters = useCallback(() => {
    setTempMinRating(0);
    setTempMaxRating(5);
    setMinRating(0);
    setMaxRating(5);

    if (!allDistancesNull) {
      setTempMinDistance(0);
      setTempMaxDistance(50);
      setMinDistance(0);
      setMaxDistance(50);
    }

    setTempIsVerified(false);
    setTempIsPremium(false);
    setIsVerified(false);
    setIsPremium(false);
    setModalVisible(false);
  }, [allDistancesNull]);

  const goToShop = (shopId: string) => {
    navigate('/shop/shop-page', { state: { shopId } });
  };

  const renderShopCard = useCallback(
    (item: any) => (
      <motion.div
        className="shop-card"
        whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
        transition={{ duration: 0.25 }}
      >
        <div className="card-image">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name || 'Shop'}
              className="shop-img"
              loading="lazy"
            />
          ) : (
            <div className="no-img-placeholder">
              <Store size={32} />
            </div>
          )}
        </div>

        <div className="card-content">
          <div className="card-header">
            <h3 className="shop-name">{item.name || 'Unnamed Space'}</h3>
            <div className="badges">
              {item.verified && (
                <div className="badge verified">
                  <ShieldCheck size={14} />
                </div>
              )}
              {item.average_rating != null && (
                <div className="badge rating">
                  <Star size={14} fill="currentColor" />
                  <span>{item.average_rating.toFixed(1)}</span>
                </div>
              )}
              {(item.plan === 'standard' || item.plan === 'premium') && (
                <div className="badge premium">
                  <Zap size={14} />
                </div>
              )}
            </div>
          </div>

          <div className="card-meta">
            <div className="meta-item">
              <MapPin size={16} className="meta-icon" />
              <span className="meta-text">{item.address || 'No Address'}</span>
            </div>
            <div className="meta-item">
              <Store size={16} className="meta-icon" />
              <span className="meta-text">
                {item.distance != null ? `${item.distance.toFixed(1)} km` : 'N/A'}
              </span>
            </div>
          </div>

          <button className="view-button" onClick={() => goToShop(item.id)}>
            View Space
          </button>
        </div>
      </motion.div>
    ),
    [goToShop]
  );

  return (
    <PageShell
      title={searchTerm ? `“${searchTerm}”` : 'Search Results'}
      isLoading={subscriptionLoading || !isDataLoaded}
      error={null}
      showBackButton={true}
    >
      <div className="search-results-page">
        <div className="top-bar">
          <div className="search-info">
            <h1 className="page-title">
              {searchTerm ? `“${searchTerm}”` : 'All Spaces'}
            </h1>
            {isDataLoaded && (
              <span className="result-count">
                {filteredResults.length} {filteredResults.length === 1 ? 'space' : 'spaces'}
              </span>
            )}
          </div>

          <motion.button
            className="filter-button"
            onClick={handleFilterPress}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Open filters"
          >
            <Filter size={20} />
            <span>Filter</span>
          </motion.button>
        </div>

        {searchResults.length === 0 ? (
          <div className="empty-state">
            <p>No spaces found for "{searchTerm}".</p>
          </div>
        ) : (
          <div className="results-grid">
            <AnimatePresence>
              {filteredResults.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.28, delay: index * 0.04 }}
                >
                  {renderShopCard(item)}
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredResults.length === 0 && searchResults.length > 0 && (
              <div className="empty-filter-result">
                <p>No matches with current filters.</p>
                <button className="reset-link" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filter Modal */}
        <AnimatePresence>
          {modalVisible && (
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalVisible(false)}
            >
              <motion.div
                className="filter-modal"
                initial={{ y: 60, opacity: 0.7 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0.7 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>Filters</h2>
                  <button className="close-btn" onClick={() => setModalVisible(false)}>
                    <X size={24} />
                  </button>
                </div>

                <div className="filter-content">
                  <div className="filter-group">
                    <label className="filter-label">
                      Rating ({tempMinRating.toFixed(1)} – {tempMaxRating.toFixed(1)})
                    </label>
                    <Range
                      step={0.1}
                      min={0}
                      max={5}
                      values={[tempMinRating, tempMaxRating]}
                      onChange={([min, max]) => {
                        setTempMinRating(min);
                        setTempMaxRating(max);
                      }}
                      renderTrack={({ props, children }) => (
                        <div {...props} className="range-track">
                          <div className="range-active" />
                          {children}
                        </div>
                      )}
                      renderThumb={({ props }) => <div {...props} className="range-thumb" />}
                    />
                  </div>

                  {!allDistancesNull && (
                    <div className="filter-group">
                      <label className="filter-label">
                        Distance ({tempMinDistance.toFixed(1)} – {tempMaxDistance.toFixed(1)} km)
                      </label>
                      <Range
                        step={0.1}
                        min={0}
                        max={50}
                        values={[tempMinDistance, tempMaxDistance]}
                        onChange={([min, max]) => {
                          setTempMinDistance(min);
                          setTempMaxDistance(max);
                        }}
                        renderTrack={({ props, children }) => (
                          <div {...props} className="range-track">
                            <div className="range-active" />
                            {children}
                          </div>
                        )}
                        renderThumb={({ props }) => <div {...props} className="range-thumb" />}
                      />
                    </div>
                  )}

                  {allDistancesNull && (
                    <p className="distance-unavailable">
                      Distance information not available
                    </p>
                  )}

                  <div className="toggle-group">
                    <label className="toggle-label">
                      <span>Verified shops only</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={tempIsVerified}
                          onChange={() => setTempIsVerified(!tempIsVerified)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </label>

                    <label className="toggle-label">
                      <span>Premium / Standard only</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={tempIsPremium}
                          onChange={() => setTempIsPremium(!tempIsPremium)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </label>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={resetFilters}>
                    Reset
                  </button>
                  <button className="btn btn-primary" onClick={applyFilters}>
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscription Modal */}
        <AnimatePresence>
          {subscriptionModalVisible && (
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSubscriptionModalVisible(false)}
            >
              <motion.div
                className="subscription-modal"
                initial={{ scale: 0.88, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.88, y: 40 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="close-btn"
                  onClick={() => setSubscriptionModalVisible(false)}
                >
                  <X size={24} />
                </button>

                <h2>Premium Filters</h2>
                <p className="modal-text">
                  Advanced filtering options are available only to Standard or Premium subscribers.
                </p>

                <div className="modal-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      navigate('/subscription');
                      setSubscriptionModalVisible(false);
                    }}
                  >
                    Upgrade Now
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSubscriptionModalVisible(false)}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
};

export default SearchResults;