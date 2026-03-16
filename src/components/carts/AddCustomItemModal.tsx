// src/components/cart/AddCustomItemModal.tsx

import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import '../../css/carts/AddCustomItemModal.css';

import {
  Camera,
  Image as ImageIcon,
  X,
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
    image?: string;
  }) => void;
  isSeller?: boolean;
};

export default function AddCustomItemModal({
  visible,
  onClose,
  shopId,
  shopName,
  onAdd,
  isSeller = false,
}: Props) {
  const { addItem } = useCart();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setImagePreview(reader.result as string);
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
        image: imagePreview || undefined,
      };

      if (!isSeller) {
        addItem({
          shopId,
          shopName,
          product_name: itemData.product_name,
          price: itemData.price,
          original_price: Math.round(itemData.price),
          quantity: 1,
          note: itemData.note,
          image: itemData.image,
          is_custom: true,
        });
      }

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
      <div className="custitm-backdrop" onClick={handleClose}>
        <div className="custitm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="custitm-header">
            <h2 className="custitm-title">Add Custom Item</h2>
            <button className="custitm-close-btn" onClick={handleClose}>
              <X size={24} />
            </button>
          </div>

          <div className="custitm-body">
            <div className="custitm-form-group">
              <label className="custitm-label">Item Name *</label>
              <input
                type="text"
                className="custitm-input"
                placeholder="e.g. Custom Logo Design"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="custitm-form-group">
              <label className="custitm-label">Price (₦) *</label>
              <input
                type="text"
                className="custitm-input"
                placeholder="25000"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              />
            </div>

            <div className="custitm-form-group">
              <label className="custitm-label">Note (optional)</label>
              <textarea
                className="custitm-textarea"
                placeholder="e.g. Add extra large size, red color"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="custitm-form-group">
              <label className="custitm-label">Image (optional)</label>

              <div className="custitm-image-buttons">
                <label className="custitm-image-btn custitm-camera-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <Camera size={24} />
                  <span>Camera (not supported)</span>
                </label>

                <label className="custitm-image-btn custitm-gallery-btn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <ImageIcon size={24} />
                  <span>Gallery</span>
                </label>
              </div>

              {imagePreview && (
                <div className="custitm-image-preview-wrapper">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="custitm-image-preview"
                  />
                  <button
                    className="custitm-remove-image-btn"
                    onClick={() => setImagePreview(null)}
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="custitm-footer">
            <button
              className="custitm-btn custitm-btn-cancel"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              className="custitm-btn custitm-btn-add"
              onClick={handleAdd}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add to Order'}
            </button>
          </div>
        </div>
      </div>

      {subscriptionModalVisible && (
        <div className="custitm-subscription-backdrop">
          <div className="custitm-subscription-modal">
            <h3>Subscription Required</h3>
            <p>You need an active subscription to upload images.</p>
            <button
              className="custitm-btn custitm-btn-primary"
              onClick={() => setSubscriptionModalVisible(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}