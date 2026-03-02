// components/Account.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Copy,
  Check,
  Building,
  User,
  Building2,
  Wallet,
  ShoppingCart,
  Receipt,
  CreditCard,
} from 'lucide-react';
import axios from 'axios';
import PageShell from '../components/PageShell'; 
import '../css/tab/Account.css'; 

const Account = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [subscription, setSubscription] = useState({ plan: null, end_date: null });

  const [copied, setCopied] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('sessionToken');
        if (!token) return;

        const res = await axios.get('/payments/balance/', {
          headers: { Authorization: token },
        });

        const data = res.data || {};
        setBalance(Number(data.balance) || 0);
        setVirtualAccount(data.virtual_account || null);
        setSubscription(data.subscription || { plan: null, end_date: null });

        // cache
        localStorage.setItem('balance', (Number(data.balance) || 0).toString());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {}
  };

  const goTo = (path, state = {}) => {
    navigate(path, { state });
  };

  return (
    <PageShell
      title="My Account"
      isLoading={loading}
      showBackButton={true}
    >
      <div className="account-wrapper">
        <div className="account-content">

          {/* Wallet / Balance Card */}
          <div className="wallet-card">
            {virtualAccount ? (
              <>
                <div className="wallet-header">
                  <Wallet size={28} />
                  <h2>Wallet</h2>
                </div>

                <div className="balance-block">
                  <div className="balance-label">Available Balance</div>
                  <div className="balance-value">
                    ₦{balance.toLocaleString('en-NG')}
                  </div>
                </div>

                <div className="account-info-grid">
                  <div className="info-row">
                    <Building size={20} />
                    <div className="info-content">
                      <div className="info-label">Account Number</div>
                      <div className="info-value-row">
                        <span>{virtualAccount.account_number}</span>
                        <button
                          className="copy-icon-btn"
                          onClick={() => copy(virtualAccount.account_number, 'acc-num')}
                          aria-label="Copy account number"
                        >
                          {copied === 'acc-num' ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="info-row">
                    <User size={20} />
                    <div className="info-content">
                      <div className="info-label">Account Name</div>
                      <div className="info-value-row">
                        <span>{virtualAccount.account_name}</span>
                        <button
                          className="copy-icon-btn"
                          onClick={() => copy(virtualAccount.account_name, 'acc-name')}
                          aria-label="Copy account name"
                        >
                          {copied === 'acc-name' ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="info-row">
                    <Building2 size={20} />
                    <div className="info-content">
                      <div className="info-label">Bank</div>
                      <div className="info-value">{virtualAccount.bank_name}</div>
                    </div>
                  </div>
                </div>

                <p className="topup-hint">
                  Top up by transferring to the account details above
                </p>
              </>
            ) : (
              <div className="no-wallet">
                <Wallet size={48} className="no-wallet-icon" />
                <h3>No Virtual Account</h3>
                <p>Verify your identity to get your dedicated account number.</p>
                <button
                  className="verify-cta"
                  onClick={() => goTo('/verification-status')}
                >
                  Verify ID
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-grid">
            <button className="action-card" onClick={() => goTo('/cart/BuyerPODashboard')}>
              <ShoppingCart size={26} />
              <span>My Orders</span>
            </button>

            <button className="action-card" onClick={() => goTo('/customer-receipts')}>
              <Receipt size={26} />
              <span>Receipts</span>
            </button>

            <button className="action-card" onClick={() => goTo('/subscription')}>
              <CreditCard size={26} />
              <span>Subscription</span>
            </button>
          </div>

        </div>
      </div>
    </PageShell>
  );
};

export default Account;