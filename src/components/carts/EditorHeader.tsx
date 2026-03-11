// src/components/carts/BuyerPOHeader.tsx
import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import '../../css/carts/BuyerPOHeader.css';

interface BuyerPOHeaderProps {
  shopName: string;
  shopId: string;
  currentVersion: any;
  allVersions: any[];
  selectedVersionId: string;
  showVersions: boolean;
  setShowVersions: (show: boolean) => void;
  onVersionSelect: (id: string) => void;
  onBack: () => void;
}

export default function BuyerPOHeader({
  shopName,
  shopId,
  currentVersion,
  allVersions,
  selectedVersionId,
  showVersions,
  setShowVersions,
  onVersionSelect,
  onBack,
}: BuyerPOHeaderProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debug: log every render
  console.log('[BuyerPOHeader] showVersions:', showVersions, 'versions count:', allVersions.length);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowVersions(false);
      }
    };
    if (showVersions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVersions, setShowVersions]);

  return (
    <>
      <header className="buy-po-header">
        <div className="buy-po-header-inner">
          <button className="buy-po-back-btn" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>

          <div className="buy-po-header-center">
            <button
              className="buy-po-shop-name"
              onClick={() => navigate(`/shop/${shopId}`)}
            >
              {shopName || 'Shop'}
            </button>
          </div>

          <div className="buy-po-header-right">
            {allVersions.length > 0 && (
              <button
                className={`buy-po-version-toggle ${showVersions ? 'active' : ''}`}
                onClick={() => {
                  console.log('[Click] Toggling versions — current:', showVersions);
                  setShowVersions(!showVersions);
                }}
                aria-expanded={showVersions}
              >
                <span className="buy-po-version-label">v{currentVersion?.version ?? '?'}</span>
                {showVersions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Dropdown – show even if only 1 version */}
      {showVersions && allVersions.length > 0 && (
        <div className="buy-po-version-dropdown" ref={dropdownRef}
            style={{
            position: 'fixed',
            top: '60px', // adjust to below header height (measure in DevTools)
            right: '12px',
            zIndex: 10000, // very high to avoid overlap
        }}>
            
          <div className="buy-po-dropdown-scroll">
            {allVersions.map((v) => (
              <button
                key={v.id}
                className={`buy-po-version-item ${v.id === selectedVersionId ? 'active' : ''}`}
                onClick={() => {
                  onVersionSelect(v.id);
                  setShowVersions(false);
                }}
              >
                <div className="buy-po-version-info">
                  <div className="buy-po-version-title">
                    v{v.version}
                    {v.is_latest && <span className="latest-badge">Latest</span>}
                    {v.id.includes('_fake') && <span className="fake-badge">Original</span>}
                  </div>
                  <div className="buy-po-version-meta">
                    {v.id.includes('_fake') ? 'You (Initial Offer)' : v.counter_by}
                    {' • '}
                    {new Date(v.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>
                {v.id === selectedVersionId && (
                  <CheckCircle size={20} className="buy-po-selected-icon" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}