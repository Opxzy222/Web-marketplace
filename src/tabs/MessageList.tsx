// components/shop/MessageList.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  MessageCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Store,
  Image as ImageIcon,
  Video,
  User,
  Users,
  Grid,
} from 'lucide-react';
import PageShell from '../components/PageShell';
import '../css/tab/MessageList.css';

const MessageList: React.FC = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<any[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const lastMessagesRef = useRef<any[]>([]);

  // ─── Load session token ────────────────────────────────────────────
  const fetchSessionId = useCallback(async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      console.log('Loaded sessionToken:', token ? 'present' : 'missing');
      setSessionId(token);
      return token;
    } catch (error) {
      console.error('Error reading sessionToken:', error);
      return null;
    }
  }, []);

  // ─── Cache helpers ─────────────────────────────────────────────────
  const cacheMessages = useCallback((msgs: any[]) => {
    try {
      localStorage.setItem('message_list', JSON.stringify(msgs));
    } catch (error) {
      console.error('Error caching messages:', error);
    }
  }, []);

  const loadCachedMessages = useCallback((): any[] => {
    try {
      const cached = localStorage.getItem('message_list');
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error loading cached messages:', error);
      return [];
    }
  }, []);

  // ─── Filter logic (moved BEFORE fetchMessages) ─────────────────────
  const filterMessages = useCallback((msgs: any[], tab: string) => {
    if (!isMountedRef.current) return;
    let filtered = msgs;
    if (tab === 'Space') filtered = msgs.filter(msg => msg.role === 'seller');
    else if (tab === 'Customers') filtered = msgs.filter(msg => msg.role === 'buyer');
    setFilteredMessages(filtered);
  }, []);

  // ─── Fetch messages ────────────────────────────────────────────────
  const fetchMessages = useCallback(async (force = false) => {
    if (!sessionId) {
      console.log('fetchMessages skipped: no sessionId yet');
      return;
    }
    if (isFetchingRef.current) {
      console.log('fetchMessages skipped: already fetching');
      return;
    }

    console.log('fetchMessages started with sessionId:', sessionId);

    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 30000 && messages.length > 0) {
      console.log('fetchMessages skipped: using recent cache');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setFetchError(false);

    try {
      const res = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/message-list/', {
        headers: { Authorization: sessionId },
      });

      const newMessages = res.data || [];
      console.log('Fetched messages count:', newMessages.length);

      if (isMountedRef.current) {
        const changed = JSON.stringify(newMessages) !== JSON.stringify(lastMessagesRef.current);
        if (changed || force) {
          setMessages(newMessages);
          lastMessagesRef.current = newMessages;
          cacheMessages(newMessages);
          filterMessages(newMessages, activeTab); // ← safe now
        }
        lastFetchTimeRef.current = now;
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (isMountedRef.current) setFetchError(true);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [sessionId, activeTab, cacheMessages, filterMessages, messages.length]);

  // ─── Mount / Initialize ────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      setLoading(true);
      await fetchSessionId(); // sets sessionId → triggers the next effect
    };

    init();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSessionId]);

  // ─── Fetch & load cache when sessionId is ready ────────────────────
  useEffect(() => {
    if (!sessionId) {
      console.log('Waiting for sessionId before loading messages');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      const cached = loadCachedMessages();
      if (cached.length > 0 && isMountedRef.current) {
        console.log('Loaded cached messages:', cached.length);
        setMessages(cached);
        lastMessagesRef.current = cached;
        filterMessages(cached, activeTab);
      }

      // Fetch fresh data
      await fetchMessages(true);
    };

    loadData();

    // Auto-refresh every 60s
    const interval = setInterval(() => {
      if (isMountedRef.current && sessionId) fetchMessages();
    }, 60000);

    return () => clearInterval(interval);
  }, [sessionId, activeTab, fetchMessages, loadCachedMessages, filterMessages]);

  // Tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    filterMessages(messages, tab);
  }, [messages, filterMessages]);

  // Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMessages(true);
    setRefreshing(false);
  }, [fetchMessages]);

  // Navigation
  const handleMessageClick = useCallback((message: any) => {
    navigate('/conversation', {
      state: {
        name: message.name,
        conversation_id: message.conversation_id,
        shop_id: message.shop_id,
        shop_is_active: message.shop_is_active,
        role: message.role,
        shopId: message.shopId,
      },
    });
  }, [navigate]);

  const handleShopClick = useCallback((message: any) => {
    navigate(`/shop-page/${message.shop_id}`);
  }, [navigate]);

  // Message item render (unchanged)
  const MessageItem = ({ item }: { item: any }) => {
    const isUnread = item.is_unread_by_receiver;
    const isDeleted = !item.shop_is_active;
    const formattedDate = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const hasAttachment = item.last_message?.startsWith('chat_attachments/');
    const isVideo = hasAttachment && /\.(mp4|mov|avi)$/i.test(item.last_message);

    const profileImg = item.profile_image ? `https://api.gogo-digital.com${item.profile_image}` : null;

    return (
      <div className={`message-item ${isUnread ? 'unread' : ''} ${isDeleted ? 'deleted' : ''}`}>
        <button className="profile-image-container" onClick={() => handleShopClick(item)}>
          {profileImg ? (
            <img src={profileImg} alt="Profile" className="profile-image" />
          ) : (
            <div className="profile-placeholder">
              <Store size={24} />
            </div>
          )}
        </button>
        <button className="text-container" onClick={() => handleMessageClick(item)}>
          <div className="message-header">
            <h3 className="name">{item.name || 'Unknown'}{isDeleted && ' (Deleted)'}</h3>
            <span className="date">{formattedDate}</span>
          </div>
          <div className="last-message-container">
            {hasAttachment ? (
              isVideo ? <Video size={18} className="media-icon" /> : <ImageIcon size={18} className="media-icon" />
            ) : (
              <p className="last-message">{item.last_message || 'No message'}</p>
            )}
          </div>
        </button>
      </div>
    );
  };

  const tabs = [
    { key: 'All', icon: Grid, label: 'All' },
    { key: 'Space', icon: Users, label: 'Space' },
    { key: 'Customers', icon: User, label: 'Customers' },
  ];

  return (
    <PageShell title="Messages" isLoading={loading}>
      <div className="message-list-wrapper">
        <div className="tabs-nav">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              className={`tab-btn ${activeTab === key ? 'active' : ''}`}
              onClick={() => handleTabChange(key)}
              disabled={loading || refreshing}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
          <button
            className="refresh-tab-btn"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw size={20} className={refreshing ? 'spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="status-bar loading">
            <Loader2 className="spin" size={24} />
            <span>Loading Messages...</span>
          </div>
        ) : fetchError ? (
          <div className="status-bar error">
            <AlertCircle size={24} />
            <span>Failed to load messages</span>
            <button onClick={() => fetchMessages(true)} className="retry-btn">
              Try Again
            </button>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="empty-state">
            <MessageCircle size={64} />
            <h3>
              {activeTab === 'Space' ? 'No shop messages' :
               activeTab === 'Customers' ? 'No customer messages' : 'No messages yet'}
            </h3>
            <button onClick={() => fetchMessages(true)} className="refresh-btn">
              <RefreshCw size={20} />
              Refresh
            </button>
          </div>
        ) : (
          <div className="messages-scroll">
            {filteredMessages.map((item) => (
              <MessageItem key={`${item.id || item.conversation_id}-${activeTab}`} item={item} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default MessageList;