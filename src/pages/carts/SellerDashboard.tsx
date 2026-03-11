// src/pages/cart/SellerPODashboard.tsx

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import '../../css/carts/SellerPODashboard.css';

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
import axios from 'axios';

const API_BASE = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

type Version = {
  id: string;
  version: number;
  status: string;
  counter_by: string;
  last_counter: 'buyer' | 'seller' | null;
  is_latest: boolean;
  created_at: string;
  message?: string;
};

type PO = {
  id: string;
  buyer_name: string;
  buyer_image_url?: string | null;
  total: string;
  item_count: number;
  status: string;
  version: number;
  last_counter?: 'buyer' | 'seller' | null;
  expires_at?: string | null;
  pickup_expires_at?: string | null;
  pickup_code?: string | null;
  requires_action: boolean;
  updated_at: string;
  versions?: Version[];
};

type TabType = 'pending' | 'all' | 'completed' | 'cancelled';

const getStatusConfig = (po: PO) => {
  if (po.status === 'completed') return { text: 'Completed', color: '#10B981' };
  if (po.status === 'cancelled_by_seller') return { text: 'Cancelled by you', color: '#6B7280' };
  if (po.status === 'rejected') return { text: 'You rejected', color: '#6B7280' };
  if (po.status === 'expired') return { text: 'Offer expired', color: '#6B7280' };
  if (po.status === 'cancelled') return { text: 'Cancelled', color: '#6B7280' };

  if (po.status === 'pickup_pending') return { text: 'Buyer on the way', color: '#10B981' };
  if (po.requires_action && po.status !== 'expired') return { text: 'Your Turn!', color: '#EA580C', pulse: true };
  if (po.last_counter === 'buyer') return { text: 'Customer sent offer', color: '#EA580C' };
  if (po.last_counter === 'seller') return { text: 'You countered', color: '#7C3AED' };
  return { text: 'New Order', color: '#3B82F6' };
};

