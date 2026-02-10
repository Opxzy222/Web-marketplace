// src/components/common/Header.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import '../css/component/HeaderGlobal.css';   // keep this import

interface HeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
  shopId?: string;           // ← new: optional shop ID to display & copy
  className?: string;
}

export default function Header({
  title,
  onBack,
  showBackButton = true,
  shopId,
  className = '',
}: HeaderProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const handleCopy = async () => {
    if (!shopId) return;

    try {
      await navigator.clipboard.writeText(shopId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <header className={`gl-header ${className}`}>
      <div className="gl-header-left">
        {showBackButton && (
          <button
            className="gl-back-btn"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
        )}
      </div>

      <h1 className="gl-header-title">{title}</h1>

      <div className="gl-header-right">
        {shopId ? (
          <div className="shop-id-container">
            <span className="shop-id-label">SPACE ID:</span>
            <span className="shop-id-value">{shopId}</span>

            <button
              className={`shop-id-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              aria-label="Copy shop ID"
              title={copied ? 'Copied!' : 'Copy SPACE ID'}
            >
              {copied ? (
                <Check size={20} color="#86efac" />
              ) : (
                <Copy size={20} color="#e2e8f0" />
              )}
            </button>

            {/* Optional floating feedback tooltip */}
            {copied && (
              <div className="copy-feedback">Copied!</div>
            )}
          </div>
        ) : (
          // Optional fallback if no shopId — can be empty or something else
          <div className="empty-right-placeholder" />
        )}
      </div>
    </header>
  );
}