// components/shop/StartConversation.jsx
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
} from 'lucide-react';
import PageShell from '../../components/PageShell';
import '../../css/shop/StartConversation.css';

const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const StartConversation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopId: rawShopId, name } = location.state || {};

  const shopId = rawShopId ? String(rawShopId) : null;

  const [userId, setUserId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const receivedMessagesRef = useRef(new Set<number>());

  // ────────────────────────────────────────────────
  // Initial load & auth
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!shopId || shopId === 'undefined' || shopId === 'null') {
      setErrorMessage('Cannot start chat: shop information is missing.');
      setLoading(false);
      return;
    }

    const loadInitialData = async () => {
      setLoading(true);
      setFetchError(false);
      setErrorMessage('');

      try {
        const token = localStorage.getItem('sessionToken');
        const userStr = localStorage.getItem('user_id');

        if (!token || !userStr) {
          navigate('/login');
          return;
        }

        const uid = parseInt(userStr, 10);
        if (isNaN(uid)) throw new Error('Invalid user id');

        setUserId(uid);
        setSessionId(token);

        // Cache check
        const convCacheKey = `conversation_${shopId}`;
        const cachedConv = localStorage.getItem(convCacheKey);

        if (cachedConv) {
          const { id, timestamp } = JSON.parse(cachedConv);
          if (Date.now() - timestamp < CACHE_EXPIRATION_MS) {
            const convId = String(id);
            setConversationId(convId);

            const msgCacheKey = `messages_${convId}`;
            const cachedMsgs = localStorage.getItem(msgCacheKey);
            if (cachedMsgs) {
              const parsed = JSON.parse(cachedMsgs);
              setMessages(parsed);
              parsed.forEach((m: any) => {
                if (m.id) receivedMessagesRef.current.add(Number(m.id));
              });
            }
          } else {
            localStorage.removeItem(convCacheKey);
          }
        }

        await fetchMessages(token, uid);
      } catch (err: any) {
        console.error('Initial load failed:', err);
        setFetchError(true);
        setErrorMessage(err.response?.data?.error || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [shopId, navigate]);

  // ────────────────────────────────────────────────
  // Fetch messages (initial or retry)
  // ────────────────────────────────────────────────
  const fetchMessages = async (token: string, uid: number) => {
    try {
      const res = await axios.get(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/?user_id=${uid}&shop_id=${shopId}`,
        { headers: { Authorization: token } }
      );

      const data = res.data;
      const newConvId = String(data.conversation_id);

      if (newConvId && newConvId !== 'null' && newConvId !== 'undefined') {
        setConversationId(newConvId);
        localStorage.setItem(`conversation_${shopId}`, JSON.stringify({
          id: newConvId,
          timestamp: Date.now(),
        }));

        const normalized = (data.messages || []).map((msg: any) => ({
          ...msg,
          id: Number(msg.id || msg.message_id),
          sender_id: msg.sender_id || msg.sender_user_id || msg.senderid,
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
          pending: false,
          read: !!msg.read,
        }));

        setMessages(normalized);
        localStorage.setItem(`messages_${newConvId}`, JSON.stringify(normalized));

        normalized.forEach((m: any) => {
          if (m.id) receivedMessagesRef.current.add(Number(m.id));
        });
      }
    } catch (err: any) {
      console.error('Fetch messages failed:', err);
      setFetchError(true);
      setErrorMessage(err.response?.data?.error || 'Could not load messages');
    }
  };

  // ────────────────────────────────────────────────
  // WebSocket
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !/^\d+$/.test(conversationId) || !userId || !sessionId) return;

    const url = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/chat/${conversationId}?user_id=${userId}`;

    const connect = () => {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => console.log('WS connected');

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const now = Date.now();
          const msgTime = new Date(data.timestamp || now).getTime();
          if (now - msgTime > CACHE_EXPIRATION_MS) return;

          setMessages((prev) => {
            let updated = [...prev];

            if (data.type === 'read_update' && data.message_ids) {
              const ids = data.message_ids.map(Number).filter(Boolean);
              updated = updated.map((m) =>
                ids.includes(m.id) && !m.read ? { ...m, read: true } : m
              );
            } else {
              const msgId = Number(data.message_id || data.id);
              const tempId = data.temp_id;
              const isOwn = Number(data.sender_id || data.sender_user_id) === userId;

              if (receivedMessagesRef.current.has(msgId) || (tempId && receivedMessagesRef.current.has(tempId))) {
                return prev;
              }

              receivedMessagesRef.current.add(msgId);
              if (tempId) receivedMessagesRef.current.add(tempId as number);

              const normalized = {
                id: msgId,
                temp_id: tempId,
                sender_id: data.sender_id || data.sender_user_id,
                content: data.content || data.message || null,
                timestamp: data.timestamp || new Date().toISOString(),
                type: data.type || 'text',
                pending: false,
                read: !!data.read,
              };

              const existingIdx = updated.findIndex(
                (m) =>
                  m.temp_id === tempId ||
                  (isOwn && m.content === normalized.content && m.pending)
              );

              if (existingIdx !== -1) {
                updated[existingIdx] = { ...updated[existingIdx], ...normalized, pending: false, id: msgId };
              } else {
                updated.push(normalized);
              }
            }

            updated = updated.filter((m) => {
              const t = new Date(m.timestamp).getTime();
              return now - t <= CACHE_EXPIRATION_MS;
            });

            localStorage.setItem(`messages_${conversationId}`, JSON.stringify(updated));
            return updated;
          });
        } catch (e) {
          console.warn('Invalid WS message', e);
        }
      };

      wsRef.current.onerror = (e) => console.error('WS error:', e);
      wsRef.current.onclose = () => {
        console.log('WS closed → reconnecting in 3s...');
        setTimeout(() => {
          if (conversationId && userId && sessionId && !wsRef.current) connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, userId, sessionId]);

  // ────────────────────────────────────────────────
  // Send message
  // ────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputMessage.trim();
    if (!text || !userId || !sessionId || !shopId) return;

    setInputMessage('');

    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const tempMsg = {
      id: tempId,
      temp_id: tempId,
      sender_id: userId,
      content: text,
      timestamp: new Date().toISOString(),
      pending: true,
      type: 'text',
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

    if (conversationId && sendViaWS()) return;

    // Fallback to HTTP
    try {
      const res = await axios.post(
        'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/',
        { sender_id: userId, shop_id: shopId, content: text },
        { headers: { Authorization: sessionId } }
      );

      const { id: serverId, conversation_id: newConvId } = res.data;
      const convIdStr = String(newConvId);

      setConversationId(convIdStr);
      localStorage.setItem(`conversation_${shopId}`, JSON.stringify({ id: convIdStr, timestamp: Date.now() }));

      setMessages((prev) =>
        prev.map((m) =>
          m.temp_id === tempId
            ? { ...m, id: Number(serverId), conversation_id: convIdStr, pending: false, temp_id: null }
            : m
        )
      );

      receivedMessagesRef.current.add(Number(serverId));
    } catch (err) {
      console.error('HTTP send failed:', err);
      setMessages((prev) => prev.filter((m) => m.temp_id !== tempId));
    }
  }, [inputMessage, userId, sessionId, shopId, conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!shopId) {
    return (
      <PageShell title="Chat">
        <div className="scon-chat-empty">
          <AlertCircle size={64} />
          <h2>No Shop Selected</h2>
          <p>Please select a shop from the shop list.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={name || 'Chat'} isLoading={loading} showBackButton={true}>
      <div className="scon-chat-wrapper">
        <div className="scon-chat-header">
          <button
            className="scon-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1>{name || 'Conversation'}</h1>
          {fetchError && (
            <button className="scon-retry-btn" onClick={() => fetchMessages(sessionId!, userId!)}>
              Retry
            </button>
          )}
        </div>

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
                    <p>{msg.content}</p>

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
              <button onClick={() => setMenuVisible(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default StartConversation;