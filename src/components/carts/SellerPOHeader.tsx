// src/components/carts/SellerPOHeader.tsx

import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import '../../css/carts/SellerPOHeader.css'; // We'll create this next (or reuse with prefix change)

interface SellerPOHeaderProps {
  buyerName: string;
  buyerId?: string; // optional — for linking to buyer profile if exists
  currentVersion: any;
  allVersions: any[];
  selectedVersionId: string;
  showVersions: boolean;
  setShowVersions: (show: boolean) => void;
  onVersionSelect: (id: string) => void;
  onBack: () => void;
}

export default function SellerPOHeader({
  buyerName,
  buyerId,
  currentVersion,
  allVersions,
  selectedVersionId,
  showVersions,
  setShowVersions,
  onVersionSelect,
  onBack,
}: SellerPOHeaderProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debug log (same as buyer)
  console.log('[SellerPOHeader] showVersions:', showVersions, 'versions count:', allVersions.length);

  // Close dropdown when clicking outside (identical)
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
      <header className="sell-po-header">
        <div className="sell-po-header-inner">
          <button className="sell-po-back-btn" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={24} />
          </button>

          <div className="sell-po-header-center">
            <button
              className="sell-po-buyer-name"
              onClick={() => {
                if (buyerId) {
                  navigate(`/buyer/${buyerId}`); // adjust route if you have buyer profile page
                }
              }}
              disabled={!buyerId}
            >
              {buyerName || 'Customer'}
            </button>
          </div>

          <div className="sell-po-header-right">
            {allVersions.length > 0 && (
              <button
                className={`sell-po-version-toggle ${showVersions ? 'active' : ''}`}
                onClick={() => {
                  console.log('[Click] Toggling versions — current:', showVersions);
                  setShowVersions(!showVersions);
                }}
                aria-expanded={showVersions}
              >
                <span className="sell-po-version-label">v{currentVersion?.version ?? '?'}</span>
                {showVersions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Dropdown – identical behavior and structure */}
      {showVersions && allVersions.length > 0 && (
        <div
          className="sell-po-version-dropdown"
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: '60px', // same offset as buyer — adjust if header height differs
            right: '12px',
            zIndex: 10000,
          }}
        >
          <div className="sell-po-dropdown-scroll">
            {allVersions.map((v) => (
              <button
                key={v.id}
                className={`sell-po-version-item ${v.id === selectedVersionId ? 'active' : ''}`}
                onClick={() => {
                  onVersionSelect(v.id);
                  setShowVersions(false);
                }}
              >
                <div className="sell-po-version-info">
                  <div className="sell-po-version-title">
                    v{v.version}
                    {v.is_latest && <span className="latest-badge">Latest</span>}
                    {v.id.includes('_fake') && <span className="fake-badge">Original</span>}
                  </div>
                  <div className="sell-po-version-meta">
                    {v.id.includes('_fake') ? 'Initial Request' : v.counter_by}
                    {' • '}
                    {new Date(v.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                </div>
                {v.id === selectedVersionId && (
                  <CheckCircle size={20} className="sell-po-selected-icon" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}