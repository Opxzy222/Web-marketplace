// src/components/cart/SellerFloatingOrb.tsx - MOBILE-OPTIMIZED VERSION

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import '../../css/carts/SellerFloatingOrb.css';

const ORB_SIZE = 65;
const SNAP_MARGIN = 20;
const SAFE_TOP = 100;
const SAFE_BOTTOM = 120;

export const SellerFloatingOrb = () => {
  const [activePOs, setActivePOs] = useState(0);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load shop_id + periodic refresh
  useEffect(() => {
    const loadShopId = () => {
      const sid = localStorage.getItem('shop_id');
      console.log('SELLER ORB: localStorage shop_id →', sid || 'null');
      setShopId(sid && sid !== 'null' ? sid : null);
    };

    loadShopId();
    const interval = setInterval(loadShopId, 15000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (wsRef.current) {
      console.log('SELLER WS: Closing old connection');
      wsRef.current.close();
      wsRef.current = null;
    }

    if (!shopId || shopId === 'null' || shopId.trim() === '') {
      console.log('SELLER WS: No valid shopId → disabled');
      setActivePOs(0);
      return;
    }

    console.log('SELLER WS: Starting connection with shopId →', shopId);

    const connect = () => {
      const currentShopId = shopId;
      if (!currentShopId || currentShopId === 'null') {
        console.log('SELLER WS: shopId became invalid during connect → aborting');
        return;
      }

      const url = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/po/updates/${currentShopId}/`;

      console.log('SELLER WS: CONNECTING →', url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('SELLER WS: CONNECTED');
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'po_update') {
            const count = data.active_count || 0;
            setActivePOs(count);
          }
        } catch (err) {
          console.error('SELLER WS: Parse error:', err);
        }
      };

      ws.onerror = () => {
        console.log('SELLER WS: Connection error');
      };

      ws.onclose = () => {
        console.log('SELLER WS: CLOSED — reconnecting in 2s');
        setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      console.log('SELLER WS: Cleanup — closing connection');
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [shopId]);

  // Pulse animation
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    if (activePOs > 0) {
      const interval = setInterval(() => {
        setPulseScale((prev) => (prev === 1 ? 1.15 : 1));
      }, 600);
      return () => clearInterval(interval);
    } else {
      setPulseScale(1);
    }
  }, [activePOs]);

  const shouldRenderOrb = shopId !== null && shopId !== 'null' && shopId.trim() !== '' && activePOs > 0;

  if (!shouldRenderOrb) {
    return null;
  }

  // Drag props only on desktop
  const dragProps = isMobile ? {} : {
    drag: true,
    dragConstraints: { left: SNAP_MARGIN, right: SNAP_MARGIN, top: SAFE_TOP, bottom: SAFE_BOTTOM },
    dragTransition: { bounceStiffness: 400, bounceDamping: 30, power: 0.25 },
    dragElastic: 0.2,
  };

  return (
    <motion.div
      className="seller-floating-orb"
      animate={{ scale: pulseScale }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      {...dragProps}
      onClick={() => navigate('/cart/seller-dashboard')}
      role="button"
      tabIndex={0}
      aria-label={`Seller dashboard with ${activePOs} active PO${activePOs !== 1 ? 's' : ''}`}
    >
      <div className="seller-orb-inner">
        <Store className="seller-orb-icon" aria-hidden="true" />
        {activePOs > 0 && (
          <motion.div
            className="seller-badge"
            initial={{ scale: 0, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <span>{activePOs > 99 ? '99+' : activePOs}</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
