// src/components/cart/AddCustomItemModal.tsx

import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import {
  Camera,
  Image as ImageIcon,
  X,
  PlusCircle,
} from 'lucide-react';

type Props = {
  visible: boolean;
  onClose: () => void;
  shopId: number;
  shopName: string;
  onAdd?: (item: {
    product_name: string;
    price: number;
    note?: string;
    image?: string; // base64 or URL on web
  }) => void;
  isSeller?: boolean; // default = buyer
};

export default function AddCustomItemModal({
  visible,
  onClose,
  shopId,
  shopName,
  onAdd,
  isSeller = false,
}: Props) {
  const { addItem } = useCart(); // only used if !isSeller

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Subscription state
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    if (visible) {
      checkSubscription();
    }
  }, [visible]);

  const checkSubscription = () => {
    try {
      const cache = localStorage.getItem('subscription_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        const plan = parsed.plan?.trim().toLowerCase();
        setIsSubscribed(['regular', 'standard', 'premium'].includes(plan));
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      setIsSubscribed(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setNote('');
    setImagePreview(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Web: handle file input for image
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSubscribed === false) {
      setSubscriptionModalVisible(true);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string); // base64 for preview
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      window.alert('Missing Name\nPlease enter item name.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      window.alert('Invalid Price\nPlease enter a valid price.');
      return;
    }

    setLoading(true);

    try {
      const itemData = {
        product_name: name.trim(),
        price: priceNum,
        note: note.trim() || undefined,
        image: imagePreview || undefined, // base64 string
      };

      // ONLY BUYER ADDS TO GLOBAL CART
      if (!isSeller) {
        addItem({
          shopId,
          shopName,
          shopProductId: null,
          product_name: itemData.product_name,
          price: itemData.price,
          original_price: Math.round(itemData.price),
          quantity: 1,
          note: itemData.note,
          image: itemData.image,
          is_custom: true,
        });
      }

      // Notify parent (buyer or seller)
      onAdd?.(itemData);

      window.alert('Added!', `"${name.trim()}" has been added to your order.`);
      handleClose();
    } catch (error) {
      console.error('Failed to add custom item:', error);
      window.alert('Error\nFailed to add item. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 9999,
        }}
        onClick={handleClose}
      >
        {/* Modal Content */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            width: '100%',
            maxWidth: 500,
            maxHeight: '90vh',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Add Custom Item
            </h2>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}
            >
              <X size={24} color="#64748B" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div
            style={{
              padding: 20,
              overflowY: 'auto',
              flex: 1,
            }}
          >
            {/* Item Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                Item Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Custom Logo Design"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  border: '1px solid #CBD5E1',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 16,
                  backgroundColor: '#F8FAFC',
                }}
              />
            </div>

            {/* Price */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                Price (₦) *
              </label>
              <input
                type="text"
                placeholder="25000"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                style={{
                  width: '100%',
                  border: '1px solid #CBD5E1',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 16,
                  backgroundColor: '#F8FAFC',
                }}
              />
            </div>

            {/* Note */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                Note (optional)
              </label>
              <textarea
                placeholder="e.g. Add extra large size, red color"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 80,
                  border: '1px solid #CBD5E1',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 16,
                  backgroundColor: '#F8FAFC',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Image */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                Image (optional)
              </label>

              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: 12,
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <Camera size={24} />
                  <span style={{ marginLeft: 8, fontWeight: 600 }}>Camera (not supported)</span>
                </label>

                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    padding: 12,
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <ImageIcon size={24} />
                  <span style={{ marginLeft: 8, fontWeight: 600 }}>Gallery</span>
                </label>
              </div>

              {imagePreview && (
                <div
                  style={{
                    position: 'relative',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '1px solid #CBD5E1',
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: 120,
                      objectFit: 'cover',
                    }}
                  />
                  <button
                    onClick={() => setImagePreview(null)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      borderRadius: '50%',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <X size={20} color="#EF4444" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              padding: 20,
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <button
              onClick={handleClose}
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: '#F1F5F9',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                fontWeight: 600,
                color: '#64748B',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleAdd}
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: loading ? '#94a3b8' : '#2563EB',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                color: 'white',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Adding...' : 'Add to Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Modal Placeholder */}
      {subscriptionModalVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              textAlign: 'center',
            }}
          >
            <h3>Subscription Required</h3>
            <p style={{ margin: '16px 0' }}>
              You need an active subscription to upload images.
            </p>
            <button
              onClick={() => setSubscriptionModalVisible(false)}
              style={{
                background: '#2563EB',
                color: 'white',
                padding: '12px 24px',
                borderRadius: 12,
                border: 'none',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}