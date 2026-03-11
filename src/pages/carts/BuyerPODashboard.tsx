// src/pages/cart/BuyerPODashboard.tsx

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import '../../css/carts/BuyerPODashboard.css'; 
import axios from 'axios';

import { format, isToday, isYesterday, parseISO } from 'date-fns';

import {
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Eye,
  Navigation,
  ShoppingCart,
  Image as LucideImage,
} from 'lucide-react';

const API_BASE = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

type PO = {
  id: string;
  shop_name: string;
  shop_image_url?: string | null;
  total: string;
  item_count: number;
  status: string;
  version: number;
  last_counter?: 'buyer' | 'seller' | null;
  expires_at?: string | null;
  pickup_expires_at?: string | null;
  pickup_code?: string | null;
  show_pickup_code: boolean;
  requires_action: boolean;
  updated_at: string;
};

type TabType = 'all' | 'pending' | 'completed' | 'cancelled';

const getStatusConfig = (po: PO) => {
  if (po.status === 'completed') return { text: 'Completed', color: '#10B981' };
  if (po.status === 'cancelled') return { text: 'Cancelled by you', color: '#6B7280' };
  if (po.status === 'cancelled_by_seller') return { text: 'Seller cancelled', color: '#EF4444' };
  if (po.status === 'rejected') return { text: 'Seller rejected', color: '#EF4444' };
  if (po.status === 'expired') return { text: 'Offer expired', color: '#6B7280' };

  if (po.status === 'pickup_pending') return { text: 'Ready for Pickup', color: '#10B981' };
  if (po.requires_action && po.status !== 'expired') return { text: 'Your Turn!', color: '#DC2626', pulse: true };
  if (po.last_counter === 'buyer') return { text: 'You countered', color: '#7C3AED' };
  if (po.last_counter === 'seller') return { text: 'Seller countered', color: '#EA580C' };
  return { text: 'Waiting for seller', color: '#2563EB' };
};

