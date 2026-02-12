// SearchResults.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
    navigate(`/shop-page/${shopId}`);
  };

  const renderShopCard = useCallback(
  (item: any) => (
    <motion.div
      className="srt-shop-card"
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      onClick={() => goToShop(item.shop_id)}
      style={{ cursor: 'pointer' }}
    >
      {/* TOP SECTION */}
      <div className="srt-top-row">

        {/* Image */}
        <div className="srt-image-wrapper">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name || 'Shop'}
              className="srt-shop-img"
              loading="lazy"
            />
          ) : (
            <div className="srt-no-img-placeholder">
              <Store size={30} strokeWidth={1.4} />
            </div>
          )}
        </div>

        {/* Right side (Name + badges stacked) */}
        <div className="srt-right-stack">
          <h3 className="srt-shop-name">
            {item.name || 'Unnamed Space'}
          </h3>

          <div className="srt-badge-row">
            {item.average_rating != null && (
              <div className="srt-rating-pill">
                <Star size={14} fill="#facc15" stroke="#eab308" />
                <span>{item.average_rating.toFixed(1)}</span>
              </div>
            )}

            {item.verified && (
              <ShieldCheck size={16} className="srt-verified-icon" />
            )}

            {(item.plan === 'standard' || item.plan === 'premium') && (
              <div className="srt-plan-pill">
                <Zap size={14} />
                <span>Premium</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULL WIDTH ADDRESS */}
      <div className="srt-address-row">
        {item.address || 'No address provided'}
      </div>

      {/* FULL WIDTH DISTANCE */}
      <div className="srt-distance-row">
        <MapPin size={14} />
        <span>
          {item.distance != null
            ? `${item.distance.toFixed(1)} km`
            : 'Distance N/A'}
        </span>
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
      <div className="srt-page-content">
        <div className="srt-filter-trigger-wrapper">
          <motion.button
            className="srt-filter-trigger"
            onClick={handleFilterPress}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Open filters"
          >
            <Filter size={20} />
            <span>Filter Results</span>
          </motion.button>
        </div>

        {searchResults.length === 0 ? (
          <div className="srt-empty-state">
            <p>No spaces found for "{searchTerm}".</p>
          </div>
        ) : (
          <div className="srt-results-list">
            <AnimatePresence>
              {filteredResults.map((item) => (
                <motion.div
                  key={item.shop_id || item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.32 }}
                >
                  {renderShopCard(item)}
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredResults.length === 0 && searchResults.length > 0 && (
              <div className="srt-no-matches">
                <p>No results match the current filters.</p>
                <button className="srt-clear-filters-btn" onClick={resetFilters}>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Filter Modal */}
        <AnimatePresence>
          {modalVisible && (
            <motion.div
              className="srt-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalVisible(false)}
            >
              <motion.div
                className="srt-filter-modal"
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="srt-modal-header">
                  <h2>Filters</h2>
                  <button className="srt-modal-close" onClick={() => setModalVisible(false)}>
                    <X size={24} />
                  </button>
                </div>

                <div className="srt-modal-body">
                  <div className="srt-filter-section">
                    <label className="srt-filter-label">
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
                        <div {...props} className="srt-range-track">
                          <div className="srt-range-active" />
                          {children}
                        </div>
                      )}
                      renderThumb={({ props }) => <div {...props} className="srt-range-thumb" />}
                    />
                  </div>

                  {!allDistancesNull && (
                    <div className="srt-filter-section">
                      <label className="srt-filter-label">
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
                          <div {...props} className="srt-range-track">
                            <div className="srt-range-active" />
                            {children}
                          </div>
                        )}
                        renderThumb={({ props }) => <div {...props} className="srt-range-thumb" />}
                      />
                    </div>
                  )}

                  {allDistancesNull && (
                    <p className="srt-distance-note">
                      Distance information not available for this search
                    </p>
                  )}

                  <div className="srt-toggle-section">
                    <label className="srt-toggle-row">
                      <span>Verified only</span>
                      <label className="srt-switch">
                        <input
                          type="checkbox"
                          checked={tempIsVerified}
                          onChange={() => setTempIsVerified(!tempIsVerified)}
                        />
                        <span className="srt-slider srt-round"></span>
                      </label>
                    </label>

                    <label className="srt-toggle-row">
                      <span>Standard / Premium only</span>
                      <label className="srt-switch">
                        <input
                          type="checkbox"
                          checked={tempIsPremium}
                          onChange={() => setTempIsPremium(!tempIsPremium)}
                        />
                        <span className="srt-slider srt-round"></span>
                      </label>
                    </label>
                  </div>
                </div>

                <div className="srt-modal-actions">
                  <button className="srt-btn srt-btn-reset" onClick={resetFilters}>
                    Reset
                  </button>
                  <button className="srt-btn srt-btn-apply" onClick={applyFilters}>
                    Apply
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
              className="srt-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSubscriptionModalVisible(false)}
            >
              <motion.div
                className="srt-subscription-modal"
                initial={{ scale: 0.85, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.85, y: 40 }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="srt-modal-close"
                  onClick={() => setSubscriptionModalVisible(false)}
                >
                  <X size={24} />
                </button>

                <h2>Premium Feature</h2>
                <p>
                  Advanced filtering is available only to Standard or Premium subscribers.
                </p>

                <div className="srt-modal-actions">
                  <button
                    className="srt-btn srt-btn-apply"
                    onClick={() => {
                      navigate('/subscription');
                      setSubscriptionModalVisible(false);
                    }}
                  >
                    Upgrade Now
                  </button>
                  <button
                    className="srt-btn srt-btn-reset"
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