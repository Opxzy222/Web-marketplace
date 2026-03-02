// SalesActions.jsx - Orders & Receipts Dashboard
import React from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import PageShell from "../../components/PageShell"; // adjust path if needed
import "../../css/shop/SalesActions.css";

export default function SalesActions() {
  const navigate = useNavigate();
  const location = useLocation();
  const shopId = location.state?.shopId;

  const navigateTo = (path) => {
    navigate(path, { state: { shopId } });
  };

  return (
    <PageShell
      title="Orders & Receipts"
      showBackButton={true}
      onBack={() => navigate("/my-shop")}
    >
      <div className="slact-receipt-actions">
        <main className="slact-actions-grid">
          {/* Orders */}
          <ActionButton
            icon="🛒"
            label="Orders"
            gradient={['#3B82F6', '#2563EB']}
            onClick={() => navigateTo("/seller-dashboard")}
          />

          {/* Generate Receipt */}
          <ActionButton
            icon="➕"
            label="Generate Receipt"
            gradient={['#4CAF50', '#388E3C']}
            onClick={() => navigateTo("/generate-receipts")}
          />

          {/* View Receipts */}
          <ActionButton
            icon="📄"
            label="Receipts"
            gradient={['#795548', '#5D4037']}
            onClick={() => navigateTo("/shop-receipts")}
          />
        </main>
      </div>
    </PageShell>
  );
}

const ActionButton = ({ icon, label, gradient, onClick }) => (
  <button className="slact-action-btn" onClick={onClick}>
    <div
      className="slact-action-gradient"
      style={{
        background: `linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
      }}
    >
      <span className="slact-action-icon">{icon}</span>
      <span className="slact-action-label">{label}</span>
    </div>
  </button>
);