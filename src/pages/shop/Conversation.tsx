// components/shop/Conversation.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Video,
  FileText,
  Menu,
  CheckCheck,
  Loader2,
  AlertCircle,
  MessageCircle,
  Receipt,
} from 'lucide-react';
import PageShell from '../../components/PageShell';
import '../../css/shop/StartConversation.css'; // Reusing the same CSS file

const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const Conversation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    conversation_id: rawConvId,
    shop_id: rawShopId,
    name,
    shop_is_active,
    senderId: initialSenderId,
    shopOwner: initialShopOwner,
  } = location.state || {};

  const conversationId = rawConvId ? String(rawConvId) : null;
  const shopId = rawShopId ? String(rawShopId) : null;
  const isShopActive = shop_is_active === 'true' || shop_is_active === true;

  const [userId, setUserId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [senderId, setSenderId] = useState(initialSenderId || null);
  const [shopOwner, setShopOwner] = useState(initialShopOwner || null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const receivedMessagesRef = useRef(new Set<number>());

  // ────────────────────────────────────────────────
  // Load auth
  // ────────────────────────────────────────────────
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

    setUserId(uid);
    setSessionId(token);
  }, [navigate]);

  // ────────────────────────────────────────────────
  // Load messages + WS when ready
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !sessionId || !userId) return;

    const loadData = async () => {
      setLoading(true);
      setFetchError(false);
      setErrorMessage('');

      try {
        // Cache first
        const cacheKey = `messages_${conversationId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setMessages(parsed);
            parsed.forEach((m: any) => {
              if (m.id) receivedMessagesRef.current.add(Number(m.id));
            });
          } catch (e) {
            localStorage.removeItem(cacheKey);
          }
        }

        await fetchMessages();
      } catch (err: any) {
        console.error('Initial load failed:', err);
        setFetchError(true);
        setErrorMessage(err.response?.data?.error || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [conversationId, sessionId, userId]);

  const fetchMessages = async () => {
    if (!conversationId || !sessionId) return;

    try {
      const res = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/conversation/?conversation_id=${conversationId}`,
        {
          headers: { Authorization: sessionId },
          params: { limit: 50 },
        }
      );

      const data = res.data || [];

      if (data.length > 0) {
        setSenderId(data[0].sender_user_id || data[0].sender_id);
        setShopOwner(data[0].receiver_id || data[0].receiver?.id);
      }

      const now = Date.now();
      const normalized = data
        .filter((msg: any) => {
          const t = new Date(msg.timestamp).getTime();
          return now - t <= CACHE_EXPIRATION_MS;
        })
        .map((msg: any) => {
          let type = msg.msg_type || msg.type || 'text';
          if (['photo', 'image/jpeg', 'image/png'].includes(type)) type = 'image';
          if (['video/mp4', 'video'].includes(type) || type.toLowerCase().includes('video')) type = 'video';
          if (type === 'application/pdf') type = 'pdf';

          const attachment = msg.attachment
            ? msg.attachment.replace(/conversation_attachments/g, 'chat_attachments')
            : null;
          const thumbnail = msg.thumbnail_url
            ? msg.thumbnail_url.replace(/conversation_thumbnails/g, 'chat_thumbnails')
            : null;

          return {
            ...msg,
            id: Number(msg.id || msg.message_id),
            sender_id: msg.sender_id || msg.sender_user_id,
            type,
            attachment,
            thumbnail_url: thumbnail,
            name: msg.attachment?.split('/').pop() || '',
            pending: false,
            read: !!msg.read,
            timestamp: msg.timestamp || new Date().toISOString(),
          };
        });

      setMessages((prev) => {
        const merged = [
          ...prev.filter((m) => !normalized.some((n: any) => n.id === m.id)),
          ...normalized,
        ].sort((a, b) => a.id - b.id);

        localStorage.setItem(`messages_${conversationId}`, JSON.stringify(merged));
        normalized.forEach((m: any) => {
          if (m.id) receivedMessagesRef.current.add(m.id);
        });

        if (merged.some((m) => m.sender_id !== userId && !m.pending)) {
          markMessagesAsRead();
        }

        return merged;
      });
    } catch (err: any) {
      console.error('Fetch failed:', err);
      setFetchError(true);
      setErrorMessage(err.response?.data?.error || 'Could not load messages');
    }
  };

  const markMessagesAsRead = async () => {
    if (!conversationId || !sessionId) return;
    try {
      await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/mark-messages-read/',
        { conversation_id: conversationId },
        { headers: { Authorization: sessionId } }
      );
      setMessages((prev) =>
        prev.map((m) => (m.sender_id === userId && !m.read ? { ...m, read: true } : m))
      );
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  // ────────────────────────────────────────────────
  // WebSocket
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !userId || !sessionId) return;

    const url = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/chat/${conversationId}/?user_id=${userId}`;

    const connect = () => {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WS connected');
        markMessagesAsRead();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const now = Date.now();

          if (data.type === 'read_update' && data.message_ids) {
            const ids = data.message_ids.map(Number);
            setMessages((prev) =>
              prev.map((m) => (ids.includes(m.id) && !m.read ? { ...m, read: true } : m))
            );
            return;
          }

          if (data.type === 'unread_message_notification') return;

          const msgId = Number(data.message_id || data.id);
          const tempId = data.temp_id;

          if (receivedMessagesRef.current.has(msgId)) return;
          receivedMessagesRef.current.add(msgId);
          if (tempId) receivedMessagesRef.current.add(tempId as number);

          const isOwn = Number(data.sender_id) === userId;

          const msg = {
            id: msgId,
            temp_id: tempId,
            sender_id: data.sender_id,
            content: data.content || data.message || null,
            timestamp: data.timestamp || new Date().toISOString(),
            type: data.msg_type || data.type || 'text',
            attachment: data.attachment?.replace(/conversation_attachments/g, 'chat_attachments') || null,
            thumbnail_url: data.thumbnail_url?.replace(/conversation_thumbnails/g, 'chat_thumbnails') || null,
            read: !!data.read,
            pending: false,
            name: data.attachment?.split('/').pop(),
          };

          setMessages((prev) => {
            const idx = prev.findIndex(
              (m) => m.temp_id === tempId || (isOwn && m.pending && m.content === msg.content)
            );
            let updated = [...prev];

            if (idx !== -1) {
              updated[idx] = { ...updated[idx], ...msg, pending: false };
            } else {
              updated.push(msg);
            }

            updated = updated.filter((m) => now - new Date(m.timestamp).getTime() <= CACHE_EXPIRATION_MS);
            localStorage.setItem(`messages_${conversationId}`, JSON.stringify(updated));

            if (data.sender_id !== userId) {
              markMessagesAsRead();
            }

            return updated.sort((a, b) => a.id - b.id);
          });
        } catch (e) {
          console.warn('Invalid WS message', e);
        }
      };

      wsRef.current.onerror = (e) => console.error('WS error:', e);
      wsRef.current.onclose = () => {
        console.log('WS closed → reconnecting in 3s...');
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [conversationId, userId, sessionId]);

  // ────────────────────────────────────────────────
  // Send message
  // ────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!isShopActive) {
      alert('This shop is no longer active.');
      return;
    }

    const text = inputMessage.trim();
    if (!text || !conversationId || !userId || !sessionId) return;

    setInputMessage('');

    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const tempMsg = {
      id: tempId,
      temp_id: tempId,
      sender_id: userId,
      content: text,
      timestamp: new Date().toISOString(),
      type: 'text',
      pending: true,
      read: false,
    };

    setMessages((prev) => [...prev, tempMsg]);

    const sendViaWS = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            content: text,
            temp_id: tempId,
            sender_id: userId,
            conversation_id: conversationId,
            timestamp: new Date().toISOString(),
          })
        );
        return true;
      }
      return false;
    };

    if (sendViaWS()) return;

    // HTTP fallback
    try {
      await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/',
        { sender_id: userId, shop_id: shopId, content: text, conversation_id: conversationId },
        { headers: { Authorization: sessionId } }
      );
    } catch (err) {
      console.error('HTTP send failed:', err);
      setMessages((prev) => prev.filter((m) => m.temp_id !== tempId));
    }
  }, [inputMessage, conversationId, userId, sessionId, shopId, isShopActive]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversationId) {
    return (
      <PageShell title="Conversation">
        <div className="scon-chat-empty">
          <AlertCircle size={64} />
          <h2>No Conversation Selected</h2>
          <p>Please select a conversation from your list.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={name || 'Conversation'} isLoading={loading} showBackButton={true}>
      <div className="scon-chat-wrapper">

        {!isShopActive && (
          <div className="scon-error-banner" style={{ background: '#fee2e2', color: '#991b1b' }}>
            <AlertCircle size={20} />
            <span>This shop is no longer active. You cannot send new messages.</span>
          </div>
        )}

        <div className="scon-messages-container">
          {errorMessage && (
            <div className="scon-error-banner">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="scon-loading-messages">
              <Loader2 className="scon-spin" size={32} />
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="scon-empty-chat">
              <MessageCircle size={64} />
              <h3>No messages yet</h3>
              <p>Start the conversation!</p>
            </div>
          ) : (
            <div className="scon-messages-list">
              {messages.map((msg) => (
                <div
                  key={msg.id || msg.temp_id}
                  className={`scon-message ${msg.sender_id === userId ? 'scon-user-message' : 'scon-shop-message'}`}
                >
                  <div className="scon-message-content">
                    {msg.type === 'text' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <div className="scon-attachment-placeholder">
                        <span>
                          {msg.type.toUpperCase()} — {msg.name || 'Attachment'}
                        </span>
                        {msg.thumbnail_url && (
                          <img
                            src={msg.thumbnail_url}
                            alt={msg.name}
                            style={{ maxWidth: '180px', borderRadius: '6px', marginTop: '6px' }}
                          />
                        )}
                      </div>
                    )}

                    <div className="scon-message-meta">
                      <span className="scon-message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {msg.pending ? (
                        <Loader2 size={14} className="scon-spin" />
                      ) : (
                        msg.sender_id === userId && (
                          <CheckCheck
                            size={14}
                            color={msg.read ? 'var(--scon-read-check)' : 'var(--scon-unread-check)'}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {isShopActive && (
          <div className="scon-input-section">
            <button
              className="scon-attach-btn"
              onClick={() => setMenuVisible(true)}
              aria-label="Attach media"
            >
              <Menu size={20} />
            </button>

            <input
              type="text"
              className="scon-message-input"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              disabled={loading}
            />

            <button
              className="scon-send-btn"
              onClick={sendMessage}
              disabled={!inputMessage.trim() || loading}
              aria-label="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        )}

        {menuVisible && (
          <div className="scon-media-modal" onClick={() => setMenuVisible(false)}>
            <div className="scon-modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Send Media</h3>
              <button disabled>
                <ImageIcon size={20} /> Image (coming soon)
              </button>
              <button disabled>
                <Video size={20} /> Video (coming soon)
              </button>
              <button disabled>
                <FileText size={20} /> PDF (coming soon)
              </button>

              {userId === shopOwner && (
                <button
                  onClick={() => {
                    setMenuVisible(false);
                    navigate('/shop/GenerateReceipt', {
                      state: { shopId, senderId, conversation_id: conversationId },
                    });
                  }}
                >
                  <Receipt size={20} /> Generate Receipt
                </button>
              )}

              <button onClick={() => setMenuVisible(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Conversation;