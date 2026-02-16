// components/VerificationStatus.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Phone, CheckCircle, BadgeCheck, Clock, XCircle, Loader2, Check 
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageShell from '../components/PageShell'; // adjust path if needed
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
    if (!status.phoneVerified) return alert('Please verify your phone first');
    if (status.idVerificationStatus === 'verified' || status.idVerificationStatus === 'pending') return;
    navigate('/IDVerification');
  };

  const getIDConfig = () => {
    switch (status.idVerificationStatus) {
      case 'verified':
        return { icon: CheckCircle, color: '#10B981', subtitle: 'Verified ✓', gradient: ['#D1FAE5', '#A7F3D0'] };
      case 'pending':
        return { icon: Clock, color: '#F59E0B', subtitle: 'Processing with NIMC...', gradient: ['#FFFBEB', '#FEF3C7'], showSpinner: true };
      case 'failed':
        return { icon: XCircle, color: '#EF4444', subtitle: 'Tap to retry', gradient: ['#FEE2E2', '#FECACA'] };
      default:
        return { icon: BadgeCheck, color: '#6B7280', subtitle: 'Verify with NIN/ID', gradient: ['#F3F4F6', '#E5E7EB'] };
    }
  };

  const idConfig = getIDConfig();

  return (
    <PageShell
      title="Verification Status"
      showBackButton={true}
      isLoading={false}
    >
      <div className="verification-status-page">
        <motion.div 
          className="content-container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.p 
            className="subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Complete these steps to fully activate your account
          </motion.p>

          <div className="status-card">
            {/* Phone Verification */}
            <motion.button
              className={`status-item ${status.phoneVerified ? 'verified' : ''}`}
              onClick={handlePhoneVerification}
              disabled={status.phoneVerified}
              whileHover={!status.phoneVerified ? { scale: 1.02 } : {}}
              whileTap={!status.phoneVerified ? { scale: 0.98 } : {}}
            >
              <div className="status-gradient" style={{ background: status.phoneVerified ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' : 'linear-gradient(135deg, #F3F4F6, #E5E7EB)' }} />
              <div className="status-content">
                <div className="icon-wrapper">
                  {status.phoneVerified ? <CheckCircle size={36} className="icon-success" /> : <Phone size={36} className="icon-default" />}
                </div>
                <div className="text-block">
                  <h3>Phone Verification</h3>
                  <p>{status.phoneVerified ? 'Verified ✓' : 'Verify your phone number'}</p>
                </div>
                {status.phoneVerified && <Check size={28} className="checkmark" />}
              </div>
            </motion.button>

            {/* ID Verification */}
            <motion.button
              className={`status-item ${status.idVerificationStatus === 'verified' ? 'verified' : status.idVerificationStatus === 'pending' ? 'pending' : status.idVerificationStatus === 'failed' ? 'failed' : ''}`}
              onClick={handleIDVerification}
              disabled={status.idVerificationStatus === 'verified' || status.idVerificationStatus === 'pending' || !status.phoneVerified}
              whileHover={(status.idVerificationStatus === 'not_started' || status.idVerificationStatus === 'failed') && status.phoneVerified ? { scale: 1.02 } : {}}
              whileTap={(status.idVerificationStatus === 'not_started' || status.idVerificationStatus === 'failed') && status.phoneVerified ? { scale: 0.98 } : {}}
            >
              <div className="status-gradient" style={{ background: `linear-gradient(135deg, ${idConfig.gradient.join(', ')})` }} />
              <div className="status-content">
                <div className="icon-wrapper">
                  {idConfig.showSpinner ? <Loader2 className="spinner" size={36} /> : <idConfig.icon size={36} className="icon-default" />}
                </div>
                <div className="text-block">
                  <h3>ID Verification</h3>
                  <p>{idConfig.subtitle}</p>
                </div>
                {status.idVerificationStatus === 'verified' && <Check size={28} className="checkmark" />}
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default VerificationStatus;