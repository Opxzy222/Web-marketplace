// src/pages/cart/BuyerPOEditor.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../contexts/CartContext';
import '../../css/carts/BuyerPOEditor.css';
import BuyerPOHeader from '../../components/carts/EditorHeader';

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

type Version = {
  id: string;
  version: number;
  status: string;
  total: string;
  counter_by: string;
  last_counter: 'buyer' | 'seller' | null;
  is_latest: boolean;
  created_at: string;
  message?: string;
  items: Array<{
    product_name: string | null;
    custom_name?: string | null;
    quantity: number;
    original_price: string;
    proposed_price: string;
    total_price: string;
    change_type: string;
    added_by: 'buyer' | 'seller';
    last_changed_by?: 'buyer' | 'seller' | null;   // ← NEW FIELD
    image_url?: string | null;
    custom_image_url?: string | null;
    _from_cart?: boolean;
    note?: string;
  }>;
};

export default function BuyerPOEditor() {
  const location = useLocation();
  const poId = location.state?.poId as string | undefined;
  const navigate = useNavigate();
  const { getShopItems } = useCart();

  const [po, setPo] = useState<any>(null);
  const [allVersions, setAllVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [rootPoId, setRootPoId] = useState<string | null>(null);
  const [manuallySelectedVersionId, setManuallySelectedVersionId] = useState<string | null>(null);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);

  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([]);
  const [imageViewerStartIndex, setImageViewerStartIndex] = useState(0);

  // Load session token
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    setSessionToken(token);
  }, []);

  // Fake original version for single-version pickup_pending orders
  useEffect(() => {
    if (allVersions.length === 1 && po?.status === 'pickup_pending') {
      const accepted = allVersions[0];
      const fake: Version = {
        ...accepted,
        id: accepted.id + '_fake_v1',
        version: Math.max(1, accepted.version - 1),
        status: 'countered',
        counter_by: 'You (Original Offer)',
        is_latest: false,
        items: [...accepted.items],
      };
      setAllVersions([fake, accepted]);
      setSelectedVersionId(accepted.id);
    }
  }, [allVersions, po?.status]);

  const fetchFullThread = useCallback(async () => {
    if (!poId || !sessionToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setAllVersions([]);
      setPo(null);
      setSelectedVersionId('');

      const res = await axios.get(`${API_BASE}/po/buyer/detail/${poId}/`, {
        headers: { Authorization: sessionToken },
      });

      const incomingPo = res.data.po;
      const incomingVersions: Version[] = res.data.versions || [];
      const latest = incomingVersions.find((v) => v.is_latest);

      if (!latest) throw new Error('No latest version found');

      setRootPoId(latest.id);

      const fullRes = await axios.get(`${API_BASE}/po/buyer/detail/${latest.id}/`, {
        headers: { Authorization: sessionToken },
      });

      const fullPo = fullRes.data.po;
      const fullVersions: Version[] = fullRes.data.versions || [];
      const sorted = [...fullVersions].sort((a, b) => a.version - b.version);

      setPo(fullPo);
      setAllVersions(sorted);

      if (!manuallySelectedVersionId) {
        const useLatest = ['completed', 'pickup_pending'].includes(fullPo.status);
        setSelectedVersionId(useLatest ? latest.id : poId);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      alert(err.response?.data?.error || 'Failed to load offer');
      navigate('/cart/buyer-dashboard');
    } finally {
      setLoading(false);
    }
  }, [poId, sessionToken, navigate, manuallySelectedVersionId]);

  useEffect(() => {
    fetchFullThread();
  }, [fetchFullThread]);

  // ──────────────────────────────────────────────
  //  NEW: Determine badge label using last_changed_by
  // ──────────────────────────────────────────────
  const getPriceChangeBadge = (item: Version['items'][number]) => {
    // Items added from cart (not part of negotiation yet)
    if (item._from_cart) {
      return { text: 'You added from cart', color: '#166534', bg: '#DCFCE7' };
    }

    // Custom items
    if (item.change_type === 'custom' || item.custom_name) {
      return { text: 'Custom item', color: '#7C3AED', bg: '#E9D5FF' };
    }

    // Price changed during negotiation
    if (item.last_changed_by) {
      if (item.last_changed_by === 'buyer') {
        return { text: 'You changed price', color: '#3B82F6', bg: '#DBEAFE' };
      } else if (item.last_changed_by === 'seller') {
        return { text: 'Seller changed price', color: '#EA580C', bg: '#FFEDD5' };
      }
    }

    // No change badge if last_changed_by is null/undefined
    return null;
  };

  const currentVersion = useMemo(
    () => allVersions.find((v) => v.id === selectedVersionId) || allVersions[allVersions.length - 1],
    [allVersions, selectedVersionId]
  );

  const latestVersion = useMemo(
    () => allVersions.find((v) => v.is_latest) || allVersions[allVersions.length - 1],
    [allVersions]
  );

  const isViewingOldVersion = selectedVersionId !== latestVersion?.id;
  const isNegotiating = currentVersion && ['proposed', 'countered'].includes(currentVersion.status);
  const canAccept = po?.can_accept === true;
  const terminalStatuses = ['completed', 'cancelled', 'cancelled_by_seller', 'rejected', 'expired'];
  const isTerminalStatus = terminalStatuses.includes(po?.status) || po?.is_expired === true;
  const showActionButtons =
    !isViewingOldVersion && isNegotiating && po?.status !== 'pickup_pending' && !isTerminalStatus;

  const displayItems = useMemo(() => {
    if (!po || !currentVersion) return [];

    if (!['proposed', 'countered'].includes(currentVersion.status)) {
      return currentVersion.items;
    }

    const shopId = po.shop_id || po.shop?.id;
    if (!shopId) return currentVersion.items;

    const localItems = getShopItems(shopId);
    if (!localItems.length) return currentVersion.items;

    const merged = [...currentVersion.items];

    localItems.forEach((item) => {
      const exists = merged.some((s) => {
        const sName = s.custom_name || s.product_name;
        const lName = item.custom_name || item.product_name;
        return sName === lName;
      });

      if (!exists) {
        merged.push({
          product_name: item.product_name || item.custom_name || 'Item',
          custom_name: item.custom_name,
          quantity: item.quantity,
          original_price: (item.original_price ?? item.price ?? 0).toString(),
          proposed_price: item.price?.toString() ?? '0',
          total_price: (item.price * item.quantity).toString(),
          change_type: 'original',
          image_url: item.image || null,
          custom_image_url: null,
          added_by: 'buyer',
          _from_cart: true,
          note: item.note || '',
          last_changed_by: null, // cart items aren't negotiated yet
        });
      }
    });

    return merged;
  }, [po, currentVersion, getShopItems]);

  // Pickup countdown timer
  useEffect(() => {
    if (!po?.pickup_info?.expires_in_seconds || po?.status !== 'pickup_pending') return;

    const start = Date.now();
    const duration = po.pickup_info.expires_in_seconds;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, duration - elapsed);

      if (left === 0) {
        setTimeLeft('Expired');
        clearInterval(timer);
        return;
      }

      const h = String(Math.floor(left / 3600)).padStart(2, '0');
      const m = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
      const s = String(left % 60).padStart(2, '0');
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [po?.pickup_info?.expires_in_seconds, po?.status]);

  const handleVersionSelect = (versionId: string) => {
    setManuallySelectedVersionId(versionId);
    setShowVersions(false);
  };

  if (loading || !currentVersion || allVersions.length === 0) {
    return (
      <div className="buyeditr-full-page-loader">
        <div className="buyeditr-loader-spinner"></div>
        <p className="buyeditr-loader-text">Loading your offer...</p>
      </div>
    );
  }

  return (
    <div className="buyeditr-page-container">
      {/* Header with version selector */}
      <BuyerPOHeader
        shopName={po?.shop_name || 'Shop'}
        shopId={po?.shop_id}
        currentVersion={currentVersion}
        allVersions={allVersions}
        selectedVersionId={selectedVersionId}
        showVersions={showVersions}
        setShowVersions={setShowVersions}
        onVersionSelect={handleVersionSelect}
        onBack={() => navigate('/cart/buyer-dashboard')}
      />

      <main className="buyeditr-main-content">
        {/* Old version warning */}
        {isViewingOldVersion && (
          <div className="buyeditr-old-version-banner">
            <AlertCircle size={20} />
            <span>Viewing older version • Actions disabled</span>
          </div>
        )}

        {/* Message bubble */}
        {currentVersion.message && (
          <div
            className={`buyeditr-message-bubble buyeditr-message-${
              currentVersion.last_counter === 'seller' ? 'seller' : 'buyer'
            }`}
          >
            <div className="buyeditr-message-header">
              <span className="buyeditr-message-sender">
                {currentVersion.last_counter === 'seller' ? po?.shop_name || 'Seller' : 'You'}
              </span>
              <span className="buyeditr-message-version">v{currentVersion.version}</span>
            </div>
            <div
              className="buyeditr-message-text"
              onClick={() => setShowFullMessage((prev) => !prev)}
            >
              "{currentVersion.message}"
            </div>
          </div>
        )}

        {/* Pickup ready card */}
        {po?.status === 'pickup_pending' && currentVersion.is_latest && (
          <div className="buyeditr-pickup-card">
            <div className="buyeditr-pickup-header">
              <CheckCircle size={32} className="buyeditr-success-icon" />
              <h3 className="buyeditr-pickup-title">READY FOR PICKUP!</h3>
            </div>

            <div className="buyeditr-pickup-code-row">
              <span className="buyeditr-code-label">Code:</span>
              <span className="buyeditr-pickup-code">{po.pickup_info.pickup_code}</span>
            </div>

            <div className="buyeditr-timer-row">
              <Clock size={20} />
              <span className="buyeditr-timer-text">{timeLeft}</span>
            </div>

            <div className="buyeditr-address-row">
              <MapPin size={18} />
              <span className="buyeditr-address-text">
                {po.pickup_info.shop_address || 'Address not provided'}
              </span>
            </div>

            <button className="buyeditr-view-items-btn" onClick={() => setShowPreviewSheet(true)}>
              <Eye size={22} />
              <span>View All Items</span>
            </button>

            <button
              className="buyeditr-map-btn"
              onClick={() => {
                const geo = po.pickup_info?.geo_location;
                if (geo?.latitude && geo?.longitude) {
                  window.open(`https://maps.google.com/?q=${geo.latitude},${geo.longitude}`);
                } else {
                  alert('Location not available');
                }
              }}
            >
              <Navigation size={18} />
              <span>Open in Maps</span>
            </button>
          </div>
        )}

        {/* Items list */}
        <div className="buyeditr-items-container">
          {displayItems.length === 0 ? (
            <div className="buyeditr-empty-items">
              <ShoppingCart size={80} className="buyeditr-empty-icon" />
              <p className="buyeditr-empty-text">No items in this offer</p>
            </div>
          ) : (
            displayItems.map((item, idx) => {
              const badgeInfo = getPriceChangeBadge(item);
              const priceChanged = !!item.last_changed_by; // if someone changed it
              const itemImage = item.custom_image_url || item.image_url;

              return (
                <div key={idx} className="buyeditr-compact-card">
                  <div className="buyeditr-compact-image-wrapper">
                    {itemImage ? (
                      <button
                        className="buyeditr-image-btn"
                        onClick={() => {
                          const validImages = displayItems
                            .map((it) => it.custom_image_url || it.image_url)
                            .filter(Boolean) as string[];
                          const index = validImages.indexOf(itemImage);
                          setImageViewerImages(validImages);
                          setImageViewerStartIndex(index >= 0 ? index : 0);
                          setImageViewerVisible(true);
                        }}
                      >
                        <img src={itemImage} alt="Item" className="buyeditr-compact-image" />
                      </button>
                    ) : (
                      <div className="buyeditr-compact-placeholder">
                        <LucideImage size={24} />
                      </div>
                    )}
                  </div>

                  <div className="buyeditr-compact-content">
                    <h4 className="buyeditr-compact-name">
                      {item.custom_name || item.product_name || 'Item'}
                    </h4>

                    {item.note && <p className="buyeditr-note">Note: {item.note}</p>}

                    <div className="buyeditr-compact-price-row">
                      {priceChanged && (
                        <span className="buyeditr-compact-old-price">
                          ₦{parseFloat(item.original_price).toLocaleString()}
                        </span>
                      )}
                      <span className="buyeditr-compact-new-price">
                        ₦{parseFloat(item.proposed_price).toLocaleString()}
                      </span>
                      <span className="buyeditr-compact-quantity">× {item.quantity}</span>
                    </div>

                    {badgeInfo && (
                      <div
                        className="buyeditr-compact-badge"
                        style={{
                          backgroundColor: `${badgeInfo.bg}30`,
                          color: badgeInfo.color,
                          borderColor: `${badgeInfo.color}80`,
                        }}
                      >
                        {badgeInfo.text}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div className="buyeditr-compact-total-card">
            <span className="buyeditr-compact-total-label">Total Amount</span>
            <span className="buyeditr-compact-total-price">
              ₦
              {displayItems
                .reduce((sum, i) => sum + parseFloat(i.proposed_price) * i.quantity, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {showActionButtons && (
          <div className="buyeditr-modern-actions">
            <button className="buyeditr-action-btn buyeditr-action-cancel" disabled={actionLoading}>
              Cancel
            </button>

            <button
              className="buyeditr-action-btn buyeditr-action-edit"
              onClick={() => navigate("/cart/buyer-counter", { state: { po_id: latestVersion.id } })}
              disabled={actionLoading}
            >
              Counter
            </button>

            <button
              className={`buyeditr-action-btn buyeditr-action-accept ${
                !canAccept ? 'buyeditr-action-disabled' : ''
              }`}
              onClick={() => alert('Accept functionality to be implemented')}
              disabled={!canAccept || actionLoading}
            >
              {actionLoading ? 'Loading...' : canAccept ? 'Accept' : 'Waiting'}
            </button>
          </div>
        )}
      </main>

      {/* Image viewer placeholder */}
      {imageViewerVisible && (
        <div className="buyeditr-image-viewer-overlay">
          <div className="buyeditr-image-viewer-content">
            <p>Image viewer placeholder (implement full modal here)</p>
            <button onClick={() => setImageViewerVisible(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}