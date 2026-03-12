// src/pages/cart/SellerPOCounter.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import '../../css/carts/SellerPOCounter.css';
import axios from 'axios';

import {
  CheckCircle,
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Minus,
  ShoppingCart,
  Image as LucideImage,
} from 'lucide-react';

import AddCustomItemModal from '../../components/carts/AddCustomItemModal';

const API_BASE = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

interface POItem {
  id: string;
  name: string;
  image_url?: string | null;
  custom_image_url?: string | null;
  quantity: number;
  original_price: number;
  proposed_price: number;
  added_by?: 'buyer' | 'seller';
  last_changed_by?: 'buyer' | 'seller' | null;   // ← NEW
  _source: 'server' | 'local_cart';
  note?: string;
  is_custom?: boolean;
}

const LuxeItemCard = ({
  item,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
}: {
  item: POItem;
  onUpdateQuantity: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onRemove: () => void;
}) => {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(item.proposed_price.toString());

  const handleSavePrice = () => {
    const price = parseFloat(priceInput) || item.original_price;
    onUpdatePrice(price);
    setEditingPrice(false);
  };

  // ──────────────────────────────────────────────
  // NEW: Correct who-changed badge using last_changed_by
  // ──────────────────────────────────────────────
  const getChangeInfo = () => {
    if (item.is_custom) {
      return { text: 'Custom Item', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' };
    }

    if (item.last_changed_by) {
      if (item.last_changed_by === 'seller') {
        return { text: 'You changed', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' };
      } else if (item.last_changed_by === 'buyer') {
        return { text: 'Buyer changed', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
      }
    }

    return null;
  };

  const change = getChangeInfo();
  const priceChanged = !!item.last_changed_by; // show strikethrough only if changed
  const displayImage = item.custom_image_url || item.image_url;

  return (
    <div className="sellcntr-item-card">
      {/* Thumbnail */}
      <div className="sellcntr-item-preview">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.name}
            className="sellcntr-item-image"
          />
        ) : (
          <div className="sellcntr-item-placeholder">
            <LucideImage size={32} />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="sellcntr-item-main">
        {/* Full-width name */}
        <h3 className="sellcntr-item-name">{item.name}</h3>

        {/* Note */}
        {item.note && (
          <div className="sellcntr-item-note">
            <MessageSquare size={14} />
            <span className="sellcntr-note-text">{item.note.trim()}</span>
          </div>
        )}

        {/* Controls */}
        <div className="sellcntr-item-controls">
          {/* Price section */}
          <div className="sellcntr-price-field">
            {editingPrice ? (
              <div className="sellcntr-price-edit">
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onBlur={handleSavePrice}
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePrice()}
                  autoFocus
                  className="sellcntr-price-input"
                />
                <button
                  className="sellcntr-save-btn"
                  onClick={handleSavePrice}
                >
                  <CheckCircle size={18} />
                </button>
              </div>
            ) : (
              <div className="sellcntr-price-display-container">
                <button
                  className="sellcntr-price-display"
                  onClick={() => setEditingPrice(true)}
                >
                  {priceChanged && (
                    <span className="sellcntr-old-price">
                      ₦{item.original_price.toLocaleString()}
                    </span>
                  )}
                  <span className="sellcntr-current-price">
                    ₦{item.proposed_price.toLocaleString()}
                  </span>
                </button>

                {change && !editingPrice && (
                  <div
                    className="sellcntr-status-pill sellcntr-price-status"
                    style={{ backgroundColor: change.bg }}
                  >
                    <span style={{ color: change.color }}>{change.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="sellcntr-quantity-field">
            <button
              className="sellcntr-qty-btn sellcntr-qty-minus"
              onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
            >
              <Minus size={16} />
            </button>
            <span className="sellcntr-qty-value">{item.quantity}</span>
            <button
              className="sellcntr-qty-btn sellcntr-qty-plus"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Delete button */}
          <button
            className="sellcntr-remove-btn"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SellerPOCounter() {
  const location = useLocation();
  const navigate = useNavigate();
  const { poId } = location.state || {};

  const [items, setItems] = useState<POItem[]>([]);
  const [buyerName, setBuyerName] = useState('Customer');
  const [shopId, setShopId] = useState<number | null>(null);
  const [version, setVersion] = useState(1);
  const [buyerMessage, setBuyerMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);

  const idCounter = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    setSessionToken(token);
  }, []);

  useEffect(() => {
    if (!poId || !sessionToken) return;

    const loadPO = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/po/seller/detail/${poId}/`, {
          headers: { Authorization: sessionToken },
        });

        const po = res.data.po;
        const versions = res.data.versions || [];
        const latest = versions.reduce((a: any, b: any) =>
          a.version > b.version ? a : b, versions[0] || { version: 1 }
        );

        setBuyerName(po.buyer_name || 'Customer');
        setShopId(po.shop_id || po.shop?.id || null);
        setVersion(latest.version);
        setBuyerMessage(latest.message || '');

        const fetched: POItem[] = (latest.items || []).map((i: any) => {
          const fallbackId = `server-item-${idCounter.current++}-${Date.now()}`;
          return {
            id: i.id?.toString() || fallbackId,
            name: i.custom_name || i.product_name || 'Item',
            image_url: i.image_url || null,
            custom_image_url: i.custom_image_url || null,
            quantity: Number(i.quantity) || 1,
            original_price: Number(i.original_price) || 0,
            proposed_price: Number(i.proposed_price) || 0,
            added_by: i.added_by,
            last_changed_by: i.last_changed_by,   // ← NEW
            _source: 'server' as const,
            note: i.note || '',
            is_custom: !!i.custom_name,
          };
        });

        setItems(fetched);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to load customer offer');
        navigate('/cart/seller-dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadPO();
  }, [poId, sessionToken, navigate]);

  const handleAddCustomItem = (itemData: {
    product_name: string;
    price: number;
    note?: string;
    image?: string;
  }) => {
    const newId = `custom-${Date.now()}-${idCounter.current++}`;

    const newItem: POItem = {
      id: newId,
      name: itemData.product_name,
      image_url: null,
      custom_image_url: itemData.image || null,
      quantity: 1,
      original_price: itemData.price,
      proposed_price: itemData.price,
      added_by: 'seller',
      last_changed_by: 'seller',   // ← NEW: seller added/changed it
      _source: 'local_cart',
      note: itemData.note?.trim(),
      is_custom: true,
    };

    setItems(prev => [...prev, newItem]);
    setCustomModalVisible(false);
  };

  const updateItem = (id: string, field: 'quantity' | 'proposed_price', value: number) => {
    setItems(prev =>
      prev.map(it => (it.id === id ? { ...it, [field]: value, added_by: 'seller' } : it))
    );
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const sendCounter = async () => {
    if (items.length === 0) {
      alert('Add at least one item');
      return;
    }

    setSending(true);
    const form = new FormData();
    form.append('po_id', poId);
    if (message.trim()) form.append('message', message.trim());

    items.forEach((it, i) => {
      const p = `items[${i}]`;
      form.append(`${p}[product_name]`, it.name);
      if (it.is_custom) form.append(`${p}[custom_name]`, it.name);
      form.append(`${p}[quantity]`, it.quantity.toString());
      form.append(`${p}[proposed_price]`, it.proposed_price.toString());
      form.append(`${p}[original_price]`, it.original_price.toString());
      if (it.note) form.append(`${p}[note]`, it.note);
    });

    try {
      await axios.post(`${API_BASE}/po/counter/`, form, {
        headers: {
          Authorization: sessionToken!,
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Counter offer sent!');
      setMessage('');
      navigate('/cart/seller-dashboard');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send counter offer');
    } finally {
      setSending(false);
    }
  };

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.proposed_price * i.quantity, 0),
    [items]
  );

  if (loading) {
    return (
      <div className="sellcntr-full-page-loader">
        <div className="sellcntr-loader-spinner"></div>
        <p className="sellcntr-loader-text">Loading customer offer...</p>
      </div>
    );
  }

  return (
    <PageShell
      title={buyerName}
      showBackButton={true}
      onBack={() => navigate('/cart/seller-editor', { state: { poId } })}
      version={`v${version}`}
    >
      <div className="sellcntr-page-container">
        {buyerMessage && (
          <div className="sellcntr-message-card">
            <p className="sellcntr-message-text">“{buyerMessage}”</p>
          </div>
        )}

        <div className="sellcntr-main-content">
          {items.length === 0 ? (
            <div className="sellcntr-empty-state">
              <ShoppingCart size={88} className="sellcntr-empty-icon" />
              <p className="sellcntr-empty-text">No items in this offer</p>
              <p className="sellcntr-empty-sub">Customer will see your response</p>
            </div>
          ) : (
            items.map((item) => (
              <LuxeItemCard
                key={item.id}
                item={item}
                onUpdateQuantity={(q) => updateItem(item.id, 'quantity', q)}
                onUpdatePrice={(p) => updateItem(item.id, 'proposed_price', p)}
                onRemove={() => removeItem(item.id)}
              />
            ))
          )}

          <button
            className="sellcntr-add-custom-btn"
            onClick={() => setCustomModalVisible(true)}
          >
            <Plus size={34} color="#f97316" />
            <span className="sellcntr-add-text">Add Custom Item</span>
          </button>

          <div className="sellcntr-message-section">
            <label className="sellcntr-message-label">
              Your message to customer (optional)
            </label>
            <textarea
              className="sellcntr-message-input"
              placeholder="E.g. Best deal I can offer at the moment."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
            />
            <p className="sellcntr-char-count">{message.length}/500</p>
          </div>

          <div className="sellcntr-total-card">
            <span className="sellcntr-total-label">Total Amount</span>
            <span className="sellcntr-total-price">
              ₦{total.toLocaleString('en-NG')}
            </span>
          </div>
        </div>

        <div className="sellcntr-footer">
          <button
            className={`sellcntr-send-btn ${sending || items.length === 0 ? 'sellcntr-send-btn-disabled' : ''}`}
            onClick={sendCounter}
            disabled={sending || items.length === 0}
          >
            {sending ? (
              <div className="sellcntr-loader-spinner" />
            ) : (
              <>
                <Send size={26} />
                <span className="sellcntr-send-text">Send Counter Offer</span>
              </>
            )}
          </button>
        </div>

        <AddCustomItemModal
          visible={customModalVisible}
          onClose={() => setCustomModalVisible(false)}
          shopId={shopId ?? undefined}
          shopName={buyerName}
          onAdd={handleAddCustomItem}
          isSeller={true}
        />
      </div>
    </PageShell>
  );
}