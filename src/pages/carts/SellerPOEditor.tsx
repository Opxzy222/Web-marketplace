// src/pages/cart/SellerPOEditor.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../contexts/CartContext';
import '../../css/carts/SellerPOEditor.css';
import SellerPOHeader from '../../components/carts/SellerPOHeader';

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
    image_url?: string | null;
    custom_image_url?: string | null;
    added_by: 'buyer' | 'seller';
    last_changed_by?: 'buyer' | 'seller' | null;
    note?: string;
  }>;
};

export default function SellerPOEditor() {
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
  const [codeInput, setCodeInput] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [rootPoId, setRootPoId] = useState<string | null>(null);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);

  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerImages, setImageViewerImages] = useState<string[]>([]);
  const [imageViewerStartIndex, setImageViewerStartIndex] = useState(0);

  // Load session token
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    setSessionToken(token);
  }, []);

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

      const res = await axios.get(`${API_BASE}/po/seller/detail/${poId}/`, {
        headers: { Authorization: sessionToken },
      });

      const incomingPo = res.data.po;
      const incomingVersions: Version[] = res.data.versions || [];
      const latest = incomingVersions.find((v) => v.is_latest);

      if (!latest) throw new Error('No latest version found');

      setRootPoId(latest.id);

      const fullRes = await axios.get(`${API_BASE}/po/seller/detail/${latest.id}/`, {
        headers: { Authorization: sessionToken },
      });

      const fullPo = fullRes.data.po;
      const fullVersions: Version[] = fullRes.data.versions || [];
      const sorted = [...fullVersions].sort((a, b) => a.version - b.version);

      setPo(fullPo);
      setAllVersions(sorted);

      const useLatest = ['completed', 'pickup_pending'].includes(fullPo.status);
      setSelectedVersionId(useLatest ? latest.id : poId);
    } catch (err: any) {
      console.error('Fetch error:', err);
      alert(err.response?.data?.error || 'Failed to load order');
      navigate('/cart/seller-dashboard');
    } finally {
      setLoading(false);
    }
  }, [poId, sessionToken, navigate]);

  useEffect(() => {
    fetchFullThread();
  }, [fetchFullThread]);

  const getPriceChangeBadge = (item: Version['items'][number]) => {
    // Custom items — check who added / last changed
    if (item.change_type === 'custom' || item.custom_name) {
      if (item.last_changed_by === 'seller' || item.added_by === 'seller') {
        return { text: 'Custom item by you', color: '#a855f7', bg: '#E9D5FF' };
      }
      return { text: 'Custom item by buyer', color: '#7C3AED', bg: '#E9D5FF' };
    }

    // Regular price changes
    if (item.last_changed_by) {
      if (item.last_changed_by === 'seller') {
        return { text: 'You changed price', color: '#EA580C', bg: '#FFEDD5' };
      }
      if (item.last_changed_by === 'buyer') {
        return { text: 'Buyer changed price', color: '#3B82F6', bg: '#DBEAFE' };
      }
    }

    return null;
  };

  const currentVersion = useMemo<Version | null>(
    () =>
      allVersions.find((v) => v.id === selectedVersionId) ||
      allVersions[allVersions.length - 1] ||
      null,
    [allVersions, selectedVersionId]
  );

  const latestVersion = useMemo<Version | null>(
    () =>
      allVersions.find((v) => v.is_latest) ||
      allVersions[allVersions.length - 1] ||
      null,
    [allVersions]
  );

  const isViewingOldVersion = !!latestVersion && selectedVersionId !== latestVersion.id;

  const isNegotiating = !!currentVersion && ['proposed', 'countered'].includes(currentVersion.status);

  const canAccept = !!po?.can_accept;

  const terminalStatuses = ['completed', 'cancelled_by_seller', 'rejected', 'expired'];
  const isTerminalStatus = !!po && (terminalStatuses.includes(po.status) || po.is_expired === true);

  const showActionButtons =
    !isViewingOldVersion &&
    isNegotiating &&
    !!po &&
    po.status !== 'pickup_pending' &&
    !isTerminalStatus;

  const displayItems = useMemo(() => {
    if (!currentVersion) return [];
    // Seller doesn't merge cart items — just use version items
    return currentVersion.items;
  }, [currentVersion]);

  // Pickup timer — only for latest pickup_pending version
  useEffect(() => {
    if (
      !currentVersion ||
      !currentVersion.is_latest ||
      currentVersion.status !== 'pickup_pending' ||
      !po?.pickup_info?.expires_in_seconds
    ) {
      setTimeLeft('');
      return;
    }

    const start = Date.now();
    const duration = po.pickup_info.expires_in_seconds;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, duration - elapsed);

      if (left <= 0) {
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
  }, [currentVersion, po?.pickup_info?.expires_in_seconds]);

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId);
    setShowVersions(false);
  };

  // Placeholder action handlers — replace with real API calls later
  const handleReject = () => alert('Reject functionality to be implemented');
  const handleCounter = () =>
    navigate('/cart/seller-counter', { state: { poId: latestVersion?.id } });
  const handleAccept = () => alert('Accept functionality to be implemented');

  const handleConfirmPickup = () => {
    if (codeInput.length !== 4 || !/^\d+$/.test(codeInput)) {
      alert('Enter valid 4-digit code');
      return;
    }
    alert(`Confirming pickup with code: ${codeInput} (API call needed)`);
    setCodeInput('');
  };

  const handleCancelPickup = () => alert('Cancel pickup (API call needed)');

  if (loading || !currentVersion || allVersions.length === 0) {
    return (
      <div className="selleditr-full-page-loader">
        <div className="selleditr-loader-spinner"></div>
        <p className="selleditr-loader-text">Loading order...</p>
      </div>
    );
  }

  const isPickupPending = currentVersion.status === 'pickup_pending' && currentVersion.is_latest;

  return (
    <div className="selleditr-page-container">
      <SellerPOHeader
        buyerName={po?.buyer_name || 'Customer'}
        buyerId={po?.buyer_id}
        currentVersion={currentVersion}
        allVersions={allVersions}
        selectedVersionId={selectedVersionId}
        showVersions={showVersions}
        setShowVersions={setShowVersions}
        onVersionSelect={handleVersionSelect}
        onBack={() => navigate('/cart/seller-dashboard')}
      />

      <main className="selleditr-main-content">
        {isViewingOldVersion && (
          <div className="selleditr-old-version-banner">
            <AlertCircle size={20} />
            <span>Viewing older version • Actions disabled</span>
          </div>
        )}

        {currentVersion.message && (
          <div
            className={`selleditr-message-bubble selleditr-message-${
              currentVersion.last_counter === 'seller' ? 'seller' : 'buyer'
            }`}
          >
            <div className="selleditr-message-header">
              <span className="selleditr-message-sender">
                {currentVersion.last_counter === 'seller' ? 'You' : po?.buyer_name || 'Customer'}
              </span>
              <span className="selleditr-message-version">v{currentVersion.version}</span>
            </div>
            <div
              className="selleditr-message-text"
              onClick={() => setShowFullMessage((prev) => !prev)}
            >
              "{currentVersion.message}"
            </div>
          </div>
        )}

        {isPickupPending && (
          <div className="selleditr-pickup-card">
            <div className="selleditr-pickup-header">
              <CheckCircle size={32} className="selleditr-success-icon" />
              <h3 className="selleditr-pickup-title">READY FOR PICKUP</h3>
            </div>

            <div className="selleditr-pickup-code-input-row">
              <label className="selleditr-code-label">Enter 4-digit code:</label>
              <input
                type="text"
                maxLength={4}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                className="selleditr-pickup-code-input"
                placeholder="••••"
              />
            </div>

            <div className="selleditr-timer-row">
              <Clock size={20} />
              <span className="selleditr-timer-text">{timeLeft || 'Calculating...'}</span>
            </div>

            <div className="selleditr-address-row">
              <MapPin size={18} />
              <span className="selleditr-address-text">
                {po?.pickup_info?.shop_address || 'Shop address'}
              </span>
            </div>

            <button className="selleditr-view-items-btn" onClick={() => setShowPreviewSheet(true)}>
              <Eye size={22} />
              <span>View All Items</span>
            </button>

            <div className="selleditr-pickup-actions">
              <button
                className="selleditr-cancel-pickup-btn"
                onClick={handleCancelPickup}
                disabled={actionLoading}
              >
                Buyer didn’t show
              </button>
              <button
                className="selleditr-confirm-pickup-btn"
                onClick={handleConfirmPickup}
                disabled={actionLoading || codeInput.length !== 4}
              >
                {actionLoading ? 'Confirming...' : 'Confirm Pickup'}
              </button>
            </div>
          </div>
        )}

        <div className="selleditr-items-container">
          {displayItems.length === 0 ? (
            <div className="selleditr-empty-items">
              <ShoppingCart size={80} className="selleditr-empty-icon" />
              <p className="selleditr-empty-text">No items in this order</p>
            </div>
          ) : (
            displayItems.map((item, idx) => {
              const badgeInfo = getPriceChangeBadge(item);
              const priceChanged = !!item.last_changed_by;
              const itemImage = item.custom_image_url || item.image_url;

              return (
                <div key={idx} className="selleditr-compact-card">
                  <div className="selleditr-compact-image-wrapper">
                    {itemImage ? (
                      <button
                        className="selleditr-image-btn"
                        onClick={() => {
                          const validImages = displayItems
                            .map((it) => it.custom_image_url || it.image_url)
                            .filter((url): url is string => !!url);
                          const index = validImages.indexOf(itemImage);
                          setImageViewerImages(validImages);
                          setImageViewerStartIndex(index >= 0 ? index : 0);
                          setImageViewerVisible(true);
                        }}
                      >
                        <img src={itemImage} alt="Item" className="selleditr-compact-image" />
                      </button>
                    ) : (
                      <div className="selleditr-compact-placeholder">
                        <LucideImage size={24} />
                      </div>
                    )}
                  </div>

                  <div className="selleditr-compact-content">
                    <h4 className="selleditr-compact-name">
                      {item.custom_name || item.product_name || 'Item'}
                    </h4>

                    {item.note && <p className="selleditr-note">Note: {item.note}</p>}

                    <div className="selleditr-compact-price-row">
                      {priceChanged && (
                        <span className="selleditr-compact-old-price">
                          ₦{parseFloat(item.original_price || '0').toLocaleString()}
                        </span>
                      )}
                      <span className="selleditr-compact-new-price">
                        ₦{parseFloat(item.proposed_price || '0').toLocaleString()}
                      </span>
                      <span className="selleditr-compact-quantity">× {item.quantity}</span>
                    </div>

                    {badgeInfo && (
                      <div
                        className="selleditr-compact-badge"
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

          <div className="selleditr-compact-total-card">
            <span className="selleditr-compact-total-label">
              {po?.status === 'completed' ? 'Customer paid' : 'Customer will pay'}
            </span>
            <span className="selleditr-compact-total-price">
              ₦
              {displayItems
                .reduce((sum, i) => sum + parseFloat(i.proposed_price || '0') * i.quantity, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>

        {showActionButtons && (
          <div className="selleditr-modern-actions">
            <button
              className="selleditr-action-btn selleditr-action-reject"
              disabled={actionLoading}
              onClick={handleReject}
            >
              Reject
            </button>

            <button
              className="selleditr-action-btn selleditr-action-counter"
              onClick={handleCounter}
              disabled={actionLoading || !latestVersion}
            >
              Counter
            </button>

            <button
              className={`selleditr-action-btn selleditr-action-accept ${!canAccept ? 'selleditr-action-disabled' : ''}`}
              onClick={handleAccept}
              disabled={!canAccept || actionLoading}
            >
              {actionLoading ? 'Loading...' : canAccept ? 'Accept' : 'Waiting'}
            </button>
          </div>
        )}
      </main>

      {imageViewerVisible && (
        <div className="selleditr-image-viewer-overlay">
          <div className="selleditr-image-viewer-content">
            <p>Image viewer placeholder (implement full modal here)</p>
            <button onClick={() => setImageViewerVisible(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}