// FollowButton.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Store, Handshake } from 'lucide-react';
import axios from 'axios';
import '../../css/component/shop/FollowButton.css';

const FollowButton = ({ shopId, onPress }) => {
  const [following, setFollowing] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessionId = async () => {
      try {
        const sessionIdString = localStorage.getItem('sessionToken');
        setSessionId(sessionIdString);
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };
    fetchSessionId();
  }, []);

  useEffect(() => {
    const checkFollowingStatus = async () => {
      if (!sessionId || !shopId) {
        setIsLoading(false);
        return;
      }

      try {
        const userId = localStorage.getItem('user_id');
        const response = await axios.get(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/followers-status/`, {
          params: { user_id: userId },
          headers: { Accept: 'application/json' },
        });
        setFollowing(response.data.following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFollowingStatus();
  }, [shopId, sessionId]);

  const handleFollow = useCallback(async () => {
    if (isLoading || !sessionId) return;

    try {
      const userId = localStorage.getItem('user_id');
      const formData = new URLSearchParams();
      formData.append('shop_id', shopId);
      formData.append('user_id', userId);

      await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/follow/', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: sessionId,
          Accept: 'application/json',
        },
      });

      setFollowing(!following);
      onPress?.();
    } catch (error) {
      console.error('Error following/unfollowing shop:', error);
    }
  }, [following, sessionId, shopId, onPress, isLoading]);

  if (isLoading) {
    return (
      <motion.div
        className="follow-button-loading"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="spinner" />
      </motion.div>
    );
  }

  return (
    <motion.button
      className={`follow-button-wrapper ${following ? 'following' : 'follow'}`}
      onClick={handleFollow}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={isLoading}
    >
      <div className="follow-button-gradient">
        {following ? (
          <Store size={18} className="follow-icon" />
        ) : (
          <Handshake size={16} className="follow-icon" />
        )}
        <span className="button-text">
          {following ? 'Following' : 'Follow'}
        </span>
      </div>
    </motion.button>
  );
};

export default FollowButton;
