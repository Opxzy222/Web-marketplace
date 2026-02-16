// src/components/common/Header.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import '../css/component/HeaderGlobal.css'; // same CSS file – no need for new one

interface HeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
  shopId?: string;           // optional shop ID to display & copy
  className?: string;
}

export default function Header({
  
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
      console.error('Failed to copy shop ID:', err);
    }
  };

  return (
    <header className={`gl-header ${className}`}>
      {/* Same inner wrapper as HeaderGlobal – gets the curve + background */}
      <div className="gl-header-inner">
        {/* Left side – back button */}
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

        {/* Center – title */}
        

        {/* Right side – shop ID + copy (instead of ThemeToggle) */}
        <div className="gl-header-right">
          {shopId ? (
            <div className="shop-id-wrapper">
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

              {/* Optional small toast-like feedback (positioned absolutely) */}
              {copied && (
                <div className="copy-feedback-tooltip">Copied!</div>
              )}
            </div>
          ) : (
            // Fallback when no shopId (keeps layout balanced)
            <div className="gl-header-placeholder" />
          )}
        </div>
      </div>
    </header>
  );
}