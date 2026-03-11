// src/components/cart/ShopSelectorModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import axios from 'axios';
import {
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  ArrowRightCircle,
  X,
  Loader2,
} from 'lucide-react';
import '../../css/carts/ShopSelectorModal.css';

type CartShop = {
  shopId: string;
  shopName: string;
  itemCount: number;
  totalAmount: number;
  type: 'cart';
};

type POShop = {
  shopId: string;
  shopName: string;
  itemCount: number;
  totalAmount: number;
  poId: string;
  status: 'proposed' | 'countered' | 'pickup_pending';
  type: 'po';
  last_counter?: 'buyer' | 'seller' | null;
  pickup_code?: string | null;
  _hasLocalItems?: boolean;
};

type Shop = CartShop | POShop;

type Props = {
  visible: boolean;
  onClose: () => void;
  activePOs?: number;
  totalItems?: number;
};

export const ShopSelectorModal = ({
  visible,
  onClose,
  activePOs = 0,
  totalItems = 0,
}: Props) => {
  const { items } = useCart();
  const navigate = useNavigate();

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [buyerPOs, setBuyerPOs] = useState<POShop[]>([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  // Load token once
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    setSessionToken(token);
  }, []);

  // Fetch active POs when modal becomes visible
  useEffect(() => {
    if (!visible || !sessionToken) return;

    const fetchPOs = async () => {
      setLoadingPOs(true);
      try {
        const res = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/po/buyer/list/', {
          headers: { Authorization: sessionToken },
        });

        const active = (res.data.pos || [])
          .filter((p: any) =>
            ['proposed', 'countered', 'pickup_pending'].includes(p.status)
          )
          .map((p: any): POShop => ({
            shopId: String(p.shop_id || p.shop?.id || 'unknown').trim(),
            shopName: p.shop_name || p.shop__name || 'Unknown Shop',
            itemCount: p.item_count || 0,
            totalAmount: parseFloat(p.total) || 0,
            poId: p.id,
            status: p.status,
            type: 'po',
            last_counter: p.last_counter,
            pickup_code: p.pickup_code || null,
          }))
          .filter(
            (po) =>
              po.shopId && po.shopId !== 'unknown' && po.shopId !== 'null'
          );

        setBuyerPOs(active);
      } catch (e) {
        console.error('Failed to load buyer POs', e);
      } finally {
        setLoadingPOs(false);
      }
    };

    fetchPOs();
  }, [visible, sessionToken]);

  const cartKey = useMemo(
    () =>
      JSON.stringify(
        items.map((i) => `${i.shopId}-${i.id}-${i.quantity}-${i.price}`)
      ),
    [items]
  );

  const cartShops = useMemo(() => {
    const map = new Map<string, CartShop>();
    items.forEach((i) => {
      const key = String(i.shopId).trim();
      if (!key || key === 'undefined' || key === 'null') return;

      const amount = i.price * i.quantity;
      const existing = map.get(key);

      if (existing) {
        existing.itemCount += 1;
        existing.totalAmount += amount;
      } else {
        map.set(key, {
          shopId: key,
          shopName: i.shopName,
          itemCount: 1,
          totalAmount: amount,
          type: 'cart',
        });
      }
    });
    return Array.from(map.values());
  }, [cartKey]);

  const allShops: Shop[] = useMemo(() => {
    const result: Shop[] = [];

    // 1. Active negotiations (proposed / countered) — merge with local cart if any
    buyerPOs
      .filter((po) => ['proposed', 'countered'].includes(po.status))
      .forEach((po) => {
        const cartForShop = cartShops.find((c) => c.shopId === po.shopId);
        if (cartForShop && cartForShop.itemCount > 0) {
          result.push({
            ...po,
            itemCount: po.itemCount + cartForShop.itemCount,
            totalAmount: po.totalAmount + cartForShop.totalAmount,
            _hasLocalItems: true,
          });
        } else {
          result.push(po);
        }
      });

    // 2. Pure cart shops (no active negotiation/PO)
    cartShops.forEach((cartShop) => {
      const hasActivePO = buyerPOs.some(
        (po) =>
          po.shopId === cartShop.shopId &&
          ['proposed', 'countered'].includes(po.status)
      );
      if (!hasActivePO) {
        result.push(cartShop);
      }
    });

    // 3. Pickup pending — always last, no merging
    buyerPOs
      .filter((po) => po.status === 'pickup_pending')
      .forEach((po) => result.push(po));

    // Priority sort (exact same order as RN)
    return result.sort((a, b) => {
      const aTurn = a.type === 'po' && (a as POShop).last_counter === 'seller';
      const bTurn = b.type === 'po' && (b as POShop).last_counter === 'seller';
      if (aTurn && !bTurn) return -1;
      if (!aTurn && bTurn) return 1;

      const aPickup =
        a.type === 'po' && (a as POShop).status === 'pickup_pending';
      const bPickup =
        b.type === 'po' && (b as POShop).status === 'pickup_pending';
      if (aPickup && !bPickup) return -1;
      if (!aPickup && bPickup) return 1;

      return 0;
    });
  }, [buyerPOs, cartShops]);

  const openShop = (shop: Shop) => {
    onClose();
    if (shop.type === 'cart') {
      // Fresh/new order → new order editor
      navigate("/cart/editor", { state: { shopId: shop.shopId } })
    } else {
      // Active order (proposed, countered, or pickup_pending) → active editor
      // For active PO (buyer-editor)
      navigate("/cart/buyer-editor", { state: { poId: (shop as POShop).poId } });
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="shpslt-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="shpslt-modal-container"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shpslt-modal-card">
              {/* Header */}
              <div className="shpslt-header">
                <div className="shpslt-title-container">
                  <h2 className="shpslt-title">Your Active Orders</h2>
                  <p className="shpslt-subtitle">
                    {totalItems > 0 &&
                      `${totalItems} item${totalItems > 1 ? 's' : ''} in cart`}
                    {totalItems > 0 && activePOs > 0 && '  •  '}
                    {activePOs > 0 &&
                      `${activePOs} active negotiation${
                        activePOs > 1 ? 's' : ''
                      }`}
                  </p>
                </div>
                <button className="shpslt-close-x-button" onClick={onClose}>
                  <X size={28} color="#475569" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="shpslt-scroll-container">
                {loadingPOs ? (
                  <div className="shpslt-loader">
                    <Loader2 className="shpslt-spinner" size={48} />
                    <p className="shpslt-loader-text">Loading your orders…</p>
                  </div>
                ) : allShops.length === 0 ? (
                  <div className="shpslt-empty">
                    <ShoppingCart size={90} color="#94A3B8" strokeWidth={1.2} />
                    <h3 className="shpslt-empty-title">All clear!</h3>
                    <p className="shpslt-empty-subtitle">
                      No active orders or cart items
                    </p>
                  </div>
                ) : (
                  allShops.map((shop, idx) => (
                    <ShopRow
                      key={`${shop.shopId}-${shop.type}-${idx}`}
                      shop={shop}
                      index={idx}
                      onPress={() => openShop(shop)}
                    />
                  ))
                )}
              </div>

              {/* Bottom Close */}
              <button className="shpslt-bottom-close-button" onClick={onClose}>
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ShopRow = React.memo(
  ({ shop, index, onPress }: { shop: Shop; index: number; onPress: () => void }) => {
    const isPickup = shop.type === 'po' && shop.status === 'pickup_pending';
    const hasLocalItems = (shop as any)._hasLocalItems;

    let badgeText: string;
    let badgeColor: string;
    let BadgeIcon: React.ComponentType<any> | null = null;

    if (shop.type === 'cart') {
      badgeText = 'New Order';
      badgeColor = '#3B82F6';
      BadgeIcon = ShoppingCart;
    } else if (isPickup) {
      badgeText = 'Ready!';
      badgeColor = '#10B981';
      BadgeIcon = CheckCircle;
    } else if (hasLocalItems) {
      badgeText = 'Updated';
      badgeColor = '#F59E0B';
      BadgeIcon = AlertCircle;
    } else if (shop.last_counter === 'seller') {
      badgeText = 'Your Turn!';
      badgeColor = '#DC2626';
      BadgeIcon = ArrowRightCircle;
    } else if (shop.last_counter === 'buyer') {
      badgeText = 'You Countered';
      badgeColor = '#7C3AED';
      BadgeIcon = ArrowRightCircle;
    } else {
      badgeText = 'Waiting';
      badgeColor = '#64748B';
      BadgeIcon = null;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.08,
          duration: 0.4,
          type: 'spring',
          damping: 20,
        }}
        className="shpslt-shop-card"
        onClick={onPress}
      >
        <div className="shpslt-card-content">
          {/* Shop Name */}
          <h3 className="shpslt-shop-name">{shop.shopName}</h3>

          {/* Badge */}
          <div className="shpslt-badge-container">
            <div className="shpslt-badge" style={{ backgroundColor: badgeColor }}>
              {BadgeIcon && React.createElement(BadgeIcon, { size: 16, color: '#FFF' })}
              <span className="shpslt-badge-text">{badgeText}</span>
            </div>
          </div>

          {/* Price + Count */}
          <div className="shpslt-card-body">
            <span className="shpslt-item-count">
              {shop.itemCount} item{shop.itemCount > 1 ? 's' : ''}
            </span>
            <span className="shpslt-price">
              ₦{shop.totalAmount.toLocaleString()}
            </span>
          </div>

          {/* Pickup Info */}
          {isPickup && (shop as POShop).pickup_code && (
            <div className="shpslt-pickup-box">
              <CheckCircle size={22} color="#10B981" />
              <span className="shpslt-pickup-label">Pickup Code:</span>
              <span className="shpslt-pickup-code">
                {(shop as POShop).pickup_code}
              </span>
            </div>
          )}

          {/* Status Hint */}
          {!isPickup && (
            <p className="shpslt-status-hint">
              {shop.type === 'cart'
                ? 'Ready to send • Tap to review & send'
                : hasLocalItems
                ? 'New items added • Tap to continue'
                : shop.last_counter === 'seller'
                ? 'Seller countered • Your turn to respond'
                : shop.last_counter === 'buyer'
                ? 'You countered • Waiting for seller'
                : 'Waiting for seller response'}
            </p>
          )}
        </div>
      </motion.div>
    );
  }
);

export default ShopSelectorModal;