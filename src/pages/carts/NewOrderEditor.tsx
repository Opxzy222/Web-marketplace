// src/pages/cart/NewOrderEditor.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import AddCustomItemModal from '../../components/carts/AddCustomItemModal';
import CartItemRow from '../../components/carts/CartItemRow';
import PageShell from '../../components/PageShell';
import '../../css/carts/NewOrderEditor.css';

import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Store,
  ArrowLeft,
  Send,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

const API_BASE = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

export default function NewOrderEditor() {
  const location = useLocation();
  const shopId = location.state?.shopId;

  const { getShopItems, totalAmount, clearShopCart } = useCart();
  const navigate = useNavigate();

  const [items, setItems] = useState<any[]>([]);
  const [shopName, setShopName] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [limitModalVisible, setLimitModalVisible] = useState(false);

  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([]);
  const [imageViewerStartIndex, setImageViewerStartIndex] = useState(0);

  // VERIFICATION STATE
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load session token
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (isMountedRef.current) setSessionToken(token);
  }, []);

  // Load verification status
  useEffect(() => {
    const value = localStorage.getItem('user_verified');
    const userVerified = value ? JSON.parse(value) : null;
    setIsVerified(userVerified);
  }, []);

  // Load shop items
  useEffect(() => {
    if (!shopId) return;

    const currentItems = getShopItems(shopId);
    setItems(currentItems);
    if (currentItems.length > 0 && !shopName) {
      setShopName(currentItems[0].shopName || 'Shop');
    }
  }, [shopId, getShopItems, shopName]);

  const handleSuccess = useCallback(() => {
    clearShopCart(shopId);
    navigate('/cart/BuyerPODashboard');
  }, [clearShopCart, shopId, navigate]);

  const handleSendError = (error: any) => {
    if (error?.response?.data?.error === 'Daily limit reached') {
      setLimitModalVisible(true);
      return true;
    }
    return false;
  };

  if (items.length === 0) {
    return (
      <div className="nworder-empty-state">
        <div className="nworder-empty-content">
          <ShoppingCart className="nworder-empty-icon" size={64} />
          <h2 className="nworder-empty-title">Your cart is empty</h2>
          <p className="nworder-empty-text">Add items from the shop first.</p>
          <button
            onClick={() => navigate(-1)}
            className="nworder-empty-btn"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageShell title="New Order" showBackButton={true}>
    <div className="nworder-page">
      {/* Header */}
      

      {/* Shop Info Card */}
      <div className="nworder-shop-card">
        <div className="nworder-shop-icon">
          <Store size={20} />
        </div>
        <div className="nworder-shop-info">
          <div className="nworder-shop-name">{shopName}</div>
          <div className="nworder-shop-items">{items.length} item{items.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="nworder-main"
      >
        <div className="nworder-content">
          {items.map((item, index) => (
            <div key={item.id} className={`nworder-item-wrapper ${index === 0 ? '' : 'nworder-item-spacer'}`}>
              <CartItemRow
                item={item}
                onOpenImageViewer={(imageUrl: string) => {
                  const validImages = items
                    .map((it: any) => it.image)
                    .filter(Boolean) as string[];

                  const idx = validImages.indexOf(imageUrl);
                  setImageViewerImages(validImages);
                  setImageViewerStartIndex(idx >= 0 ? idx : 0);
                  setImageViewerVisible(true);
                }}
              />
            </div>
          ))}

          {/* Add Custom Item Button */}
          <button
            onClick={() => setShowCustomModal(true)}
            className="nworder-add-custom-btn"
            type="button"
          >
            <PlusCircle size={20} />
            <span>Add Custom Item</span>
          </button>

          {/* Message Input */}
          <div className="nworder-message-section">
            <label className="nworder-message-label">Add a message (optional)</label>
            <textarea
              placeholder="Anything you'd like the seller to know?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              className="nworder-message-input"
            />
            <div className="nworder-message-counter">
              {message.length}/500
            </div>
          </div>

          {/* Footer / Send Section */}
          <footer className="nworder-footer">
            <div className="nworder-total-row">
              <span className="nworder-total-label">Total Amount</span>
              <span className="nworder-total-amount">₦{totalAmount.toLocaleString()}</span>
            </div>

            <SendOrderButton
              shopId={shopId}
              items={items}
              sessionToken={sessionToken}
              message={message}
              isVerified={isVerified}
              onSuccess={handleSuccess}
              onError={handleSendError}
            />
          </footer>
        </div>
      </motion.div>

      {/* Modals */}
      <AddCustomItemModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        shopId={shopId}
        shopName={shopName}
      />

      {/* Image Viewer Placeholder */}
      {imageViewerVisible && (
        <div className="nworder-image-viewer">
          <p>Image viewer placeholder (port FullScreenImageViewer next)</p>
          <button onClick={() => setImageViewerVisible(false)}>Close</button>
        </div>
      )}

      {/* Daily Limit Modal */}
      {limitModalVisible && (
        <div className="nworder-limit-modal">
          <div className="nworder-limit-content">
            <AlertCircle size={64} className="nworder-limit-icon" />
            <h3 className="nworder-limit-title">Daily Limit Reached</h3>
            <p className="nworder-limit-text">
              Free plan allows only 3 orders per day.
            </p>
            <p className="nworder-upgrade-text">Upgrade to send more orders today!</p>

            <div className="nworder-limit-actions">
              <button
                onClick={() => setLimitModalVisible(false)}
                className="nworder-limit-close"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setLimitModalVisible(false);
                  navigate('/shop/Subscription');
                }}
                className="nworder-upgrade-btn"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </PageShell>
  );
}

// SendOrderButton Component (unchanged logic, classNames added)
const SendOrderButton: React.FC<{
  shopId: number;
  items: any[];
  sessionToken: string | null;
  message: string;
  isVerified: boolean | null;
  onSuccess: () => void;
  onError?: (error: any) => boolean;
}> = ({ shopId, items, sessionToken, message, isVerified, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (isVerified === false) {
      window.alert('Verification Required\nOnly verified users can send orders. Please verify your ID to continue.');
      return;
    }

    if (isVerified === null) {
      window.alert('Error\nUnable to verify user status. Please try again.');
      return;
    }

    if (!sessionToken) {
      window.alert('Error\nPlease log in again.');
      return;
    }

    if (items.length === 0) return;

    setLoading(true);

    const form = new FormData();
    form.append('shop_id', shopId.toString());
    form.append('message', message.trim());

    items.forEach((item, i) => {
      const p = `items[${i}]`;
      form.append(`${p}[product_name]`, item.product_name || item.custom_name || 'Item');
      form.append(`${p}[custom_name]`, item.custom_name || '');
      form.append(`${p}[quantity]`, item.quantity.toString());
      form.append(`${p}[proposed_price]`, item.price.toString());
      form.append(`${p}[original_price]`, (item.original_price || item.price).toString());
      form.append(`${p}[image_url]`, item.image || '');
    });

    try {
      const response = await fetch(`${API_BASE}/po/create/`, {
        method: 'POST',
        headers: {
          Authorization: sessionToken || '',
        },
        body: form,
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200));

      let data: any = null;
      try {
        if (responseText.trim().startsWith('{')) {
          data = JSON.parse(responseText);
        }
      } catch {}

      if (!response.ok) {
        const errorMsg = data?.error || responseText || `HTTP ${response.status}`;
        if (onError?.({ response: { data } })) return;
        window.alert(`Send Failed\n${errorMsg}`);
        return;
      }

      window.alert('Order Sent!\nYour order has been sent to the seller.');
      onSuccess();
    } catch (error: any) {
      if (onError?.(error)) return;
      window.alert('Error\nCheck your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className={`nworder-send-btn ${loading ? 'nworder-send-loading' : ''}`}
      type="button"
    >
      {loading ? (
        <span>Sending...</span>
      ) : (
        <>
          <Send size={18} />
          Send Order
        </>
      )}
    </button>
  );
};
