// src/components/PageShell.tsx
import React from 'react';
import Header from './HeaderGlobal';  // Adjust path to your global header
import '../css/component/PageShell.css';       // We'll create this CSS in Step 2

interface PageShellProps {
  title: string;              // Dynamic header title
  isLoading: boolean;         // True during data fetch
  error?: string | null;      // Error message if fetch fails
  onRetry?: () => void;       // Optional retry function for error state
  children: React.ReactNode;  // Success content (only shown if no loading/error)
}

export default function PageShell({
  title,
  isLoading,
  error,
  onRetry,
  children,
}: PageShellProps) {
  return (
    <div className="page-shell">
      {/* Header always rendered, unaffected by states */}
      <Header title={title} />

      {/* Conditional content area */}
      <main className="page-main">
        {isLoading ? (
          <div className="global-loader">
            <div className="loader-inner">
              <div className="spinner large"></div>
              <p>Loading...</p>
            </div>
          </div>
        ) : error ? (
          <div className="global-error">
            <p className="error-text">{error}</p>
            {onRetry && (
              <button className="retry-button" onClick={onRetry}>
                Try Again
              </button>
            )}
          </div>
        ) : (
          children  // Success content here
        )}
      </main>
    </div>
  );
}