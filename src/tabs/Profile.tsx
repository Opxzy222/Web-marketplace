// Profile.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCopy, FaCheck, FaUser, FaBell, FaLock, FaShieldHalved, FaCommentDots, FaTrash, FaArrowRight } from "react-icons/fa6";
import Logout from "../components/Logout";
import PageShell from "../components/PageShell";
import '../css/tab/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    const userIdString = localStorage.getItem("userId");
    setUserId(userIdString);
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!userId) return;
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    } finally {
      setIsCopying(false);
    }
  }, [userId]);

  const handleMenuItemClick = useCallback((path: string) => {
    navigate(path, { 
      state: { prevRoute: location.pathname }
    });
  }, [navigate, location.pathname]);

  return (
    <PageShell
      title="Profile"
      showBackButton={true}
      isLoading={false}
    >
      <div className="ppl-profile-wrapper">
        <div className="ppl-scroll-container">

          {userId && (
            <div className="ppl-profile-card ppl-customer-id-card">
              <h2 className="ppl-profile-title">Customer ID</h2>
              <div className="ppl-profile-row">
                <div className="ppl-profile-id-text">{userId}</div>
                <motion.button
                  className={`ppl-copy-button ${copied ? 'ppl-copied' : ''}`}
                  onClick={copyToClipboard}
                  disabled={isCopying}
                  whileHover={!isCopying ? { scale: 1.05 } : {}}
                  whileTap={!isCopying ? { scale: 0.95 } : {}}
                >
                  {isCopying ? '⏳' : copied ? <FaCheck /> : <FaCopy />}
                </motion.button>
              </div>
            </div>
          )}

          <div className="ppl-menu-container">
            <MenuItem icon={<FaUser />}        title="Edit Profile"              onClick={() => handleMenuItemClick("/profile-edit")} />
            <MenuItem icon={<FaBell />}       title="Notification settings"     onClick={() => handleMenuItemClick("/notification-settings")} />
            <MenuItem icon={<FaLock />}       title="Change Password"           onClick={() => handleMenuItemClick("/change-password")} />
            <MenuItem icon={<FaShieldHalved />} title="Account Verification"   onClick={() => handleMenuItemClick("/verification-status")} />
            <MenuItem icon={<FaCommentDots />}  title="Give Feedback"           onClick={() => handleMenuItemClick("/feed-back")} />
            <MenuItem icon={<FaTrash />}      title="Delete Account"            onClick={() => handleMenuItemClick("/delete-user")} color="var(--danger)" />

            {/* ── Logout Button – now styled like other menu items ── */}
            <Logout
              buttonStyle={{
                width: "100%",
                background: "transparent",
                border: "none",
                padding: "18px 24px",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "16px",
                cursor: "pointer",
                transition: "all 0.25s ease",
                color: "var(--danger)",           // uses CSS var → adapts to dark mode
                fontWeight: 500,
              }}
              textStyle={{
                color: "var(--danger)",
                fontWeight: 500,
                fontSize: "17px",
                flex: 1,
              }}
              iconColor="var(--danger)"
              onLogoutSuccess={() => {
                console.log('Logout successful from Profile');
                navigate("/login");
              }}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
};

// MenuItem component (unchanged – already uses ppl- prefix and variables)
interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  color?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onClick, color = "var(--text-primary)" }) => (
  <motion.button 
    className="ppl-menu-item"
    style={{ "--icon-color": color, "--text-color": color } as React.CSSProperties}
    onClick={onClick}
    whileHover={{ 
      backgroundColor: "rgba(59, 130, 246, 0.08)",
      x: 4,
      scale: 1.015
    }}
    whileTap={{ scale: 0.98 }}
  >
    <span className="ppl-menu-icon">{icon}</span>
    <span className="ppl-menu-text">{title}</span>
    <FaArrowRight className="ppl-menu-arrow" />
  </motion.button>
);

export default Profile;