const getTimerText = (po: PO): string | null => {
  const terminal = ['completed', 'cancelled', 'cancelled_by_seller', 'rejected', 'expired'];
  if (terminal.includes(po.status)) return null;

  const date = po.status === 'pickup_pending' ? po.pickup_expires_at : po.expires_at;
  if (!date) return null;

  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

export default function BuyerPODashboard() {
  const navigate = useNavigate();

  const [allPos, setAllPos] = useState<PO[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Load userId from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    setUserId(storedUserId && storedUserId !== 'null' ? storedUserId : null);
  }, []);

  // WebSocket – real-time pending + pickup_pending updates
  useEffect(() => {
    if (!userId) {
      setAllPos([]);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${API_BASE.replace('https://', '').replace('http://', '')}/ws/po/buyer/${userId}/`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => console.log('Buyer Dashboard WS: Connected');
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'po_update' && Array.isArray(data.pos)) {
          // Merge new/updated POs into allPos
          setAllPos((prev) => {
            const map = new Map(prev.map(p => [p.id, p]));
            data.pos.forEach((newPo: PO) => {
              map.set(newPo.id, {
                ...map.get(newPo.id),
                ...newPo,
              });
            });
            const updated = Array.from(map.values());
            return updated.sort((a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          });
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };
    ws.onclose = () => {
      console.log('Buyer WS closed – reconnecting in 2s');
      setTimeout(() => {
        if (wsRef.current === ws) {
          const newWs = new WebSocket(url);
          wsRef.current = newWs;
        }
      }, 2000);
    };
    ws.onerror = (err) => console.error('Buyer WS error:', err);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [userId]);

  // Load full history from API
  const loadFullHistory = useCallback(async () => {
    if (!userId) {
      setAllPos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      if (!token) return;

      const res = await axios.get(`${API_BASE}/po/buyer/list/?t=${Date.now()}`, {
        headers: { Authorization: token },
      });

      const formatted = (res.data.pos || []).map((p: any): PO => ({
        id: p.id,
        shop_name: p.shop_name || 'Unknown Shop',
        shop_image_url: p.shop_image_url || null,
        total: p.total || '0',
        item_count: p.item_count || 0,
        status: p.status || 'proposed',
        version: p.version || 1,
        last_counter: p.last_counter || null,
        expires_at: p.expires_at,
        pickup_expires_at: p.pickup_expires_at,
        pickup_code: p.pickup_code,
        show_pickup_code: p.show_pickup_code || false,
        requires_action: p.requires_action === true,
        updated_at: p.updated_at || new Date().toISOString(),
      }));

      const sorted = formatted.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setAllPos(sorted);
    } catch (err) {
      console.error('Buyer history load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFullHistory();
  }, [loadFullHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFullHistory().finally(() => setRefreshing(false));
  };

  // Derived values from allPos
  const activeCount = useMemo(
    () => allPos.filter(p => p.requires_action && p.status !== 'expired').length,
    [allPos]
  );

  const pendingPos = useMemo(
    () => allPos.filter(p => !['completed', 'cancelled', 'cancelled_by_seller', 'rejected', 'expired'].includes(p.status)),
    [allPos]
  );

  const groupedPos = useMemo(() => {
    if (activeTab !== 'all') return null;

    const groups: { [key: string]: PO[] } = {};
    allPos.forEach(po => {
      const date = parseISO(po.updated_at);
      let key: string;

      if (isToday(date)) key = 'Today';
      else if (isYesterday(date)) key = 'Yesterday';
      else key = format(date, 'MMMM d, yyyy');

      if (!groups[key]) groups[key] = [];
      groups[key].push(po);
    });

    return Object.entries(groups);
  }, [allPos, activeTab]);

  const filteredPos = useMemo(() => {
    if (activeTab === 'all') return allPos;
    if (activeTab === 'pending') return pendingPos;
    if (activeTab === 'completed') return allPos.filter(p => p.status === 'completed');
    return allPos.filter(p => ['cancelled', 'cancelled_by_seller', 'rejected', 'expired'].includes(p.status));
  }, [activeTab, allPos, pendingPos]);

  if (loading && allPos.length === 0) {
    return (
      <div className="buydshb-full-page-loader">
        <div className="buydshb-loader-spinner"></div>
        <p className="buydshb-loader-text">Loading your orders...</p>
      </div>
    );
  }

  return (
    <PageShell
      title="Your Orders"
      showBackButton={true}
      onBack={() => navigate('/account')} // adjust to your account/tabs route
    >
      <div className="buydshb-page-container">
        {activeCount > 0 && (
          <div className="buydshb-action-orb-container">
            <div className="buydshb-action-orb buydshb-pulse">
              <span className="buydshb-action-orb-number">{activeCount}</span>
            </div>
          </div>
        )}

        <div className="buydshb-tab-bar">
          {(['all', 'pending', 'completed', 'cancelled'] as TabType[]).map(tab => (
            <button
              key={tab}
              className={`buydshb-tab ${activeTab === tab ? 'buydshb-active-tab' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="buydshb-scroll-content">
          {activeTab === 'all' && groupedPos ? (
            groupedPos.length === 0 ? (
              <div className="buydshb-empty">
                <ShoppingCart size={80} className="buydshb-empty-icon" />
                <p className="buydshb-empty-text">No orders yet</p>
              </div>
            ) : (
              groupedPos.map(([date, items]) => (
                <div key={date}>
                  <h3 className="buydshb-date-header">{date}</h3>
                  {items.map(po => (
                    <UltraCompactCard key={po.id} po={po} navigate={navigate} />
                  ))}
                </div>
              ))
            )
          ) : filteredPos.length === 0 ? (
            <div className="buydshb-empty">
              <CheckCircle size={80} className="buydshb-empty-icon" />
              <p className="buydshb-empty-text">All caught up!</p>
            </div>
          ) : (
            filteredPos.map(po => <UltraCompactCard key={po.id} po={po} navigate={navigate} />)
          )}
        </div>
      </div>
    </PageShell>
  );
}

const UltraCompactCard = ({ po, navigate }: { po: PO; navigate: (path: string, options?: any) => void }) => {
  const status = getStatusConfig(po);
  const timerText = getTimerText(po);

  const showActionBadge = po.requires_action && !['expired', 'completed', 'cancelled', 'cancelled_by_seller', 'rejected'].includes(po.status);

  return (
    <div className="buydshb-card-wrapper">
      <div
        className="buydshb-card"
        onClick={() => navigate('/cart/buyer-editor', { state: { poId: po.id } })}
      >
        {/* Shop info row – full width for shop name */}
        <div className="buydshb-shop-row">
          <div className="buydshb-shop-avatar">
            {po.shop_image_url ? (
              <img src={po.shop_image_url} alt="Shop" className="buydshb-shop-image" />
            ) : (
              <div className="buydshb-shop-placeholder">
                <span>?</span>
              </div>
            )}
          </div>

          <div className="buydshb-shop-info">
            <h4 className="buydshb-shop-name">{po.shop_name}</h4>
            <p className="buydshb-meta">{po.item_count} items • v{po.version}</p>
          </div>
        </div>

        {/* Price – directly underneath shop name/meta */}
        <div className="buydshb-price-row">
          <div className="buydshb-price">₦{parseFloat(po.total).toLocaleString()}</div>
        </div>

        {/* Status & Timer row */}
        <div className="buydshb-middle-row">
          <div className="buydshb-status-box">
            <div className="buydshb-status-dot" style={{ backgroundColor: status.color }} />
            <span className="buydshb-status-text" style={{ color: status.color }}>
              {status.text}
            </span>
          </div>

          {timerText && (
            <div
              className={`buydshb-timer-pill ${timerText === 'Expired' ? 'buydshb-timer-expired' : ''}`}
            >
              <Clock size={12} />
              <span className="buydshb-timer-text">{timerText}</span>
            </div>
          )}
        </div>

        {/* Pickup code badge (if applicable) */}
        {po.status === 'pickup_pending' && po.show_pickup_code && po.pickup_code && (
          <div className="buydshb-pickup-badge">
            <Eye size={14} />
            <span className="buydshb-pickup-label">Code:</span>
            <span className="buydshb-pickup-code">{po.pickup_code}</span>
          </div>
        )}

        {/* Action required badge */}
        {showActionBadge && (
          <div className="buydshb-action-badge">
            <span className="buydshb-action-text">ACTION REQUIRED</span>
          </div>
        )}
      </div>
    </div>
  );
};