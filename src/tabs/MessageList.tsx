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
import '../css/tab/MessageList.css'; // ← remember to update selectors in CSS too!

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

  // ─── Session Token ─────────────────────────────────────────────────
  const fetchSessionId = useCallback(async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      setSessionId(token);
      return token;
    } catch (err) {
      console.error('Failed to read sessionToken', err);
      return null;
    }
  }, []);

  // ─── Cache Helpers ─────────────────────────────────────────────────
  const cacheMessages = useCallback((msgs: any[]) => {
    try {
      localStorage.setItem('message_list', JSON.stringify(msgs));
    } catch (err) {
      console.error('Cache save failed', err);
    }
  }, []);

  const loadCachedMessages = useCallback((): any[] => {
    try {
      const raw = localStorage.getItem('message_list');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  // ─── Filtering ─────────────────────────────────────────────────────
  const filterMessages = useCallback((items: any[], tab: string) => {
    if (!isMountedRef.current) return;
    let result = items;
    if (tab === 'Space') result = items.filter(m => m.role === 'seller');
    if (tab === 'Customers') result = items.filter(m => m.role === 'buyer');
    setFilteredMessages(result);
  }, []);

  // ─── Data Fetching ─────────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (force = false) => {
      if (!sessionId) return;
      if (isFetchingRef.current) return;

      const now = Date.now();
      if (!force && now - lastFetchTimeRef.current < 30_000 && messages.length > 0) {
        return;
      }

      isFetchingRef.current = true;
      setLoading(true);
      setFetchError(false);

      try {
        const { data } = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/message-list/', {
          headers: { Authorization: sessionId },
        });

        const newList = Array.isArray(data) ? data : [];
        const hasChanged = JSON.stringify(newList) !== JSON.stringify(lastMessagesRef.current);

        if (hasChanged || force) {
          setMessages(newList);
          lastMessagesRef.current = newList;
          cacheMessages(newList);
          filterMessages(newList, activeTab);
        }

        lastFetchTimeRef.current = now;
      } catch (err) {
        console.error('Message list fetch failed', err);
        if (isMountedRef.current) setFetchError(true);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          isFetchingRef.current = false;
        }
      }
    },
    [sessionId, activeTab, cacheMessages, filterMessages, messages.length],
  );

  // ─── Lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    fetchSessionId();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const cached = loadCachedMessages();
    if (cached.length > 0) {
      setMessages(cached);
      lastMessagesRef.current = cached;
      filterMessages(cached, activeTab);
    }

    fetchMessages(true);

    const interval = setInterval(() => {
      if (isMountedRef.current && sessionId) fetchMessages();
    }, 60_000);

    return () => clearInterval(interval);
  }, [sessionId, activeTab, fetchMessages, loadCachedMessages, filterMessages]);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    filterMessages(messages, tab);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages(true);
    setRefreshing(false);
  };

  const handleMessageClick = (msg: any) => {
    navigate('/conversation', {
      state: {
        name: msg.name,
        conversation_id: msg.conversation_id,
        shop_id: msg.shop_id,
        shop_is_active: msg.shop_is_active,
        role: msg.role,
        shopId: msg.shopId,
      },
    });
  };

  const handleShopClick = (msg: any) => {
    navigate(`/shop-page/${msg.shop_id}`);
  };

  // ─── Message Row Component ─────────────────────────────────────────
  const MessageItem = ({ item }: { item: any }) => {
    const isUnread = !!item.is_unread_by_receiver;
    const isDeleted = !item.shop_is_active;
    const dateStr = new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    // ─── Last message handling ────────────────────────────────────────
    const lastMsg = item.last_message ?? ''; // safe guard null/undefined
    const hasMedia = typeof lastMsg === 'string' && lastMsg.startsWith('chat_attachments/');
    const isVideo = hasMedia && /\.(mp4|mov|avi|webm|mkv)$/i.test(lastMsg);

    const previewText = hasMedia
      ? isVideo
        ? 'Video'
        : 'Photo'
      : lastMsg.trim() || 'No message yet';

    const accentColor = isDeleted
      ? 'var(--accent-danger, #ef4444)'
      : isUnread
      ? 'var(--accent-primary, #3b82f6)'
      : 'var(--text-secondary, #64748b)';

    const messageStyle = {
      color: accentColor,
      fontWeight: isUnread ? 500 : 400,
      opacity: lastMsg ? 1 : 0.65,
    };

    return (
      <div className={`msl-message-item ${isUnread ? 'msl-unread' : ''} ${isDeleted ? 'msl-deleted' : ''}`}>
        {/* Left: Avatar */}
        <button className="msl-avatar-btn" onClick={() => handleShopClick(item)}>
          <div className="msl-profile-image-container">
            {item.profile_image ? (
              <img src={item.profile_image} alt="" className="msl-profile-image" loading="lazy" />
            ) : (
              <div className="msl-profile-placeholder">
                <Store size={28} />
              </div>
            )}
          </div>
        </button>

        {/* Right side: name + date + preview */}
        <div className="msl-content-side" onClick={() => handleMessageClick(item)}>
          <div className="msl-header-row">
            <h3 className="msl-name">
              {item.name || 'Unknown'}
              {isDeleted && ' (Deleted)'}
            </h3>
            <time className="msl-date">{dateStr}</time>
          </div>

          <div className="msl-preview-row">
            {hasMedia ? (
              <div className="msl-media-indicator" style={{ color: accentColor }}>
                {isVideo ? <Video size={18} /> : <ImageIcon size={18} />}
                <span className="msl-media-label">{previewText}</span>
              </div>
            ) : (
              <p className="msl-last-message" style={{ color: accentColor }}>
                {previewText}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ───────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'All',       icon: Grid,   label: 'All' },
    { id: 'Space',     icon: Users,  label: 'Space' },
    { id: 'Customers', icon: User,   label: 'Customers' },
  ];

  return (
    <PageShell title="Messages" isLoading={loading && messages.length === 0}>
      <div className="msl-message-list-container">
        <div className="msl-tabs-header">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              className={`msl-tab-item ${activeTab === id ? 'msl-active' : ''}`}
              onClick={() => handleTabChange(id)}
              disabled={loading || refreshing}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}

          <button
            type="button"
            className="msl-refresh-btn-tab"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            aria-label="Refresh messages"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && filteredMessages.length === 0 ? (
          <div className="msl-empty-state msl-loading">
            <Loader2 size={36} className="animate-spin" />
            <p>Loading conversations…</p>
          </div>
        ) : fetchError ? (
          <div className="msl-empty-state msl-error">
            <AlertCircle size={40} />
            <h3>Couldn't load messages</h3>
            <button className="msl-retry-button" onClick={() => fetchMessages(true)}>
              Try Again
            </button>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="msl-empty-state">
            <MessageCircle size={48} strokeWidth={1.4} />
            <h3>
              {activeTab === 'Space'
                ? 'No shop messages yet'
                : activeTab === 'Customers'
                ? 'No customer messages yet'
                : 'No conversations yet'}
            </h3>
            <button className="msl-refresh-button" onClick={() => fetchMessages(true)}>
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        ) : (
          <div className="msl-messages-list">
            {filteredMessages.map(item => (
              <MessageItem
                key={`${item.conversation_id || item.id}-${activeTab}`}
                item={item}
              />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default MessageList;