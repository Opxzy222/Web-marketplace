// components/Logout.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import '../css/Logout.css';

interface LogoutProps {
  onLogoutSuccess?: () => void;
  className?: string;                    // ← new: preferred way to style via CSS
  buttonStyle?: React.CSSProperties;     // kept for inline style fallback
  textClassName?: string;                // ← new: for text span
  textStyle?: React.CSSProperties;       // kept for inline style fallback
  iconColor?: string;
  iconSize?: number;
  disableConfirm?: boolean;              // ← new: skip confirmation dialog
}

const Logout: React.FC<LogoutProps> = ({
  onLogoutSuccess,
  className = '',
  buttonStyle,
  textClassName = '',
  textStyle,
  iconColor = '#D32F2F',
  iconSize = 24,
  disableConfirm = false,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoading(true);

    try {
      const sessionId = localStorage.getItem('sessionToken');

      if (!sessionId) {
        alert('No active session found');
        return;
      }

      const response = await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/logout/',
        {},
        {
          headers: { Authorization: sessionId },
        }
      );

      if (response.status === 200 || response.status === 204) {
        localStorage.clear();
        sessionStorage.clear();

        navigate('/', { replace: true });

        onLogoutSuccess?.();
      } else {
        alert('Logout failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Logout error:', error);
      const message =
        error.response?.data?.message ||
        error.message ||
        'An error occurred during logout';
      alert(message);
    } finally {
      setLoading(false);
    }
  }, [navigate, onLogoutSuccess]);

  const performLogout = () => {
    if (disableConfirm) {
      handleLogout();
    } else if (window.confirm('Are you sure you want to log out?')) {
      handleLogout();
    }
  };

  return (
    <motion.button
      className={`logout-button ${className}`.trim()}
      style={buttonStyle}
      onClick={performLogout}
      disabled={loading}
      whileHover={{ scale: loading ? 1 : 1.02 }}
      whileTap={{ scale: loading ? 1 : 0.98 }}
      aria-label="Log out"
    >
      <LogOut size={iconSize} color={iconColor} />

      <span
        className={`logout-text ${textClassName}`.trim()}
        style={textStyle}
      >
        Logout
      </span>

      <ChevronRight size={iconSize} color={iconColor} />

      {loading && (
        <Loader2
          className="loader-icon"
          size={iconSize}
          color={iconColor}
          aria-hidden="true"
        />
      )}
    </motion.button>
  );
};

export default Logout;