import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import {
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Info,
  Calendar,
  Tags,
  X,
  Star,
  Store,
} from 'lucide-react';
import axios from 'axios';
import ReviewForm from '../../components/shop/ReviewForm';
import ShopReview from '../../components/shop/ShopReview';
import FollowButton from '../../components/shop/FollowButton';
import Followers from '../../components/shop/Followers';
import ShopProduct from '../../components/shop/ShopProduct';
import ShopPosts from '../../components/shop/ShopPost';
import ShopLocation from '../../components/shop/MapFeatures';
import { format, parseISO } from 'date-fns';
import PageShell from '../../components/PageShell1';
import '../../css/shop/ShopPage.css';

const ShopPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  //const shopId = location.state?.shopId;
  const { shop_id } = useParams();
  const { shopId: shopId } = location.state || {};

  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [followers, setFollowers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [errorType, setErrorType] = useState('generic');

  const statusAnim = useAnimationControls();

  // ─── Subscription & Session ────────────────────────────────────────
  const loadSubscription = async () => {
    try {
      const cache = localStorage.getItem('subscription_cache');
      if (cache) {
        const data = JSON.parse(cache);
        setPlan(data.plan?.toLowerCase() || null);
      }
    } catch (e) {
      console.error('Failed to load subscription_cache:', e);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const token = localStorage.getItem('sessionToken');
        setSessionId(token);
      } catch (err) {
        console.error('Failed to read sessionToken:', err);
      }
    };
    fetchSessionId();
  }, []);

  useEffect(() => {
  console.log('sessionId:', sessionId);
  console.log('shop_id from params:', shop_id);
  console.log('shopId from state:', shopId);
  console.log('shop:', shop);
}, [sessionId, shop_id, shopId, shop]);

  // ─── Data Fetching ─────────────────────────────────────────────────
  const fetchShopData = async () => {
    if (!sessionId || !shop_id) return;
    console.log('Starting fetch for shop_id:', shop_id);

    try {
      const response = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shop_id}/combined/`,
        { headers: { Authorization: sessionId } }
      );
      const data = response.data;

      setShop({
        name: data.shop.name,
        description: data.shop.description,
        image: data.shop.image,
        categories: data.shop.categories,
        category: data.shop.category,
        products: data.shop.products,
        address: data.shop.address,
        shop_id: data.shop.shop_id,
        latitude: data.shop.geo_location?.latitude,
        longitude: data.shop.geo_location?.longitude,
        is_open: data.shop.is_open,
        average_rating:
          typeof data.shop.average_rating === 'number' ? data.shop.average_rating : null,
        owner_is_verified: data.shop.owner_is_verified || false,
        created_at: data.shop.created_at,
      });

      setReviews(data.reviews || []);
      setFollowerCount(data.follower_count || 0);
      setReviewCount(data.review_count || 0);
      setFollowers(data.followers || []);
      setPosts(data.posts || []);
      setError('');
      setErrorType('generic');
    } catch (error) {
      console.error('Error fetching shop data:', error);
      if (error.response) {
        if (error.response.status === 404) {
          setError('This space no longer exists or has been removed.');
          setErrorType('not_found');
        } else if (error.response.status === 410) {
          setError('This shop has been closed by the owner.');
          setErrorType('deactivated');
        } else {
          setError('Failed to load space. Please try again later.');
          setErrorType('generic');
        }
      } else {
        setError('Network error. Please check your connection.');
        setErrorType('generic');
      }
    }
  };

  useEffect(() => {
    if (sessionId) fetchShopData();
  }, [sessionId, shopId]);

  // Set default tab based on shop category (matches mobile)
  useEffect(() => {
    if (!shop) return;
    const firstTab = shop.category?.name === 'Services' ? 'services' : 'products';
    setActiveTab(firstTab);
  }, [shop]);

  // Pulsing animation for open/closed status
  useEffect(() => {
    statusAnim.start({
      scale: [1, 1.1, 1],
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
    });
  }, [statusAnim]);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleTabChange = (tab) => setActiveTab(tab);

  const handleReviewSubmitted = (newReview) => {
    setReviews((prev) => [newReview, ...prev]);
  };

  const copyToClipboard = async () => {
    if (shop?.shop_id) {
      await navigator.clipboard.writeText(shop.shop_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleDescription = () => setIsDescriptionExpanded(!isDescriptionExpanded);

  const showCategoryTooltip = (cat) => setSelectedCategory(cat);

  const formatCreatedAt = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMMM d, yyyy');
    } catch {
      return 'Unknown date';
    }
  };

  const openImageModal = () => shop?.image && setIsImageModalVisible(true);
  const closeImageModal = () => setIsImageModalVisible(false);

  const isFreeUser = !['standard', 'premium'].includes(plan || '');

  // ─── Loading / Error States ────────────────────────────────────────
  if (subscriptionLoading || !shop || !sessionId) {
    return (
      <PageShell title="Loading..." isLoading={true} error={null} showBackButton={true}>
        <div className="loading-placeholder" />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Error" isLoading={false} error={error} showBackButton={true}>
        <div className="error-placeholder" />
      </PageShell>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────
  const isServiceShop = shop?.category?.name === 'Services';
  const visibleTabs = isServiceShop
    ? ['services', 'posts', 'customers', 'reviews']
    : ['products', 'posts', 'customers', 'reviews'];

  return (
    <PageShell
      title={shop?.name || 'Business Space'}
      isLoading={false}
      error={null}
      showBackButton={true}
      shopId={shop?.shop_id || 'number'}
    >
      <div className="shop-page-container">
        <div className="gradient-background" />

        <div className="content-wrapper">
          {/* Shop Hero */}
          <div className="shop-hero-card">
            <div className="shop-image-section">
              <img
                src={shop.image || '/placeholder-shop.jpg'}
                alt={shop.name}
                className="background-blur-image"
              />
              <div className="image-dark-overlay" />
              <button className="main-image-button" onClick={openImageModal}>
                <img
                  src={shop.image || '/placeholder-shop.jpg'}
                  alt={shop.name}
                  className="foreground-shop-image"
                />
              </button>

              {/* Rating Badge */}
              {shop.average_rating != null && !isNaN(shop.average_rating) && (
                <div className="rating-badge-container">
                  <div className="rating-badge">
                    <Star size={12} fill="#FFD700" color="#FFD700" />
                    <span className="rating-text">{shop.average_rating.toFixed(1)}</span>
                  </div>
                </div>
              )}

              {/* Verified Badge */}
              {shop.owner_is_verified && (
                <div className="verified-container">
                  <div className="owner-verified-badge">
                    <CheckCircle size={16} color="#0FA958" />
                    <div className="verified-icon-overlay">
                      <CheckCircle size={10} color="#0FA958" fill="#0FA958" />
                    </div>
                  </div>
                </div>
              )}

              {/* Open/Closed Status */}
              <motion.div className="shop-status-overlay" animate={statusAnim}>
                {shop.is_open ? (
                  <CheckCircle size={16} color="#10B981" />
                ) : (
                  <AlertCircle size={16} color="#EF4444" />
                )}
                <span className="shop-status-text">
                  {shop.is_open ? 'Open' : 'Closed'}
                </span>
              </motion.div>
            </div>

            <div className="shop-info-section">
              <h1 className="shop-title">{shop.name}</h1>

              <div className="info-row">
                <Store size={17} />
                <p className="shop-address">{shop.address}</p>
              </div>

              <div className="map-wrapper">
                <ShopLocation shopLat={shop.latitude} shopLng={shop.longitude} />
              </div>

              <p className="followers-text">{followers.length} Customers</p>

              <div className="action-buttons-row">
  <FollowButton shopId={shopId} />

  <motion.button
    className="message-button-wrapper"
    onClick={() =>
     navigate("/start-conversation", { state: { shopId: shopId, name: shop.name } })}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="message-button-gradient">
      <MessageCircle size={18} className="message-icon" />
      <span className="button-text">Message</span>
    </div>
  </motion.button>
</div>
            </div>
          </div>

          {/* Image Modal */}
          {isImageModalVisible && (
            <div className="image-modal-backdrop" onClick={closeImageModal}>
              <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                <img src={shop.image} alt={shop.name} className="modal-image" />
                <button className="modal-close-btn" onClick={closeImageModal}>
                  <X size={32} />
                </button>
              </div>
            </div>
          )}

          {/* About + Categories */}
          <div className="details-section">
            <div className="card about-card">
              <div className="sp-card-header">
                <Info size={26} />
                <h2>About</h2>
              </div>
              <motion.p
                className="description"
                animate={{ height: isDescriptionExpanded ? 'auto' : 72 }}
                transition={{ duration: 0.35 }}
              >
                {shop.description || 'No description available.'}
              </motion.p>

              {shop.created_at && (
                <div className="created-at-pill">
                  <Calendar size={14} />
                  Created on {formatCreatedAt(shop.created_at)}
                </div>
              )}

              {shop.description?.length > 100 && (
                <button className="read-more-btn" onClick={toggleDescription}>
                  {isDescriptionExpanded ? 'Read Less' : 'Read More'}
                </button>
              )}
            </div>

            <div className="card categories-card">
              <div className="sp-card-header">
                <Tags size={26} />
                <h2>Categories</h2>
              </div>
              <div className="sp-categories-list">
                {shop.categories?.length > 0 ? (
                  shop.categories.map((cat, i) => (
                    <motion.button
                      key={cat.name}
                      className="sp-category-chip"
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => showCategoryTooltip(cat)}
                    >
                      <span className="chip-text">{cat.name}</span>
                      <div
                        className="sp-chip-bg"
                        style={{
                          background: `linear-gradient(135deg, ${
                            ['#6B7280', '#4B5563'][i % 2]
                          }, ${['#1D4ED8', '#3B82F6'][i % 2]})`,
                        }}
                      />
                    </motion.button>
                  ))
                ) : (
                  <div className="no-categories">No categories available</div>
                )}
              </div>

              <AnimatePresence>
                {selectedCategory && (
                  <motion.div
                    className="category-tooltip"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                  >
                    <p>
                      {selectedCategory.name} – Explore products and services in this
                      category.
                    </p>
                    <button onClick={() => setSelectedCategory(null)}>Close</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Tabs – now dynamic (Products or Services) */}
          <div className="tabs-container">
            {visibleTabs.map((tab) => (
              <motion.button
                key={tab}
                className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                onClick={() => handleTabChange(tab)}
                whileTap={{ scale: 0.97 }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && <div className="tab-indicator" />}
              </motion.button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content-card">
            {['products', 'services'].includes(activeTab) && (
              <ShopProduct
                shopId={shopId}
                category={shop.category?.name}
                
                products={shop.products}
                shopName={shop.name}
              />
            )}

            {activeTab === 'posts' && (
              isFreeUser ? (
                posts.length > 0 ? (
                  <ShopPosts posts={[posts[0]]} scrollEnabled={false} />
                ) : (
                  <p className="empty-state">No posts available</p>
                )
              ) : (
                <ShopPosts posts={posts} scrollEnabled={false} />
              )
            )}

            {activeTab === 'customers' && <Followers followers={followers} />}

            {activeTab === 'reviews' && (
              <div className="reviews-wrapper">
                <ReviewForm shopId={shopId} onReviewSubmitted={handleReviewSubmitted} />
                <ShopReview reviews={reviews} count={reviewCount} />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ShopPage;