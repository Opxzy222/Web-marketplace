// components/VerificationStatus.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  CheckCircle2,
  BadgeCheck,
  Clock,
  XCircle,
  Loader2,
  Check,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageShell from '../components/PageShell';
import '../css/VerificationStatus.css';

type VerificationStatusType = 'not_started' | 'pending' | 'verified' | 'failed';

interface StatusData {
  phoneVerified: boolean;
  idVerificationStatus: VerificationStatusType;
}

const VerificationStatus: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusData>({
    phoneVerified: false,
    idVerificationStatus: 'not_started',
  });

  const loadVerificationStatus = useCallback(() => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        navigate('/login');
        return;
      }

      const phoneVerifiedStr = localStorage.getItem('phone_verified');
      const isPhoneVerified = phoneVerifiedStr ? JSON.parse(phoneVerifiedStr) : false;

      const idStatusStr = localStorage.getItem('verification_status') as VerificationStatusType;
      const idVerificationStatus = idStatusStr || 'not_started';

      setStatus({ phoneVerified: !!isPhoneVerified, idVerificationStatus });
    } catch (error) {
      console.error('Failed to load verification status', error);
      setStatus({ phoneVerified: false, idVerificationStatus: 'not_started' });
    }
  }, [navigate]);

  useEffect(() => {
    loadVerificationStatus();
  }, [loadVerificationStatus]);

  useEffect(() => {
    const handleFocus = () => loadVerificationStatus();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadVerificationStatus]);

  const handlePhoneVerification = () => {
    if (status.phoneVerified) return;
    navigate('/PhoneVerification');
  };

  const handleIDVerification = () => {
    if (!status.phoneVerified) return;
    if (status.idVerificationStatus === 'verified' || status.idVerificationStatus === 'pending') return;
    navigate('/IDVerification');
  };

  const getIDConfig = () => {
    switch (status.idVerificationStatus) {
      case 'verified':
        return {
          icon: CheckCircle2,
          color: 'var(--success)',
          subtitle: 'Verified',
          bg: 'var(--success-bg)',
          hoverBg: 'var(--success-hover)',
          iconClass: 'success-icon',
        };
      case 'pending':
        return {
          icon: Loader2,
          color: 'var(--warning)',
          subtitle: 'Processing...',
          bg: 'var(--warning-bg)',
          hoverBg: 'var(--warning-hover)',
          iconClass: 'spinner',
          isSpinner: true,
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'var(--danger)',
          subtitle: 'Failed – Tap to retry',
          bg: 'var(--danger-bg)',
          hoverBg: 'var(--danger-hover)',
          iconClass: 'danger-icon',
        };
      default:
        return {
          icon: BadgeCheck,
          color: 'var(--muted)',
          subtitle: 'Verify your ID',
          bg: 'var(--neutral-bg)',
          hoverBg: 'var(--neutral-hover)',
          iconClass: 'default-icon',
          locked: !status.phoneVerified,
        };
    }
  };

  const idConfig = getIDConfig();

  return (
    <PageShell title="Verification Status" showBackButton isLoading={false}>
      <div className="verification-page">
        <motion.div
          className="content-wrapper"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.p
            className="page-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Complete these steps to unlock full access to your shop
          </motion.p>

          <div className="verification-card glass-card">
            {/* Phone Verification */}
            <motion.button
              className={`verification-step ${status.phoneVerified ? 'completed' : ''}`}
              onClick={handlePhoneVerification}
              disabled={status.phoneVerified}
              aria-label={status.phoneVerified ? 'Phone already verified' : 'Verify phone number'}
              whileHover={!status.phoneVerified ? { y: -4, scale: 1.015 } : {}}
              whileTap={!status.phoneVerified ? { y: 0, scale: 0.99 } : {}}
            >
              <div className="step-gradient" />
              <div className="step-content">
                <div className="step-icon-container">
                  {status.phoneVerified ? (
                    <CheckCircle2 className="step-icon success" size={40} />
                  ) : (
                    <Phone className="step-icon" size={40} />
                  )}
                </div>

                <div className="step-text">
                  <h3>Phone Number</h3>
                  <p>{status.phoneVerified ? 'Verified' : 'Required for security'}</p>
                </div>

                {status.phoneVerified && (
                  <CheckCircle2 className="status-check" size={28} />
                )}
              </div>
            </motion.button>

            {/* ID Verification */}
            <motion.button
              className={`verification-step ${status.idVerificationStatus} ${
                !status.phoneVerified ? 'locked' : ''
              }`}
              onClick={handleIDVerification}
              disabled={
                status.idVerificationStatus === 'verified' ||
                status.idVerificationStatus === 'pending' ||
                !status.phoneVerified
              }
              aria-label={
                !status.phoneVerified
                  ? 'Phone verification required first'
                  : status.idVerificationStatus === 'verified'
                  ? 'ID already verified'
                  : status.idVerificationStatus === 'pending'
                  ? 'ID verification in progress'
                  : 'Verify your ID'
              }
              whileHover={
                status.phoneVerified &&
                (status.idVerificationStatus === 'not_started' ||
                  status.idVerificationStatus === 'failed')
                  ? { y: -4, scale: 1.015 }
                  : {}
              }
              whileTap={
                status.phoneVerified &&
                (status.idVerificationStatus === 'not_started' ||
                  status.idVerificationStatus === 'failed')
                  ? { y: 0, scale: 0.99 }
                  : {}
              }
            >
              <div className="step-gradient" />
              <div className="step-content">
                <div className="step-icon-container">
                  {idConfig.isSpinner ? (
                    <Loader2 className="step-icon spinner" size={40} />
                  ) : idConfig.locked ? (
                    <Lock className="step-icon locked" size={40} />
                  ) : (
                    <idConfig.icon className="step-icon" size={40} />
                  )}
                </div>

                <div className="step-text">
                  <h3>Government ID</h3>
                  <p>{idConfig.subtitle}</p>
                </div>

                {status.idVerificationStatus === 'verified' && (
                  <CheckCircle2 className="status-check success" size={28} />
                )}
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default VerificationStatus;