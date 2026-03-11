// components/Subscription.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CreditCard, CheckCircle2, ChevronDown, ChevronUp, Loader2, MoveRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import PageShell from '../../components/PageShell'; // adjust path
import '../../css/shop/Subscription.css';

interface Plan {
  key: string;
  name: string;
  price: string;
  originalPrice: string;
  discount: string | null;
  enabled: boolean;
  features: string[];
  popular?: boolean;
}

const PLAN_DETAILS: Record<string, Plan> = {
  regular: {
    key: 'regular',
    name: 'Regular',
    price: '₦2,500/month',
    originalPrice: '₦5,000',
    discount: '50% Off',
    enabled: true,
    features: [
      'Ad-Free Experience',
      'Advanced Search Filters',
      'Send Media in Chat & Order',
      'Interactive Map Access',
      'Unlimited Order Requests',
    ],
  },
  standard: {
    key: 'standard',
    name: 'Standard',
    price: '₦5,000/month',
    originalPrice: '₦10,000',
    discount: '50% Off',
    enabled: true,
    features: [
      'All Regular features',
      'Enhanced Search Visibility',
      'Receipt Generation',
      'Post Media Content',
      'Update Media Stories',
    ],
    popular: true,
  },
};

const DISPLAY_PLANS = Object.values(PLAN_DETAILS).filter(p => p.enabled);

const Subscription: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const carouselRef = useRef<HTMLDivElement>(null);

  const currentPlan = searchParams.get('currentPlan') || 'none';
  const endDate = searchParams.get('endDate') || 'N/A';

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth } = carouselRef.current;
    const cardWidth = scrollWidth / DISPLAY_PLANS.length;
    const index = Math.round(scrollLeft / cardWidth);
    setCurrentIndex(index);
  }, []);

  const scrollToIndex = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.scrollWidth / DISPLAY_PLANS.length;
      carouselRef.current.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
    }
  };

  const purchasePlan = async () => {
    if (!selectedPlan) return alert('Select a plan first');

    setLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const res = await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/payments/purchase/',
        { plan: selectedPlan },
        { headers: { Authorization: token, 'Content-Type': 'application/json' } }
      );

      setModalMessage(res.data.message || 'Subscription activated!');
      setModalVisible(true);

      // optimistic cache
      const today = new Date().toISOString().split('T')[0];
      const end = new Date();
      end.setDate(end.getDate() + 30);
      localStorage.setItem('subscription_cache', JSON.stringify({
        plan: selectedPlan,
        is_active: true,
        start_date: today,
        end_date: end.toISOString().split('T')[0],
      }));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Purchase failed';
      if (msg.toLowerCase().includes('insufficient')) {
        alert('Insufficient balance. Top up your wallet.');
        navigate('/account');
      } else {
        setModalMessage(msg);
        setModalVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Subscription Plans"
      showBackButton={true}
      isLoading={false}
    >
      <div className="subscription-wrapper">
        {/* Current Subscription */}
        <div className="current-plan-card">
          <h2 className="section-title">Current Plan</h2>
          <div className="plan-info-row">
            <CreditCard size={24} />
            <div>
              <div className="plan-label">Plan</div>
              <div className="plan-value">
                {currentPlan === 'none' ? 'Free' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </div>
            </div>
          </div>
          <div className="plan-info-row">
            <div className="plan-label">Expires</div>
            <div className="plan-value">{endDate}</div>
          </div>
        </div>

        {/* Plans Carousel */}
        <h2 className="section-title">Choose Your Plan</h2>
        <p className="section-subtitle">Unlock premium features and grow your business</p>

        <div className="carousel-container">
          <div
            ref={carouselRef}
            className="plans-carousel"
            onScroll={handleScroll}
          >
            {DISPLAY_PLANS.map((plan) => (
              <motion.div
                key={plan.key}
                className={`plan-card ${selectedPlan === plan.key ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedPlan(plan.key)}
              >
                {plan.popular && <div className="popular-badge">Vendors</div>}

                <h3 className="plan-name">{plan.name}</h3>

                <div className="pricing">
                  <span className="price">{plan.price}</span>
    
                </div>
                <div className="price-discount" >
                <span className="original">{plan.originalPrice}</span>
                  {plan.discount && <span className="discount">{plan.discount}</span>}
                </div>

                <ul className="features">
                  {plan.features.map((f, i) => (
                    <li key={i}>
                      <CheckCircle2 size={18} className="check-icon" />
                      {f}
                    </li>
                  ))}
                </ul>

                {selectedPlan === plan.key && (
                  <motion.div
                    className="selected-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <CheckCircle2 size={48} />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="carousel-dots">
            {DISPLAY_PLANS.map((_, i) => (
              <button
                key={i}
                className={`dot ${currentIndex === i ? 'active' : ''}`}
                onClick={() => scrollToIndex(i)}
              />
            ))}
          </div>
        </div>

        {/* Segmented Control instead of dropdown */}
        <div className="plan-selector">
          {DISPLAY_PLANS.map(plan => (
            <button
              key={plan.key}
              className={`segment ${selectedPlan === plan.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedPlan(plan.key);
                scrollToIndex(DISPLAY_PLANS.findIndex(p => p.key === plan.key));
              }}
            >
              {plan.name}
            </button>
          ))}
        </div>

        {/* Subscribe Button */}
        <motion.button
          className={`subscribe-btn ${!selectedPlan || loading ? 'disabled' : ''}`}
          disabled={!selectedPlan || loading}
          onClick={purchasePlan}
          whileHover={selectedPlan && !loading ? { scale: 1.04 } : {}}
          whileTap={selectedPlan && !loading ? { scale: 0.96 } : {}}
        >
          {loading ? (
            <Loader2 className="spinner" size={22} />
          ) : (
            'Subscribe Now'
          )}
        </motion.button>
      </div>

      {/* Modal */}
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
              className="modal-box"
              initial={{ y: 60, scale: 0.92 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 60, scale: 0.92 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Subscription Update</h3>
              <p>{modalMessage}</p>
              <button className="modal-close-btn" onClick={() => setModalVisible(false)}>
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default Subscription;