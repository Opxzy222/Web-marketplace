// components/ChangePassword.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Key, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import PageShell from '../components/PageShell'; // adjust path
import '../css/shop/ChangePassword.css';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const isFormValid = oldPassword && newPassword.length >= 6 && passwordsMatch;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('sessionToken');
      if (!token) throw new Error('No session token');

      const res = await axios.patch(
        '/change-password/', // or full URL if needed
        {
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
        }
      );

      if (res.status === 200) {
        // Optional: update token if backend returns new one
        if (res.data.session_id) {
          localStorage.setItem('sessionToken', res.data.session_id);
        }

        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          navigate('/profile');
        }, 1800);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to update password';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Change Password"
      showBackButton={true}
      isLoading={false}
    >
      <div className="change-password-wrapper">
        <div className="form-card">
          <h2 className="form-title">Update Password</h2>
          <p className="form-subtitle">
            For security, please enter your current password and choose a strong new one.
          </p>

          {/* Old Password */}
          <div className="input-group">
            
            <div className="password-field">
              <Lock size={20} className="field-icon" />
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="password-input"
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="input-group">
           
            <div className="password-field">
              <Key size={20} className="field-icon" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="password-input"
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {newPassword && newPassword.length < 6 && (
              <span className="input-hint error">Password must be at least 6 characters</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="input-group">
            
            <div className="password-field">
              <Key size={20} className="field-icon" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`password-input ${confirmPassword && !passwordsMatch ? 'error-border' : ''}`}
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <span className="input-hint error">Passwords do not match</span>
            )}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AlertCircle size={18} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            className={`submit-btn ${!isFormValid || loading ? 'disabled' : ''}`}
            disabled={!isFormValid || loading}
            onClick={handleSubmit}
            whileHover={!loading && isFormValid ? { y: -3, scale: 1.02 } : {}}
            whileTap={!loading && isFormValid ? { scale: 0.97 } : {}}
          >
            {loading ? (
              <>
                <Loader2 className="spinner" size={20} />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span>Update Password</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Success Toast */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="success-toast"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
            >
              <CheckCircle2 size={20} />
              <span>Password updated successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
};

export default ChangePassword;