// src/pages/cart/BuyerCounterEditor.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageShell from '../../components/PageShell';
import '../../css/carts/BuyerCounterEditor.css'; // ← remember to update selectors in this file too
import axios from 'axios';

import {
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Eye,
  Navigation,
  ShoppingCart,
  Image as LucideImage,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Minus
} from 'lucide-react';

import AddCustomItemModal from '../../components/carts/AddCustomItemModal';
import { useCart } from '../../contexts/CartContext';

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

  const priceChanged = item.proposed_price !== item.original_price;
  const displayImage = item.custom_image_url || item.image_url;

  const getChangeInfo = () => {
    if (item.is_custom) {
      return { text: 'Custom Item', color: '#7C3AED', bg: '#FAF5FF' };
    }
    if (priceChanged && item.added_by === 'seller') {
      return { text: 'Seller changed', color: '#DC2626', bg: '#FEF2F2' };
    }
    if (priceChanged && item.added_by === 'buyer') {
      return { text: 'You changed', color: '#3B82F6', bg: '#EFF6FF' };
    }
    return null;
  };

  const change = getChangeInfo();

  return (
    <div className="buycntr-item-card">
      <div className="buycntr-item-preview">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.name}
            className="buycntr-item-image"
          />
        ) : (
          <div className="buycntr-item-placeholder">
            <LucideImage size={32} />
          </div>
        )}
      </div>

      <div className="buycntr-item-main">
        <h3 className="buycntr-item-name">{item.name}</h3>

        {item.note && (
          <div className="buycntr-item-note">
            <MessageSquare size={14} />
            <span className="buycntr-note-text">{item.note.trim()}</span>
          </div>
        )}

        <div className="buycntr-item-controls">
          <div className="buycntr-price-field">
            {editingPrice ? (
              <div className="buycntr-price-edit">
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  onBlur={handleSavePrice}
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePrice()}
                  autoFocus
                  className="buycntr-price-input"
                />
                <button className="buycntr-save-price-btn" onClick={handleSavePrice}>
                  <CheckCircle size={18} />
                </button>
              </div>
            ) : (
              <div className="buycntr-price-display-container">
                <button
                  className="buycntr-price-display"
                  onClick={() => setEditingPrice(true)}
                >
                  {priceChanged && (
                    <span className="buycntr-old-price">
                      ₦{item.original_price.toLocaleString()}
                    </span>
                  )}
                  <span className="buycntr-current-price">
                    ₦{item.proposed_price.toLocaleString()}
                  </span>
                </button>

                {change && !editingPrice && (
                  <div
                    className="buycntr-status-pill buycntr-price-status"
                    style={{ backgroundColor: change.bg }}
                  >
                    <span style={{ color: change.color }}>{change.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="buycntr-quantity-field">
            <button
              className="buycntr-qty-btn buycntr-qty-btn-minus"
              onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
              disabled={item.quantity <= 1}
            >
              <Minus size={16} />
            </button>
            <span className="buycntr-qty-value">{item.quantity}</span>
            <button
              className="buycntr-qty-btn buycntr-qty-btn-plus"
              onClick={() => onUpdateQuantity(item.quantity + 1)}
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            className="buycntr-remove-item-btn"
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

export default function BuyerCounterEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const { po_id } = location.state || {};

  const { getShopItems, clearShopCart } = useCart();

  const [items, setItems] = useState<POItem[]>([]);
  const [shopName, setShopName] = useState('Shop');
  const [shopId, setShopId] = useState<number | null>(null);
  const [version, setVersion] = useState(1);
  const [sellerMessage, setSellerMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [customModalVisible, setCustomModalVisible] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    setSessionToken(token);
  }, []);

  // Load PO + merge cart items
  useEffect(() => {
    if (!po_id || !sessionToken) return;

    const loadPO = async () => {
      try {
        setLoading(true);

        const res = await axios.get(`${API_BASE}/po/buyer/detail/${po_id}/`, {
          headers: { Authorization: sessionToken },
        });

        const po = res.data.po;
        const latest = res.data.versions.reduce((a: any, b: any) => (a.version > b.version ? a : b), { version: 1 });

        setShopName(po.shop_name || 'Shop');
        setShopId(po.shop_id || po.shop?.id || null);
        setVersion(latest.version);
        setSellerMessage(latest.message || '');

        const serverItems: POItem[] = (latest.items || []).map((i: any) => ({
          id: i.id?.toString() || `server-${Date.now()}-${Math.random()}`,
          name: i.custom_name || i.product_name || 'Item',
          image_url: i.image_url || null,
          custom_image_url: i.custom_image_url || null,
          quantity: Number(i.quantity) || 1,
          original_price: Number(i.original_price) || 0,
          proposed_price: Number(i.proposed_price) || 0,
          added_by: i.added_by,
          _source: 'server' as const,
          note: i.note || '',
          is_custom: !!i.custom_name,
        }));

        const cartItems = getShopItems(po.shop_id || po.shop?.id || 0);

        const merged = [...serverItems];
        cartItems.forEach(cartItem => {
          const exists = merged.some(s =>
            s.name === (cartItem.custom_name || cartItem.product_name) ||
            s.name === cartItem.product_name
          );

          if (!exists) {
            merged.push({
              id: `cart-${cartItem.id}-${Date.now()}`,
              name: cartItem.product_name || cartItem.custom_name || 'Item',
              image_url: cartItem.image || null,
              custom_image_url: null,
              quantity: cartItem.quantity,
              original_price: Math.round(cartItem.original_price || cartItem.price),
              proposed_price: Math.round(cartItem.price),
              added_by: 'buyer',
              _source: 'local_cart',
              note: cartItem.note || '',
              is_custom: !!cartItem.is_custom,
            });
          }
        });

        setItems(merged);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to load offer');
        navigate('/cart/buyer-dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadPO();
  }, [po_id, sessionToken, navigate, getShopItems]);

  const handleAddCustomItem = (itemData: {
    product_name: string;
    price: number;
    note?: string;
    image?: string;
  }) => {
    // Note: `addItem` is not defined in this file → assuming it's from context or typo
    // If it's missing, you'll need to import or get it from useCart()
    // addItem({...})

    const newItem: POItem = {
      id: `local-${Date.now()}-${Math.random()}`,
      name: itemData.product_name,
      image_url: null,
      custom_image_url: itemData.image || null,
      quantity: 1,
      original_price: itemData.price,
      proposed_price: itemData.price,
      added_by: 'buyer',
      _source: 'local_cart',
      note: itemData.note?.trim() || undefined,
      is_custom: true,
    };

    setItems(prev => [...prev, newItem]);
    setCustomModalVisible(false);
  };

  const updateItem = (id: string, field: 'quantity' | 'proposed_price', value: number) => {
    setItems(prev =>
      prev.map(it =>
        it.id === id ? { ...it, [field]: value, added_by: 'buyer' } : it
      )
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
    form.append('po_id', po_id);
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

      clearShopCart(shopId!);

      alert('Counter offer sent!');
      setMessage('');
      navigate('/cart/buyer-dashboard');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const total = useMemo(
    () => items.reduce((s, i) => s + i.proposed_price * i.quantity, 0),
    [items]
  );

  if (loading || !shopId) {
    return (
      <div className="buycntr-full-page-loader">
        <div className="buycntr-loader-spinner"></div>
        <p className="buycntr-loader-text">Loading shop offer...</p>
      </div>
    );
  }

  return (
    <PageShell
      title={shopName}
      showBackButton={true}
      onBack={() => navigate('/cart/buyer-editor', { state: { poId: po_id } })}
      version={`v${version}`}
    >
      <div className="buycntr-page-container">
        {sellerMessage && (
          <div className="buycntr-seller-message-card">
            <p className="buycntr-seller-message-text">“{sellerMessage}”</p>
          </div>
        )}

        <div className="buycntr-main-content">
          {items.length === 0 ? (
            <div className="buycntr-empty-state">
              <ShoppingCart size={88} className="buycntr-empty-icon" />
              <p className="buycntr-empty-text">No items in this offer</p>
              <p className="buycntr-empty-subtext">Vendor will see your response</p>
            </div>
          ) : (
            items.map(item => (
              <LuxeItemCard
                key={item.id}
                item={item}
                onUpdateQuantity={q => updateItem(item.id, 'quantity', q)}
                onUpdatePrice={p => updateItem(item.id, 'proposed_price', p)}
                onRemove={() => removeItem(item.id)}
              />
            ))
          )}

          <button
            className="buycntr-add-custom-item-btn"
            onClick={() => setCustomModalVisible(true)}
          >
            <Plus size={34} color="#3B82F6" />
            <span className="buycntr-add-btn-label">Add Custom Item</span>
          </button>

          <div className="buycntr-message-section">
            <label className="buycntr-message-label">
              Your message to shop (optional)
            </label>
            <textarea
              className="buycntr-message-textarea"
              placeholder="E.g. Can you come down on the price?"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
            />
            <p className="buycntr-char-counter">{message.length}/500</p>
          </div>

          <div className="buycntr-total-summary-card">
            <span className="buycntr-total-label">Total Amount</span>
            <span className="buycntr-total-amount">
              ₦{total.toLocaleString('en-NG')}
            </span>
          </div>
        </div>

        <div className="buycntr-action-footer">
          <button
            className={`buycntr-send-counter-btn ${sending || items.length === 0 ? 'buycntr-send-counter-btn-disabled' : ''}`}
            onClick={sendCounter}
            disabled={sending || items.length === 0}
          >
            {sending ? (
              <div className="buycntr-small-spinner" />
            ) : (
              <>
                <Send size={26} />
                <span className="buycntr-send-btn-text">Send Counter Offer</span>
              </>
            )}
          </button>
        </div>

        <AddCustomItemModal
          visible={customModalVisible}
          onClose={() => setCustomModalVisible(false)}
          shopId={shopId}
          shopName={shopName}
          onAdd={handleAddCustomItem}
        />
      </div>
    </PageShell>
  );
}