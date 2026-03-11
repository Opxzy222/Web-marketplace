// Followers.jsx
import React from 'react';
import { Verified } from 'lucide-react';
import { motion } from 'framer-motion';
import '../../css/component/shop/Followers.css';

const Followers = ({ followers = [] }) => {
  const getColorForAlphabet = (alphabet) => {
    const colors = {
      A: '#FFD700', B: '#FF6347', C: '#4682B4', D: '#32CD32', E: '#FF69B4',
      F: '#8A2BE2', G: '#FF4500', H: '#DA70D6', I: '#20B2AA', J: '#B22222',
      K: '#4B0082', L: '#FF8C00', M: '#808000', N: '#FF1493', O: '#8B4513',
      P: '#B8860B', Q: '#8B0000', R: '#2E8B57', S: '#A0522D', T: '#5F9EA0',
      U: '#D2691E', V: '#9932CC', W: '#FF7F50', X: '#6495ED', Y: '#DC143C',
      Z: '#00CED1',
    };
    return colors[alphabet.toUpperCase()] || '#FFD700';
  };

  const generateKey = (item, index) => {
    if (item.user_id) return item.user_id;
    if (item.image) return item.image.split('?')[0];
    if (item.username) return item.username;
    return `fallback_${index}`;
  };

  const renderFollower = (item, index) => (
    <motion.div
      key={generateKey(item, index)}
      className="follower-item"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      {item.image ? (
        <div className="follower-avatar-container">
          <img
            src={item.image}
            alt={item.username || 'Follower'}
            className="follower-avatar-image"
            width={48}
            height={48}
            loading="lazy"           // improves performance
            onError={(e) => {
              e.target.src = '/fallback-avatar.jpg'; // optional fallback image
              e.target.alt = 'Image failed to load';
            }}
          />
        </div>
      ) : (
        <div 
          className="follower-avatar-placeholder"
          style={{ backgroundColor: getColorForAlphabet(item.username?.charAt(0) || 'A') }}
        >
          <span className="avatar-text">
            {(item.username?.charAt(0) || '?').toUpperCase()}
          </span>
        </div>
      )}
      
      <div className="follower-info">
        <span className="follower-username">{item.username || 'Unknown'}</span>
        {item.is_verified && (
          <motion.div 
            className="verified-icon-container"
            whileHover={{ scale: 1.1 }}
          >
            <Verified size={16} className="verified-icon" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="followers-container">
      {Array.isArray(followers) && followers.length > 0 ? (
        <div className="follower-list">
          {followers.map((follower, index) => renderFollower(follower, index))}
        </div>
      ) : (
        <div className="no-followers">
          <span>No followers yet.</span>
        </div>
      )}
    </div>
  );
};

export default Followers;