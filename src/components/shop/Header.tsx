// src/components/shop/Header.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import '../../css/component/Header.css';

const Header: React.FC = () => {
  const navigate = useNavigate();

  const [userName, setUserName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    // Get username
    const storedName = localStorage.getItem('user_name');
    if (storedName) {
      setUserName(storedName);
    }

    // Time-based greeting
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else if (hour >= 17 && hour < 22) {
      setGreeting('Good Evening');
    } else {
      setGreeting('Hello');
    }
  }, []);

  const firstName = userName ? userName.split(' ')[0] : 'User';

  return (
    <header className="shop-header">
      <div className="header-content">
        <div className="greeting-section">
          <h1 className="greeting-main">
            {greeting}, <span className="user-name">{firstName}</span>
          </h1>
          <p className="greeting-sub">{greeting}</p>
        </div>

        <motion.button
          className="avatar-btn"
          onClick={() => navigate('/profile')}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          aria-label="View profile"
        >
          <div className="avatar">
            {firstName.charAt(0).toUpperCase()}
          </div>
        </motion.button>
      </div>
    </header>
  );
};

export default Header;