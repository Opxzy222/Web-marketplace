import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Search,
  Clock,
  MessageSquare,
  Store,
  CreditCard,
  UserCircle,
} from 'lucide-react';

import '../css/component/BottomTabBar.css';  // ← your prefixed CSS file

// Placeholder — replace with real logic later
const unreadCount = 3;

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isExactlyOnShopRoot = location.pathname === '/shop';
  const showExploreMode = !isExactlyOnShopRoot;

  const currentActiveTab = useMemo(() => {
    const path = location.pathname.toLowerCase().replace(/\/$/, '');

    if (path === '' || path === '/')                      return 'home';
    if (path === '/shop' || path.startsWith('/shop/'))    return 'shop';
    if (path.startsWith('/status') || path.includes('updates'))  return 'status';
    if (path.startsWith('/messages') || path.includes('chats'))  return 'messages';
    if (path === '/my-space' || path.startsWith('/my-space/') || path.startsWith('/myshop'))
      return 'myshop';
    if (path.startsWith('/account'))                      return 'account';
    if (path.startsWith('/profile'))                      return 'profile';

    return 'home';
  }, [location.pathname]);

  const tabs = [
    {
      id: 'shop',
      label: showExploreMode ? 'Explore' : 'Home',
      Icon: showExploreMode ? Search : Home,
      path: showExploreMode ? '/shop' : '/',
    },
    {
      id: 'status',
      label: 'Updates',
      Icon: Clock,
      path: '/latest-updates',
    },
    {
      id: 'messages',
      label: 'Chats',
      Icon: MessageSquare,
      path: '/messages',
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: 'myshop',
      label: 'My Space',
      Icon: Store,
      path: '/my-space',
    },
    {
      id: 'account',
      label: 'Account',
      Icon: CreditCard,
      path: '/account',
    },
    {
      id: 'profile',
      label: 'Profile',
      Icon: UserCircle,
      path: '/profile',
    },
  ];

  return (
    <motion.nav
      className="btmt-bottom-tab-nav"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 180 }}
    >
      <div className="btmt-bottom-tab-container">
        {tabs.map((tab) => {
          const isActive = tab.id === currentActiveTab;

          return (
            <button
              key={tab.id}
              className={`btmt-tab-item ${isActive ? 'btmt-active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              <motion.div
                className="btmt-icon-wrapper"
                animate={{
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -6 : 0,
                  opacity: isActive ? 1 : 0.8,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              >
                <tab.Icon
                  size={26}
                  strokeWidth={isActive ? 2.8 : 1.8}
                  className={`btmt-tab-icon ${isActive ? 'btmt-active' : ''}`}
                />

                {tab.badge && <span className="btmt-badge">{tab.badge}</span>}
              </motion.div>

              <motion.span
                className="btmt-tab-label"
                animate={{
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  scale: isActive ? 1.05 : 1,
                }}
              >
                {tab.label}
              </motion.span>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="active-bar"
                    className="btmt-active-indicator"
                    initial={{ opacity: 0, scaleX: 0.6 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0.6 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}