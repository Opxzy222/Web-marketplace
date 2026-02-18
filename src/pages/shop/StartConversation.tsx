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
  Check,
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

  // Normalize shopId early
  const shopId = rawShopId ? String(rawShopId) : null;

  const [userId, setUserId]         = useState(null);
  const [sessionId, setSessionId]   = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages]     = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);   // ← this line was missing!

  const messagesEndRef     = useRef(null);
  const wsRef              = useRef(null);
  const receivedMessagesRef = useRef(new Set());

  // ────────────────────────────────────────────────
  // 1. Load auth & initial conversation data
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!shopId || shopId === 'undefined' || shopId === 'null') {
      console.error('Invalid or missing shopId in navigation state', { rawShopId, locationState: location.state });
      setErrorMessage('Cannot start chat: shop information is missing.');
      setLoading(false);
      return;
    }

    console.log('Chat started with:', {
      shopId,
      shopIdType: typeof shopId,
      name,
      userIdFromStorage: localStorage.getItem('user_id'),
      tokenExists: !!localStorage.getItem('sessionToken'),
    });

    const loadInitialData = async () => {
      setLoading(true);
      setFetchError(false);
      setErrorMessage('');

      try {
        const token   = localStorage.getItem('sessionToken');
        const userStr = localStorage.getItem('user_id');

        if (!token || !userStr) {
          navigate('/login');
          return;
        }

        const uid = parseInt(userStr, 10);
        if (isNaN(uid)) throw new Error('Invalid user id in storage');

        setUserId(uid);
        setSessionId(token);

        // Try cache first
        const convCacheKey = `conversation_${shopId}`;
        const cachedConv   = localStorage.getItem(convCacheKey);

        let convId = null;
        if (cachedConv) {
          try {
            const { id, timestamp } = JSON.parse(cachedConv);
            if (Date.now() - timestamp < CACHE_EXPIRATION_MS) {
              convId = String(id);
              setConversationId(convId);

              const msgCacheKey = `messages_${convId}`;
              const cachedMsgs = localStorage.getItem(msgCacheKey);
              if (cachedMsgs) {
                const parsed = JSON.parse(cachedMsgs);
                setMessages(parsed);
                parsed.forEach(m => {
                  if (m.id) receivedMessagesRef.current.add(Number(m.id));
                });
              }
            } else {
              localStorage.removeItem(convCacheKey);
            }
          } catch (e) {
            console.warn('Invalid conversation cache format', e);
            localStorage.removeItem(convCacheKey);
          }
        }

        // Fetch fresh data
        await fetchMessages(token, uid);
      } catch (err) {
        console.error('Initial load failed:', err);
        setFetchError(true);
        setErrorMessage(err.response?.data?.error || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [shopId, navigate, location.state]);

  // ────────────────────────────────────────────────
  // Fetch messages (HTTP fallback / conversation start)
  // ────────────────────────────────────────────────
  const fetchMessages = async (token, uid) => {
    try {
      const url = `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/?user_id=${uid}&shop_id=${shopId}`;
      console.log('Fetching messages from:', url);

      const res = await axios.get(url, {
        headers: { Authorization: token },
      });

      const data = res.data;
      console.log('Fetch messages response:', data);

      const newConvId = String(data.conversation_id);

      if (newConvId && newConvId !== 'null' && newConvId !== 'undefined') {
        setConversationId(newConvId);
        localStorage.setItem(`conversation_${shopId}`, JSON.stringify({
          id: newConvId,
          timestamp: Date.now(),
        }));

        const normalized = (data.messages || []).map(msg => ({
          ...msg,
          id: Number(msg.id || msg.message_id),
          sender_id: msg.sender_id || msg.sender_user_id || msg.senderid,
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
          pending: false,
          read: !!msg.read,
        }));

        setMessages(normalized);
        localStorage.setItem(`messages_${newConvId}`, JSON.stringify(normalized));

        normalized.forEach(m => {
          if (m.id) receivedMessagesRef.current.add(Number(m.id));
        });
      } else {
        console.warn('No valid conversation_id returned from server');
      }
    } catch (err) {
      console.error('Fetch messages failed:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        url: err.config?.url,
      });
      setFetchError(true);
      setErrorMessage(err.response?.data?.error || 'Could not load messages');
    }
  };

  // ────────────────────────────────────────────────
  // WebSocket connection
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null' || !/^\d+$/.test(conversationId) || !userId || !sessionId) {
      console.log('Skipping WebSocket connect - invalid ID or missing data:', { conversationId, userId, sessionId });
      return;
    }

    const connectWebSocket = () => {
      const url = `wss://retail-alvinia-goza-f6a0e4f7.koyeb.app/ws/chat/${conversationId}?user_id=${userId}`;
      console.log('Connecting WebSocket:', url);

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
      };

      wsRef.current.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          console.warn('Invalid WebSocket message format', event.data);
          return;
        }

        const now = Date.now();
        const msgTime = new Date(data.timestamp || Date.now()).getTime();
        if (now - msgTime > CACHE_EXPIRATION_MS) return;

        setMessages(prev => {
          let updated = [...prev];

          if (data.type === 'read_update' && data.message_ids) {
            const ids = data.message_ids.map(Number).filter(Boolean);
            updated = updated.map(m => {
              if (ids.includes(m.id) && !m.read) {
                return { ...m, read: true };
              }
              return m;
            });
          } else {
            const msgId   = Number(data.message_id || data.id);
            const tempId  = data.temp_id;
            const isOwn   = Number(data.sender_id || data.sender_user_id) === userId;

            if (receivedMessagesRef.current.has(msgId)) return prev;
            if (tempId && receivedMessagesRef.current.has(tempId)) return prev;

            receivedMessagesRef.current.add(msgId);
            if (tempId) receivedMessagesRef.current.add(tempId);

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

            const existingIdx = updated.findIndex(m =>
              m.temp_id === tempId ||
              (isOwn && m.content === normalized.content && m.pending)
            );

            if (existingIdx !== -1) {
              updated[existingIdx] = {
                ...updated[existingIdx],
                ...normalized,
                pending: false,
                id: msgId,
              };
            } else {
              updated.push(normalized);
            }
          }

          updated = updated.filter(m => {
            const t = new Date(m.timestamp).getTime();
            return now - t <= CACHE_EXPIRATION_MS;
          });

          localStorage.setItem(`messages_${conversationId}`, JSON.stringify(updated));

          return updated;
        });
      };

      wsRef.current.onerror = (e) => {
        console.error('WebSocket error:', e);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed. Reconnecting in 3s...');
        setTimeout(() => {
          if (conversationId && userId && sessionId && !wsRef.current) {
            connectWebSocket();
          }
        }, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [conversationId, userId, sessionId]);

  // ────────────────────────────────────────────────
  // Send message – WS preferred, HTTP fallback
  // ────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputMessage.trim();
    if (!text || !userId || !sessionId || !shopId) return;

    setInputMessage('');

    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
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

    setMessages(prev => [...prev, tempMsg]);

    const sendViaWS = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          content: text,
          temp_id: tempId,
          sender_id: userId,
          conversation_id: conversationId,
          timestamp: new Date().toISOString(),
        }));
        return true;
      }
      return false;
    };

    const sendViaHTTP = async () => {
      try {
        const payload = {
          sender_id: userId,
          shop_id: shopId,
          content: text,
        };

        const res = await axios.post(
          'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/messages/',
          payload,
          { headers: { Authorization: sessionId } }
        );

        const { id: serverId, conversation_id: newConvId } = res.data;

        const convIdStr = String(newConvId);

        setConversationId(convIdStr);
        localStorage.setItem(`conversation_${shopId}`, JSON.stringify({
          id: convIdStr,
          timestamp: Date.now(),
        }));

        setMessages(prev =>
          prev.map(m =>
            m.temp_id === tempId
              ? {
                  ...m,
                  id: Number(serverId),
                  conversation_id: convIdStr,
                  pending: false,
                  temp_id: null,
                }
              : m
          )
        );

        receivedMessagesRef.current.add(Number(serverId));
      } catch (err) {
        console.error('HTTP send failed:', err);
        setMessages(prev => prev.filter(m => m.temp_id !== tempId));
      }
    };

    if (conversationId && sendViaWS()) {
      // WS sent → optimistic update already done
    } else {
      // No WS or first message → use HTTP
      await sendViaHTTP();
    }
  }, [inputMessage, userId, sessionId, shopId, conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!shopId) {
    return (
      <PageShell title="Chat">
        <div className="chat-empty">
          <AlertCircle size={64} />
          <h2>No Shop Selected</h2>
          <p>Please select a shop from the shop list.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={name || 'Chat'} isLoading={loading} showBackButton={true}>
      <div className="chat-wrapper">
        <div className="chat-header">
          <button onClick={() => navigate(-1)} className="back-btn">
            <ArrowLeft size={24} />
          </button>
          <h1>{name || 'Conversation'}</h1>
          {fetchError && (
            <button
              onClick={() => fetchMessages(sessionId, userId)}
              className="retry-btn"
            >
              Retry
            </button>
          )}
        </div>

        <div className="messages-container">
          {errorMessage && (
            <div className="error-banner">
              <AlertCircle size={20} />
              <span>{errorMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="loading-messages">
              <Loader2 className="spin" size={32} />
              <p>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-chat">
              <MessageCircle size={64} />
              <h3>No messages yet</h3>
              <p>Start the conversation!</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map(msg => (
                <div
                  key={msg.id || msg.temp_id}
                  className={`message ${msg.sender_id === userId ? 'user-message' : 'shop-message'}`}
                >
                  <div className="message-content">
                    <p>{msg.content}</p>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {msg.pending && <Loader2 size={16} className="spin small" />}
                    {!msg.pending && msg.sender_id === userId && (
                      <CheckCheck
                        size={16}
                        color={msg.read ? '#2563eb' : '#6b7280'}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="input-section">
          <button className="attach-btn" onClick={() => setMenuVisible(true)}>
            <Menu size={20} />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type a message..."
            className="message-input"
          />

          <button
            onClick={sendMessage}
            className="send-btn"
            disabled={!inputMessage.trim() || loading}
          >
            <Send size={20} />
          </button>
        </div>

        {menuVisible && (
          <div className="media-modal" onClick={() => setMenuVisible(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>Send Media</h3>
              <button disabled><ImageIcon size={20} /> Image (coming soon)</button>
              <button disabled><Video size={20} /> Video (coming soon)</button>
              <button disabled><FileText size={20} /> PDF (coming soon)</button>
              <button onClick={() => setMenuVisible(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default StartConversation;