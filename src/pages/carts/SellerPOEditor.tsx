// src/pages/cart/SellerPOEditor.tsx

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../../contexts/CartContext'; // assuming same context exists
import '../../css/carts/SellerPOEditor.css'; // we'll create this next
import SellerPOHeader from '../../components/carts/SellerPOHeader'; // to be created next

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
    last_changed_by?: 'buyer' | 'seller' | null;   // ← NEW
    note?: string;
  }>;
};

export default function SellerPOEditor() {
  const location = useLocation();
  const poId = location.state?.poId as string | undefined;
  const navigate = useNavigate();
  const { getShopItems } = useCart(); // assuming seller also has access or adjust if needed

  const [po, setPo] = useState<any>(null);
  const [allVersions, setAllVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState(''); // for pickup confirmation
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

      if (!manuallySelectedVersionId) {
        const useLatest = ['completed', 'pickup_pending'].includes(fullPo.status);
        setSelectedVersionId(useLatest ? latest.id : poId);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      alert(err.response?.data?.error || 'Failed to load order');
      navigate('/cart/SellerPODashboard');
    } finally {
      setLoading(false);
    }
  }, [poId, sessionToken, navigate, manuallySelectedVersionId]);

  useEffect(() => {
    fetchFullThread();
  }, [fetchFullThread]);

  // ──────────────────────────────────────────────
  // Seller-specific change badge logic using last_changed_by
  // ──────────────────────────────────────────────
  const getPriceChangeBadge = (item: any) => {
    if (item.change_type === 'custom' || item.custom_name) {
      return { text: 'Custom item by buyer', color: '#7C3AED', bg: '#E9D5FF' };
    }

    if (item.last_changed_by) {
      if (item.last_changed_by === 'seller') {
        return { text: 'You changed price', color: '#EA580C', bg: '#FFEDD5' };
      } else if (item.last_changed_by === 'buyer') {
        return { text: 'Buyer changed price', color: '#3B82F6', bg: '#DBEAFE' };
      }
    }

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
  const terminalStatuses = ['completed', 'cancelled_by_seller', 'rejected', 'expired'];
  const isTerminalStatus = terminalStatuses.includes(po?.status) || po?.is_expired === true;
  const showActionButtons =
    !isViewingOldVersion && isNegotiating && po?.status !== 'pickup_pending' && !isTerminalStatus;

  const displayItems = useMemo(() => {
    // For seller, we don't merge cart items (seller doesn't have a cart in this context)
    return currentVersion?.items || [];
  }, [currentVersion]);

  // Pickup countdown timer (same as buyer)
  const [timeLeft, setTimeLeft] = useState('');
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

  // Seller-specific actions (to be implemented with real API calls)
  const handleReject = () => {
    alert('Reject functionality to be implemented');
    // Example: POST /po/reject/ with po_id
  };

  const handleCounter = () => {
    navigate("/cart/seller-counter", { state: { poId: latestVersion.id } });
  };

  const handleAccept = () => {
    alert('Accept functionality to be implemented');
    // Example: POST /po/accept/ with po_id
  };

  const handleConfirmPickup = () => {
    if (codeInput.length !== 4 || !/^\d+$/.test(codeInput)) {
      alert('Enter valid 4-digit code');
      return;
    }
    alert(`Confirm pickup with code: ${codeInput} (to be implemented)`);
    setCodeInput('');
    // Example: POST /po/confirm-pickup/ with po_id & pickup_code
  };

  const handleCancelPickup = () => {
    alert('Cancel pickup (buyer didn’t show) - to be implemented');
    // Example: POST /po/cancel-pickup/ with po_id
  };

  if (loading || !currentVersion || allVersions.length === 0) {
    return (
      <div className="selleditr-full-page-loader">
        <div className="selleditr-loader-spinner"></div>
        <p className="selleditr-loader-text">Loading order...</p>
      </div>
    );
  }

  return (
    <div className="selleditr-page-container">
      {/* Header with version selector */}
      <SellerPOHeader
        buyerName={po?.buyer_name || 'Customer'}
        buyerId={po?.buyer_id} // adjust if needed
        currentVersion={currentVersion}
        allVersions={allVersions}
        selectedVersionId={selectedVersionId}
        showVersions={showVersions}
        setShowVersions={setShowVersions}
        onVersionSelect={handleVersionSelect}
        onBack={() => navigate('/cart/SellerPODashboard')}
      />

      <main className="selleditr-main-content">
        {/* Old version warning */}
        {isViewingOldVersion && (
          <div className="selleditr-old-version-banner">
            <AlertCircle size={20} />
            <span>Viewing older version • Actions disabled</span>
          </div>
        )}

        {/* Message bubble */}
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

        {/* Pickup ready card - Seller view */}
        {po?.status === 'pickup_pending' && currentVersion.is_latest && (
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
              <span className="selleditr-timer-text">{timeLeft}</span>
            </div>

            <div className="selleditr-address-row">
              <MapPin size={18} />
              <span className="selleditr-address-text">
                {po.pickup_info.shop_address || 'Shop address'}
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

        {/* Items list */}
        <div className="selleditr-items-container">
          {displayItems.length === 0 ? (
            <div className="selleditr-empty-items">
              <ShoppingCart size={80} className="selleditr-empty-icon" />
              <p className="selleditr-empty-text">No items in this order</p>
            </div>
          ) : (
            displayItems.map((item, idx) => {
              const changeInfo = getPriceChangeBadge(item);
              const isEdited = !!item.last_changed_by; // ← CHANGED
              const itemImage = item.custom_image_url || item.image_url;

              return (
                <div key={idx} className="selleditr-compact-card">
                  <div className="selleditr-compact-image-wrapper">
                    {itemImage ? (
                      <button
                        className="selleditr-image-btn"
                        onClick={() => {
                          const validImages = displayItems
                            .map((it: any) => it.custom_image_url || it.image_url)
                            .filter(Boolean) as string[];
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
                      {isEdited && (
                        <span className="selleditr-compact-old-price">
                          ₦{parseFloat(item.original_price).toLocaleString()}
                        </span>
                      )}
                      <span className="selleditr-compact-new-price">
                        ₦{parseFloat(item.proposed_price).toLocaleString()}
                      </span>
                      <span className="selleditr-compact-quantity">× {item.quantity}</span>
                    </div>

                    {changeInfo && (
                      <div
                        className="selleditr-compact-badge"
                        style={{
                          backgroundColor: `${changeInfo.bg}30`,
                          color: changeInfo.color,
                        }}
                      >
                        {changeInfo.text}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div className="selleditr-compact-total-card">
            <span className="selleditr-compact-total-label">
              {po?.status === 'completed' ? 'Customer paid' : 'Customer wants to pay'}
            </span>
            <span className="selleditr-compact-total-price">
              ₦
              {displayItems
                .reduce((sum, i) => sum + parseFloat(i.proposed_price) * i.quantity, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action buttons */}
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
              disabled={actionLoading}
            >
              Counter
            </button>

            <button
              className={`selleditr-action-btn selleditr-action-accept ${
                !canAccept ? 'selleditr-action-disabled' : ''
              }`}
              onClick={handleAccept}
              disabled={!canAccept || actionLoading}
            >
              {actionLoading ? 'Loading...' : canAccept ? 'Accept' : 'Waiting'}
            </button>
          </div>
        )}
      </main>

      {/* Image viewer placeholder */}
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