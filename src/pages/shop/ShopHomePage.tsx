import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaStore, FaExclamationTriangle, FaSyncAlt } from "react-icons/fa";
import SearchBar from "../../components/shop/SearchBar";
import Categories from "../../components/shop/Categories";
import Header from "../../components/shop/Header";
import RecentlyVisitedShops from "../../components/shop/RecentlyVisitedShops";
import FollowedShops from "../../components/shop/FollowedShops";

//import AdMobManager from "./AdMobManager"; // Adjust path or replace with web ads
//import useAuthGuard from "../../hooks/useAuthGuard"; // Adjust path
import '../../css/shop/ShopHomePage.css';

const Shop: React.FC = () => {
  // Auth Guard (blocks render if not logged in)
  //useAuthGuard();

  // State
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [data, setData] = useState({
    categories: [],
    followed_shops: [],
    recently_visited_shops: [],
  });
  const [suggestionsHeight, setSuggestionsHeight] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopulating, setIsPopulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modalTitle, setModalTitle] = useState('Setting Up Your Dashboard');
  const [modalSubtitle, setModalSubtitle] = useState('Please hold on this could take a few minutes...');

  const hasFetchedOnceRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Load subscription cache
  useEffect(() => {
    const load = async () => {
      try {
        const cache = localStorage.getItem('subscription_cache');
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionPlan(parsed.plan?.toLowerCase() || null);
        }
      } catch (e) {
        console.error('Failed to load subscription_cache:', e);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    load();
  }, []);

  // Cache helpers
  const isValidCache = (d: any) =>
    d &&
    (d.categories?.length > 0 ||
      d.followed_shops?.length > 0 ||
      d.recently_visited_shops?.length > 0);

  const loadCachedData = async (): Promise<boolean> => {
    try {
      const cached = localStorage.getItem('shopDashboardData');
      const ts = localStorage.getItem('shopDashboardDataTimestamp');
      const isFresh = ts && Date.now() - parseInt(ts) < 5 * 60 * 1000;

      if (cached && isFresh) {
        const parsed = JSON.parse(cached);
        if (isValidCache(parsed)) {
          setData(parsed);
          setIsLoading(false);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Cache load error:', e);
      return false;
    }
  };

  // Fetch dashboard data
  const fetchData = async () => {
    try {
      setNetworkError(false);
      const token = localStorage.getItem('sessionToken');
      if (!token) {
        localStorage.clear(); // clearNonSuggestionData equivalent
        setData({ categories: [], followed_shops: [], recently_visited_shops: [] });
        navigate('/login');
        return;
      }

      const res = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-dashboard-overview/', {
        headers: { Authorization: token },
      });

      const newData = res.data;
      setData(newData);

      // Sync verification status
      const verificationStatus = newData.verification_status || 'not_started';

      if (verificationStatus === 'verified' || verificationStatus === 'failed') {
        localStorage.removeItem('pending_qoreid_verification');
      }

      // Cache data
      localStorage.setItem('shopDashboardData', JSON.stringify(newData));
      localStorage.setItem('shopDashboardDataTimestamp', Date.now().toString());
      localStorage.setItem('user_verified', JSON.stringify(newData.user_verified));
      localStorage.setItem('phone_verified', JSON.stringify(newData.phone_verified));
      localStorage.setItem('shop_id', JSON.stringify(newData.shop_id));
      localStorage.setItem('verification_status', verificationStatus);
      localStorage.setItem('subscription_cache', JSON.stringify({
        plan: newData.plan,
        is_active: newData.is_active,
        start_date: newData.start_date,
        end_date: newData.end_date,
      }));

      setSubscriptionPlan(newData.plan?.toLowerCase() || null);
      hasFetchedOnceRef.current = true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        localStorage.clear();
        navigate('/login');
      } else {
        console.error('Network error:', error);
        setNetworkError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize (equivalent to useFocusEffect)
  useEffect(() => {
    const init = async () => {
      const hasCache = await loadCachedData();
      if (!hasCache) {
        await fetchData();
      }
    };
    init();
  }, []);

  // Handlers
  const handleSuggestionsStateChange = useCallback(
    ({ showSuggestions, suggestionsHeight }: { showSuggestions: boolean; suggestionsHeight: number }) => {
      setShowSuggestions(showSuggestions);
      setSuggestionsHeight(showSuggestions ? suggestionsHeight : 0);
    },
    []
  );

  const handleFocusChange = useCallback((focused: boolean) => setInputFocused(focused), []);
  const handlePopulationStateChange = useCallback(
    ({ isPopulating, progress }: { isPopulating: boolean; progress: number }) => {
      setIsPopulating(isPopulating);
      setProgress(progress);
      setModalTitle(progress >= 99 ? 'Finalizing Your Dashboard' : 'Setting Up Your Dashboard');
      setModalSubtitle(progress >= 99 ? 'Almost ready...' : 'Please hold on this could take a few minutes...');
    },
    []
  );

  const handleReload = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, []);

  // Sections
  const sections = useMemo(
    () => [
      { type: 'header', id: 'header' },
      {
        type: 'searchBar',
        id: 'searchBar',
        onSuggestionsStateChange: handleSuggestionsStateChange,
        onFocusChange: handleFocusChange,
        onPopulationStateChange: handlePopulationStateChange,
      },
      { type: 'categories', id: 'categories', data: data.categories },
      { type: 'followedShops', id: 'followedShops', data: data.followed_shops },
      { type: 'recentShops', id: 'recentShops', data: data.recently_visited_shops },
    ],
    [
      data.categories,
      data.followed_shops,
      data.recently_visited_shops,
      handleSuggestionsStateChange,
      handleFocusChange,
      handlePopulationStateChange,
    ]
  );

  const renderSection = (item: any) => {
    switch (item.type) {
        case 'header':
          return <div style={{ height: 0 }} />;
        case 'searchBar':
          return (
            <SearchBar/>
          );
        case 'categories':
            return <Categories categories={item.data} />;
        case 'followedShops':
          return <FollowedShops shops={item.data} />;
        case 'recentShops':
          return <RecentlyVisitedShops shops={item.data} />; 
        default:
          return <div />;
    }
  };

  // Early returns
  if (subscriptionLoading || isLoading) {
    return (
      <div className="loading-screen">
        <motion.div 
          className="loading-container"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <FaStore size={40} className="loading-icon" />
          <p className="loading-text">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="error-screen">
        <motion.div 
          className="error-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="error-text">Failed to load data due to a network issue.</p>
          <motion.button 
            className="reload-button"
            onClick={handleReload}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaSyncAlt size={24} />
            <span>Retry</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const isFreeUser = !['standard', 'premium'].includes(subscriptionPlan || '');

  return (
    <div className="shop-homepage">
      <header className="header-container">
         <Header /> 
      </header>

      <main className="main-container">
        <div 
          ref={scrollRef}
          className="scroll-container"
          style={{ paddingBottom: `${suggestionsHeight + 100}px` }}
        >
          {sections.map((section) => (
            <div key={section.id} className="section-item">
              {renderSection(section)}
            </div>
          ))}

          <div className="footer-container">
            {isFreeUser && (
              <div className="ad-container">
                {/* <AdMobManager /> */}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Progress Modal */}
      <AnimatePresence>
        {isPopulating && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-container"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <h2 className="modal-title">{modalTitle}</h2>
              <p className="modal-subtitle">{modalSubtitle}</p>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="progress-text">{Math.round(progress)}%</div>
              <div className="modal-loader" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Shop;