const getTimerText = (po: PO): string | null => {
  const terminal = ['completed', 'cancelled_by_seller', 'rejected', 'expired', 'cancelled'];
  if (terminal.includes(po.status)) return null;

  const date = po.status === 'pickup_pending' ? po.pickup_expires_at : po.expires_at;
  if (!date) return null;

  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

export default function SellerPODashboard() {
  const navigate = useNavigate();

  const [allPos, setAllPos] = useState<PO[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Load shopId
  useEffect(() => {
    const storedShopId = localStorage.getItem('shop_id');
    setShopId(storedShopId && storedShopId !== 'null' ? storedShopId : null);
  }, []);

  // WebSocket – updates allPos directly
  useEffect(() => {
    if (!shopId) {
      setAllPos([]);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/po/updates/${shopId}/`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => console.log('Seller WS: Connected');
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'po_update' && Array.isArray(data.pos)) {
          // Merge new data into allPos (upsert by id)
          setAllPos((prev) => {
            const map = new Map(prev.map(p => [p.id, p]));
            data.pos.forEach((newPo: PO) => {
              map.set(newPo.id, {
                ...map.get(newPo.id),
                ...newPo,
              });
            });
            const updated = Array.from(map.values());
            // Sort by updated_at descending
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
      console.log('WS closed – reconnecting in 2s');
      setTimeout(() => {
        if (wsRef.current === ws) {
          const newWs = new WebSocket(url);
          wsRef.current = newWs;
        }
      }, 2000);
    };
    ws.onerror = (err) => console.error('WS error:', err);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [shopId]);

  // Load full history (API gives complete list)
  const loadFullHistory = useCallback(async () => {
    if (!shopId) {
      setAllPos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      if (!token) return;

      const res = await axios.get(`${API_BASE}/po/seller/list/?t=${Date.now()}`, {
        headers: { Authorization: token },
      });

      const formatted = (res.data.pos || []).map((p: any): PO => ({
        id: p.id,
        buyer_name: p.buyer_name || 'Customer',
        buyer_image_url: p.buyer_image_url || null,
        total: p.total || '0',
        item_count: p.item_count || 0,
        status: p.status || 'proposed',
        version: p.version || 1,
        last_counter: p.last_counter || null,
        expires_at: p.expires_at,
        pickup_expires_at: p.pickup_expires_at,
        pickup_code: p.pickup_code,
        requires_action: p.requires_action === true,
        updated_at: p.updated_at || new Date().toISOString(),
        versions: p.versions || [],
      }));

      const sorted = formatted.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setAllPos(sorted);
    } catch (err) {
      console.error('Load history failed:', err);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

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
    () => allPos.filter(p => !['completed', 'cancelled_by_seller', 'rejected', 'expired', 'cancelled'].includes(p.status)),
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
    return allPos.filter(p => ['cancelled_by_seller', 'rejected', 'expired', 'cancelled'].includes(p.status));
  }, [activeTab, allPos, pendingPos]);

  if (loading && allPos.length === 0) {
    return (
      <div className="selldshb-full-page-loader">
        <div className="selldshb-loader-spinner"></div>
        <p className="selldshb-loader-text">Loading your orders...</p>
      </div>
    );
  }

  return (
    <PageShell
      title="Space Orders"
      showBackButton={true}
      onBack={() => navigate('/shop/ReceiptActions')}
    >
      <div className="selldshb-page-container">
        {activeCount > 0 && (
          <div className="selldshb-action-orb-container">
            <div className="selldshb-action-orb selldshb-pulse">
              <span className="selldshb-action-orb-number">{activeCount}</span>
            </div>
          </div>
        )}

        <div className="selldshb-tab-bar">
          {(['pending', 'all', 'completed', 'cancelled'] as TabType[]).map(tab => (
            <button
              key={tab}
              className={`selldshb-tab ${activeTab === tab ? 'selldshb-active-tab' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="selldshb-scroll-content">
          {activeTab === 'all' && groupedPos ? (
            groupedPos.length === 0 ? (
              <div className="selldshb-empty">
                <ShoppingCart size={80} className="selldshb-empty-icon" />
                <p className="selldshb-empty-text">No orders yet</p>
              </div>
            ) : (
              groupedPos.map(([date, items]) => (
                <div key={date}>
                  <h3 className="selldshb-date-header">{date}</h3>
                  {items.map(po => (
                    <UltraModernCard key={po.id} po={po} navigate={navigate} />
                  ))}
                </div>
              ))
            )
          ) : filteredPos.length === 0 ? (
            <div className="selldshb-empty">
              <CheckCircle size={80} className="selldshb-empty-icon" />
              <p className="selldshb-empty-text">All caught up!</p>
            </div>
          ) : (
            filteredPos.map(po => <UltraModernCard key={po.id} po={po} navigate={navigate} />)
          )}
        </div>
      </div>
    </PageShell>
  );
};

// UltraModernCard remains the same (just using selldshb- prefix)
const UltraModernCard = ({ po, navigate }: { po: PO; navigate: (path: string) => void }) => {
  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState(po.id);

  const status = getStatusConfig(po);
  const timerText = getTimerText(po);

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId);
    setShowVersions(false);
    navigate("/cart/seller-editor", { state: { poId: selectedVersionId } });
  };

  const hasVersions = Array.isArray(po.versions) && po.versions.length > 1;

  const showActionBadge = po.requires_action && po.status !== 'expired';

  return (
    <div className="selldshb-card-wrapper">
      <div
        className="selldshb-card"
        onClick={() => navigate("/cart/seller-editor", { state: { poId: selectedVersionId } })}
      >
        <div className="selldshb-card-header">
          <div className="selldshb-buyer-row">
            <div className="selldshb-avatar">
              {po.buyer_image_url ? (
                <img src={po.buyer_image_url} alt="Buyer" className="selldshb-avatar-image" />
              ) : (
                <div className="selldshb-avatar-placeholder">
                  <span>?</span>
                </div>
              )}
            </div>
            <div className="selldshb-buyer-info">
              <h4 className="selldshb-buyer-name">{po.buyer_name}</h4>
              <p className="selldshb-meta">{po.item_count} items</p>
            </div>
          </div>

          {hasVersions && (
            <button
              className="selldshb-version-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowVersions(v => !v);
              }}
            >
              <span className="selldshb-version-text">v{po.version}</span>
            </button>
          )}
        </div>

        <div className="selldshb-price">₦{parseFloat(po.total).toLocaleString()}</div>

        <div className="selldshb-status-row">
          <div className="selldshb-status-box">
            <div className="selldshb-status-dot" style={{ backgroundColor: status.color }} />
            <span className="selldshb-status-text" style={{ color: status.color }}>
              {status.text}
            </span>
          </div>

          {timerText && (
            <div
              className={`selldshb-timer-pill ${timerText === 'Expired' ? 'selldshb-timer-expired' : ''}`}
            >
              <Clock size={12} />
              <span className="selldshb-timer-text">{timerText}</span>
            </div>
          )}
        </div>

        {showActionBadge && (
          <div className="selldshb-action-badge">
            <span className="selldshb-action-text">ACTION REQUIRED</span>
          </div>
        )}
      </div>

      {showVersions && hasVersions && (
        <div className="selldshb-version-dropdown">
          {po.versions!.map(v => (
            <button
              key={v.id}
              className={`selldshb-version-item ${v.id === selectedVersionId ? 'selldshb-current-version' : ''}`}
              onClick={() => handleVersionSelect(v.id)}
            >
              <div className="selldshb-version-info">
                <div className="selldshb-version-label">
                  v{v.version} • {v.counter_by}
                  {v.is_latest && <span className="selldshb-latest-badge">Latest</span>}
                </div>
                {v.message && (
                  <p className="selldshb-version-message">“{v.message}”</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};