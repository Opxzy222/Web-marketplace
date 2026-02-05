// src/components/common/Header.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import '../css/component/HeaderGlobal.css';   // keep this import

interface HeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export default function Header({
  title,
  onBack,
  showBackButton = true,
  rightElement,
  className = '',
}: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
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
        {/* {rightElement} */}
        <ThemeToggle />
      </div>
    </header>
  );
}