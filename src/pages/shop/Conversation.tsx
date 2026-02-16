// Conversation.jsx
import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import PageShell from "../../components/PageShell";
import "../../css/shop/Conversation.css";

const Conversation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const conversationid = searchParams.get('conversationid');
  const shopid = searchParams.get('shopid') || searchParams.get('shopId');
  const prevRoute = searchParams.get('prevRoute');
  const name = searchParams.get('name');
  const shopisactive = searchParams.get('shopisactive');
  
  const [userId, setUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [senderId, setSenderId] = useState(null);
  const [shopOwner, setShopOwner] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  const flatListRef = useRef(null);
  const websocketRef = useRef(null);
  const receivedMessagesRef = useRef(new Set());
  const isScreenFocused = useRef(true);
  const lastMessagesLength = useRef(0);

  const isShopActive = shopisactive === 'true';
  const isValidConversationId = conversationid && !isNaN(parseInt(conversationid, 10));

  // Load session data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const sessionToken = localStorage.getItem('sessionToken');
        const userIdStr = localStorage.getItem('userid');
        setSessionId(sessionToken);
        if (userIdStr) {
          const parsedUserId = parseInt(userIdStr, 10);
          if (!isNaN(parsedUserId)) setUserId(parsedUserId);
        }
      } catch (error) {
        console.error('Error loading session data:', error);
      }
    };
    loadSessionData();
  }, []);

  // Load cached messages (simplified for web)
  const loadCachedMessages = useCallback(async () => {
    const cacheKey = `messages_${conversationid}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp, messages: cachedMessages } = JSON.parse(cached);
        const now = Date.now();
        if (timestamp && now - timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days
          return cachedMessages || [];
        }
      }
    } catch (error) {
      console.error('Error loading cached messages:', error);
    }
    return [];
  }, [conversationid]);

  // Simplified message fetching (replace with your API)
  const fetchMessages = useCallback(async () => {
    if (!isValidConversationId || !sessionId) return;
    
    setLoading(true);
    setFetchError(false);
    try {
      // Replace with your actual API call
      const response = await fetch(`/api/conversation/${conversationid}?limit=50`, {
        headers: { Authorization: sessionId }
      });
      const data = await response.json();
      
      const normalizedMessages = data.map(msg => ({
        ...msg,
        id: Number(msg.id),
        conversationid: Number(conversationid),
        read: msg.read || false,
        pending: msg.pending || false
      })).sort((a, b) => a.id - b.id);
      
      setMessages(normalizedMessages);
      setMessagesLoaded(true);
      setSenderId(data[0]?.sender_userid);
      setShopOwner(data[0]?.receiverid);
      
      // Scroll to bottom
      setTimeout(() => flatListRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [conversationid, sessionId, isValidConversationId]);

  // WebSocket connection (simplified)
  useEffect(() => {
    if (!isValidConversationId || !userId) return;

    const wsUrl = `wss://api.gogo-digital.com/ws/chat/${conversationid}?userid=${userId}`;
    websocketRef.current = new WebSocket(wsUrl);

    websocketRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    websocketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.conversationid !== conversationid) return;

        setMessages(prev => {
          const updated = [...prev, data].sort((a, b) => a.id - b.id);
          return updated;
        });

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 100);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    websocketRef.current.onclose = () => {
      console.log('WebSocket closed');
      // Auto-reconnect logic
      setTimeout(() => {
        if (isValidConversationId && userId) {
          // Recreate WebSocket
        }
      }, 3000);
    };

    return () => {
      websocketRef.current?.close();
    };
  }, [conversationid, userId, isValidConversationId]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !websocketRef.current || !isValidConversationId) return;
    
    if (websocketRef.current.readyState !== WebSocket.OPEN) {
      alert('Connection issue. Please try again.');
      return;
    }

    const tempId = Date.now();
    const message = {
      content: inputMessage,
      tempid: tempId,
      senderid: userId,
      conversationid: conversationid,
      timestamp: new Date().toISOString()
    };

    websocketRef.current.send(JSON.stringify(message));
    setInputMessage('');
    setIsAtBottom(true);
  }, [inputMessage, userId, conversationid, isValidConversationId]);

  const MessageItem = memo(({ item }) => {
    const isOwnMessage = item.senderid === userId;
    const formattedTime = new Date(item.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return (
      <div className={`message-wrapper ${isOwnMessage ? 'own' : 'other'}`}>
        <div className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
          {item.content && (
            <div className="message-content">
              <span className="message-text">{item.content}</span>
            </div>
          )}
          <div className="timestamp-container">
            <span className="timestamp-text">{formattedTime}</span>
            {isOwnMessage && item.read && (
              <span className="checkmark">✓✓</span>
            )}
          </div>
        </div>
      </div>
    );
  });

  const renderMessage = useCallback(({ item }) => (
    <MessageItem item={item} userId={userId} />
  ), [userId]);

  // Toggle attachment menu
  const toggleMenu = () => setMenuVisible(!menuVisible);

  return (
    <PageShell 
      title={name || 'Chat'} 
      showBackButton={true}
      onBack={() => navigate('/(tabs)/messages')}
    >
      <div className="conversation-container">
        {/* Shop Status Banner */}
        {!isShopActive && (
          <div className="deleted-shop-banner">
            <span>This shop is no longer active. You cannot send new messages.</span>
          </div>
        )}

        {/* Loading/Error Status */}
        {(loading || fetchError) && (
          <div className={`status-bar ${fetchError ? 'error' : 'loading'}`}>
            <div className="status-content">
              {loading ? (
                <>
                  <div className="spinner small" />
                  <span>Fetching new messages...</span>
                </>
              ) : (
                <>
                  <span>Failed to fetch messages</span>
                  <button className="retry-button" onClick={fetchMessages}>
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Messages List */}
        <div className="messages-wrapper" ref={flatListRef}>
          {messages.length === 0 && !loading && !messagesLoaded ? (
            <div className="empty-container">
              <span className="empty-text">No messages available</span>
              <button className="retry-button" onClick={fetchMessages}>
                Try Again
              </button>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <MessageItem key={`${message.id}-${message.attachment || ''}`} item={message} userId={userId} />
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        {isShopActive && (
          <div className="input-container">
            <input
              className="message-input"
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="menu-button" onClick={toggleMenu} title="Send media">
              📎
            </button>
            <button 
              className="send-button" 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
            >
              Send
            </button>
          </div>
        )}
      </div>

      {/* Attachment Menu Modal */}
      {menuVisible && (
        <div className="modal-overlay" onClick={() => setMenuVisible(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="drag-indicator" />
            <h3 className="modal-title">Send Options</h3>
            
            {/* Placeholder buttons - implement file upload */}
            <button className="option-card" onClick={() => {
              // Handle image upload
              setMenuVisible(false);
            }}>
              <span className="option-icon">📷</span>
              <span>Send Photo</span>
            </button>
            
            <button className="option-card" onClick={() => {
              // Handle video upload
              setMenuVisible(false);
            }}>
              <span className="option-icon">🎥</span>
              <span>Send Video</span>
            </button>
            
            <button className="option-card" onClick={() => {
              // Handle PDF upload
              setMenuVisible(false);
            }}>
              <span className="option-icon">📄</span>
              <span>Send PDF</span>
            </button>

            <button className="close-button" onClick={() => setMenuVisible(false)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default Conversation;
