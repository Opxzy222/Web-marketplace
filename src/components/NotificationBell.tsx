// NotificationBell.tsx
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import '../css/NotificationBell.css';

const FALLBACK_IMAGE = 'https://via.placeholder.com/40/eee/666?text=?';
const MERGE_TYPES = new Set(['shop_follower', 'shop_review', 'shop_post']);

const WS_BASE_URL = 'wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/notifications/';
const INITIAL_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;
const RECONNECT_BACKOFF_FACTOR = 1.6;

export default function NotificationBell() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const displayedIdsRef = useRef<Set<string>>(new Set());
  const pendingNotificationsRef = useRef<any[]>([]);

  // ────────────────────────────────────────────────
  // Utility & Memoized functions
  // ────────────────────────────────────────────────

  const log = useCallback((...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      const time = new Date().toISOString().slice(11, 23);
      console.log(`[WS ${time}]`, ...args);
    }
  }, []);

  const timeAgo = useCallback((timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diff = Math.floor((now.getTime() - created.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }, []);

  const updateUnreadCount = useCallback((notifs: any[]) => {
    const count = notifs.filter((n) => !n.is_read).length;
    setUnreadCount(count);
    return count;
  }, []);

  const mergeNotifications = useCallback((notifs: any[]) => {
    return notifs.reduce((acc: any[], notification: any) => {
      if (!MERGE_TYPES.has(notification.type)) return [...acc, notification];

      const existingIndex = acc.findIndex(
        (n) =>
          n.type === notification.type &&
          n.shop_id === notification.shop_id &&
          !n.is_read
      );

      if (existingIndex !== -1) {
        const existing = acc[existingIndex];
        const count = (notification.meta_data?.count || 1) + (existing.meta_data?.count || 0);
        acc[existingIndex] = {
          ...notification,
          meta_data: { ...notification.meta_data, count },
          message:
            notification.type === 'shop_post'
              ? `${count} New post${count > 1 ? 's' : ''} from ${notification.meta_data?.shop_name || 'Shop'}`
              : notification.message,
        };
      } else {
        acc.push({ ...notification, meta_data: { ...notification.meta_data, count: 1 } });
      }
      return acc;
    }, []);
  }, []);

  const normalizeNotification = useCallback((data: any) => ({
    id: data.id || crypto.randomUUID(),
    type: data.type?.toLowerCase() || 'unknown',
    message: data.message || 'Notification',
    shop_id: data.shop_id,
    po_id: data.po_id || data.meta_data?.po_id,
    receipt_id: data.receipt_id || data.meta_data?.receipt_id,
    conversation_id: data.conversation_id || data.meta_data?.conversation_id,
    created_at: data.created_at || new Date().toISOString(),
    is_read: data.is_read ?? false,
    meta_data: data.meta_data || {},
    image: data.image || FALLBACK_IMAGE,
  }), []);

  // ────────────────────────────────────────────────
  // WebSocket & Toast logic
  // ────────────────────────────────────────────────

  const showToast = useCallback((notification: any) => {
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span>${notification.message}</span>
        <button class="toast-close">×</button>
      </div>
    `;
    document.body.appendChild(toast);

    toast.querySelector('.toast-close')?.addEventListener('click', () => toast.remove());
    setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, 8000);
  }, []);

  const handleIncomingNotification = useCallback((data: any) => {
    const notification = normalizeNotification(data);

    if (displayedIdsRef.current.has(notification.id) || !notification.id) {
      log(`Ignoring duplicate/old notification id: ${notification.id}`);
      return;
    }

    displayedIdsRef.current.add(notification.id);
    localStorage.setItem('displayed_notification_ids', JSON.stringify({
      ids: Array.from(displayedIdsRef.current),
      timestamp: Date.now(),
    }));

    showToast(notification);

    // Only queue non-chat notifications for the dropdown list
    if (!['chat_message', 'unknown'].includes(notification.type)) {
      pendingNotificationsRef.current.push(notification);
    }
  }, [normalizeNotification, showToast, log]);

  const cleanupWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      if (wsRef.current.readyState <= WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component cleanup');
      }
      wsRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!userId) return;

    cleanupWebSocket();

    const url = `${WS_BASE_URL}?user_id=${userId}`;
    log(`Connecting → ${url} (attempt #${reconnectAttemptsRef.current + 1})`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      log('CONNECTED');
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleIncomingNotification(data);
      } catch (err) {
        log('Parse error:', err);
      }
    };

    ws.onerror = (event) => log('WebSocket error', event);

    ws.onclose = (event) => {
      log(`CLOSED — code: ${event.code}, clean: ${event.wasClean}`);

      if (event.code === 1000) return;

      const delay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_BACKOFF_FACTOR, reconnectAttemptsRef.current),
        MAX_RECONNECT_DELAY
      );

      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
    };
  }, [userId, cleanupWebSocket, handleIncomingNotification, log]);

  // ────────────────────────────────────────────────
  // Effects
  // ────────────────────────────────────────────────

  // 1. Auth check & userId
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    const userStr = localStorage.getItem('user_id');

    if (!token || !userStr) {
      navigate('/login');
      return;
    }

    const uid = parseInt(userStr, 10);
    if (isNaN(uid)) {
      console.error('Invalid user_id');
      navigate('/login');
      return;
    }

    setUserId(uid.toString()); // store as string for WS
  }, [navigate]);

  // 2. Load persisted data
  useEffect(() => {
    try {
      const stored = localStorage.getItem('notifications');
      let notifs = stored ? JSON.parse(stored) : [];

      notifs = notifs.filter((n: any) =>
        n.id && !['chat_message', 'unknown'].includes(n.type?.toLowerCase() ?? '')
      );

      const withTimestamps = notifs.map((n: any) => ({
        ...n,
        timestamp: timeAgo(n.created_at),
      }));

      setNotifications(withTimestamps);
      updateUnreadCount(withTimestamps);

      const displayed = localStorage.getItem('displayed_notification_ids');
      if (displayed) {
        const { ids, timestamp } = JSON.parse(displayed);
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          displayedIdsRef.current = new Set(ids);
        }
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    }

    return cleanupWebSocket;
  }, [timeAgo, updateUnreadCount, cleanupWebSocket]);

  // 3. WebSocket connection
  useEffect(() => {
    if (userId) connectWebSocket();
    return cleanupWebSocket;
  }, [userId, connectWebSocket, cleanupWebSocket]);

  // 4. Process pending notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingNotificationsRef.current.length === 0) return;

      setNotifications((prev) => {
        const newUnique = pendingNotificationsRef.current.filter(
          (n) => !prev.some((e) => e.id === n.id)
        );

        if (newUnique.length === 0) {
          pendingNotificationsRef.current = [];
          return prev;
        }

        let updated = [
          ...prev,
          ...newUnique.map((n) => ({
            ...n,
            timestamp: timeAgo(n.created_at),
          })),
        ];

        updated = mergeNotifications(updated);
        updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        localStorage.setItem('notifications', JSON.stringify(updated));
        updateUnreadCount(updated);

        pendingNotificationsRef.current = [];
        return updated;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [timeAgo, mergeNotifications, updateUnreadCount]);

  // 5. Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!isOpen) return;
      if (bellRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  // ────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, is_read: true }));
      localStorage.setItem('notifications', JSON.stringify(updated));
      setUnreadCount(0);
      return updated;
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'mark_as_read' }));
    }
  }, []);

  const navigateToNotification = useCallback((notification: any) => {
    const type = notification.type?.toLowerCase() || '';
    const shopId = notification.shop_id;
    const poId = notification.po_id || notification.meta_data?.po_id;
    const receiptId = notification.receipt_id || notification.meta_data?.receipt_id;

    // ── PO Notification (Purchase Order) ─────────────────────────────
    if (type === 'po_notification' && poId) {
      const messageLower = (notification.message || '').toLowerCase();

      const isSeller = messageLower.includes('new order') ||
                       messageLower.includes('countered') ||
                       messageLower.includes('accepted') ||
                       messageLower.includes('pick up') ||
                       messageLower.includes('cancelled') ||
                       messageLower.includes('seller') ||
                       messageLower.includes('you received') ||
                       messageLower.includes('your order was');

      if (isSeller) {
        navigate("/cart/seller-editor", { state: { poId } });
      } else {
        navigate("/cart/buyer-editor", { state: { poId } });
      }
      return;
    }

    // ── Shop related (post, review, follower) ────────────────────────
    if (['shop_post', 'shop_review', 'shop_follower'].includes(type) && shopId) {
      navigate(`/shop/shop-page/${shopId}`);
      // Alternative if your route expects state instead of param:
      // navigate("/shop/shop-page", { state: { shopId } });
      return;
    }

    // ── Receipt Created ──────────────────────────────────────────────
    if (type === 'receipt_created' && receiptId && shopId) {
      // As per your instruction: use { state: { shopId } }
      navigate("/customer-receipts", { state: { shopId } });
      return;
    }

    // ── Receipt Status Update ────────────────────────────────────────
    if (type === 'receipt_status' && receiptId && shopId) {
      const isVoided = notification.meta_data?.status === 'voided';

      if (isVoided) {
        navigate("/customer-receipts", { state: { shopId } });
      } else {
        // Shop/seller receipts view
        navigate("/shop-receipts", { state: { shopId } });
      }
      return;
    }

    // Fallback for chat messages or other types with conversation_id
    if (notification.conversation_id) {
      navigate(`/messages/${notification.conversation_id}`);
      return;
    }

    // Optional: log unhandled notifications
    console.warn('[Notification] Unhandled navigation type:', type, notification);

  }, [navigate]);

  const handleNotificationClick = useCallback((notification: any) => {
    setIsOpen(false);
    if (!['chat_message', 'unknown'].includes(notification.type)) {
      markAllRead();
    }
    navigateToNotification(notification);
  }, [markAllRead, navigateToNotification]);

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────

  const dropdownPosition = useMemo(() => {
    if (!bellRef.current) return { top: '100px', right: '16px' };
    const rect = bellRef.current.getBoundingClientRect();
    return {
      top: `${rect.bottom + window.scrollY + 10}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  }, [isOpen]);

  const dropdownContent = isOpen ? (
    <div
      className={`notification-dropdown ${isOpen ? 'open' : ''}`}
      ref={dropdownRef}
      style={dropdownPosition}
    >
      <div className="dropdown-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button className="mark-read-btn" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
            />
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="notification-bell">
        <button
          ref={bellRef}
          className={`bell-btn ${isOpen ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={isOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="bell-icon">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="unread-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {createPortal(dropdownContent, document.body)}
    </>
  );
}

interface NotificationItemProps {
  notification: any;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const isPO = notification.type === 'po_notification';
  const hasCode = /Code:|code:/i.test(notification.message || '');

  let codePart = '';
  if (hasCode) {
    const parts = notification.message.split(/Code:|code:/i);
    codePart = parts[1]?.trim() || '';
  }

  return (
    <button
      className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={`avatar ${isPO ? 'po-avatar' : ''}`}>
        {isPO ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18">📦</text>
          </svg>
        ) : (
          <img
            src={notification.image || FALLBACK_IMAGE}
            alt=""
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE;
            }}
          />
        )}
      </div>

      <div className="notification-content">
        <div className="message">
          {notification.message}
          {hasCode && codePart && (
            <div className="pickup-code">
              Code: <span className="code">{codePart}</span>
            </div>
          )}
        </div>
        <div className="timestamp">{notification.timestamp}</div>
      </div>
    </button>
  );
}