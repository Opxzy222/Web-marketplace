// src/components/cart/FloatingCartOrb.tsx - MOBILE-OPTIMIZED VERSION

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../../contexts/CartContext';
import { ShopSelectorModal } from './ShopSelectorModal';
import { ShoppingCart } from 'lucide-react';
import '../../css/carts/FloatingCartOrb.css';

const ORB_SIZE = 60;
const SNAP_MARGIN = 20;
const SAFE_BOTTOM = 120;

export const FloatingCartOrb = () => {
  const { getShopIds, totalItems } = useCart();
  const [shopCount, setShopCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Latest server POs (from WebSocket)
  const latestPOsRef = useRef<any[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 6;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load user_id once
  useEffect(() => {
    const uid = localStorage.getItem('user_id');
    if (uid) setUserId(uid);
  }, []);

  // WebSocket connection (unchanged)
  useEffect(() => {
    if (!userId) return;

    const connect = () => {
      const url = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/po/buyer/${userId}/`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Buyer WS connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Buyer WS ←', data);

          if (data.type === 'po_update' && Array.isArray(data.pos)) {
            latestPOsRef.current = data.pos;
            updateShopCount();
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      ws.onerror = (e) => console.error('WS error:', e);

      ws.onclose = (e) => {
        console.log('WS closed:', e.code, e.reason);

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
          console.log(`Reconnect in ${delay}ms (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId]);

  // Core shop count logic
  const updateShopCount = () => {
    const cartShopIds = new Set(getShopIds().map(String));
    const poShopIds = new Set(
      latestPOsRef.current
        .map((po) => po.shop_id?.toString() || po.shopId?.toString())
        .filter(Boolean)
    );
    const totalUnique = new Set([...cartShopIds, ...poShopIds]).size;

    console.log('Shop count updated →', totalUnique, '(cart:', cartShopIds.size, 'POs:', poShopIds.size, ')');

    setShopCount(totalUnique);
  };

  // Update from local cart
  useEffect(() => {
    const localCount = getShopIds().length;
    setShopCount((prev) => Math.max(prev, localCount));
    updateShopCount();
  }, [getShopIds]);

  // Hide only if no shops
  if (shopCount === 0) return null;

  const dragProps = isMobile ? {} : {
    drag: true,
    dragConstraints: { left: 20, right: 20, top: 100, bottom: 120 },
    dragTransition: { bounceStiffness: 400, bounceDamping: 30, power: 0.25 },
    dragElastic: 0.2,
  };

  return (
    <>
      <motion.div
        className="floating-orb"
        style={{
          zIndex: 9999,
        }}
        animate={{
          scale: [1, 1.08, 1],
          transition: { scale: { duration: 3, repeat: Infinity, repeatType: 'reverse' } },
        }}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        {...dragProps}
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        aria-label={`Shopping cart with ${shopCount} active shop${shopCount !== 1 ? 's' : ''} — ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
      >
        <div className="orb-inner">
          <ShoppingCart className="orb-icon" aria-hidden="true" />
          {shopCount > 0 && (
            <motion.div
              className="badge"
              initial={{ scale: 0, y: -10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <span>{shopCount}</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      <ShopSelectorModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        activePOs={shopCount}
        totalItems={totalItems}
      />
    </>
  );
};
