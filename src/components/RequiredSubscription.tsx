// RequiredSubscription.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import '../css/component/RequiredSubscription.css';

const SubscriptionRequired = ({ visible, onClose }) => {
  const navigate = useNavigate ();
  const [subscription, setSubscription] = useState({
    plan: null,
    end_date: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      const loadSubscription = async () => {
        try {
          const cache = localStorage.getItem("subscription_cache");
          if (cache) {
            const parsed = JSON.parse(cache);
            setSubscription({
              plan: parsed.plan || null,
              end_date: parsed.end_date || null,
            });
          } else {
            setSubscription({ plan: null, end_date: null });
          }
        } catch (error) {
          console.error("Failed to load subscription_cache:", error);
          setSubscription({ plan: null, end_date: null });
        } finally {
          setLoading(false);
        }
      };
      loadSubscription();
    } else {
      setLoading(true);
      setSubscription({ plan: null, end_date: null });
    }
  }, [visible]);

  const handleUpgrade = () => {
    onClose();
    navigate('/shop/Subscription');
  };

  const handleClose = (e) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="subscription-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="subscription-modal"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Exclusive Feature</h2>
              <motion.button
                className="close-button"
                onClick={handleClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <X size={24} />
              </motion.button>
            </div>

            <div className="modal-description">
              This feature is exclusive to{' '}
              <span className="plan-highlight">Standard</span> and{' '}
              <span className="plan-highlight">Premium</span> subscribers.
              <br /><br />
              Upgrade now to unlock the full experience!
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="spinner" />
                <span>Loading...</span>
              </div>
            ) : (
              <div className="button-row">
                <motion.button
                  className="cancel-button"
                  onClick={handleClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Maybe Later
                </motion.button>

                <motion.button
                  className="upgrade-button"
                  onClick={handleUpgrade}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Upgrade Now
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SubscriptionRequired;
