import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCopy, FaCheck, FaUser, FaBell, FaLock, FaShieldHalved, FaCommentDots, FaTrash, FaArrowRight } from "react-icons/fa6";
import Logout from "../components/Logout";
import PageShell from "../components/PageShell";   // ← adjust path if needed
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
      <div className="profile-wrapper">
        <div className="scroll-container">

          {userId && (
            <div className="profile-card customer-id-card">
              <h2 className="profile-title">Customer ID</h2>
              <div className="profile-row">
                <div className="profile-id-text">{userId}</div>
                <motion.button
                  className={`copy-button ${copied ? 'copied' : ''}`}
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

          <div className="menu-container">
            <MenuItem icon={<FaUser />}        title="Edit Profile"              onClick={() => handleMenuItemClick("/profile-edit")} />
            <MenuItem icon={<FaBell />}       title="Notification settings"     onClick={() => handleMenuItemClick("/notification-settings")} />
            <MenuItem icon={<FaLock />}       title="Change Password"           onClick={() => handleMenuItemClick("/change-password")} />
            <MenuItem icon={<FaShieldHalved />} title="Account Verification"   onClick={() => handleMenuItemClick("/verification-status")} />
            <MenuItem icon={<FaCommentDots />}  title="Give Feedback"           onClick={() => handleMenuItemClick("/feed-back")} />
            <MenuItem icon={<FaTrash />}      title="Delete Account"            onClick={() => handleMenuItemClick("/delete-user")} color="#ef4444" />

            {/* ── Logout Button ──────────────────────────────────────── */}
            <Logout
  buttonStyle={{
    width: "100%",
    marginBottom: "12px",
    backgroundColor: "white",
    border: "1px solid #fee2e2",
    color: "#dc2626",
    fontWeight: 500,
  }}
  textStyle={{
    color: "#dc2626",
    fontWeight: 500,
  }}
  iconColor="#D32F2F"
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

// MenuItem remains unchanged (assuming it's already styled in your Profile.css)
interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  color?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onClick, color = "#333" }) => (
  <motion.button 
    className="menu-item"
    style={{ "--icon-color": color, "--text-color": color } as React.CSSProperties}
    onClick={onClick}
    whileHover={{ 
      backgroundColor: "rgba(59, 130, 246, 0.08)",
      x: 4,
      scale: 1.015
    }}
    whileTap={{ scale: 0.98 }}
  >
    <span className="menu-icon">{icon}</span>
    <span className="menu-text">{title}</span>
    <FaArrowRight className="menu-arrow" />
  </motion.button>
);

export default Profile;