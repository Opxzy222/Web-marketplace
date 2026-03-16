// src/components/cart/CartItemRow.tsx

import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { Trash2, Plus, Minus, Check, ImageOff } from 'lucide-react';
import '../../css/carts/CartItemRow.css';

type Props = {
  item: {
    id: string;
    product_name?: string;
    name?: string;
    image?: string;
    price: number;
    original_price: number;
    quantity: number;
    productId: string; // assuming typo fix: product.id → string
  };
  onOpenImageViewer?: (imageUrl: string) => void;
};

export default function CartItemRow({ item, onOpenImageViewer }: Props) {
  const { updateQuantity, updatePrice, removeItem } = useCart();
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(item.price.toString());

  const handlePriceSave = () => {
    const newPrice = parseFloat(priceInput) || item.original_price;
    updatePrice(item.id, newPrice);
    setEditingPrice(false);
  };

  const displayName = item.product_name || item.name || 'Item';

  return (
    <div className="CartItrw-row">
      {/* Image / Placeholder */}
      {item.image ? (
        <button
          className="CartItrw-image-btn"
          onClick={() => onOpenImageViewer?.(item.image)}
        >
          <img
            src={item.image}
            alt={displayName}
            className="CartItrw-image"
          />
        </button>
      ) : (
        <div className="CartItrw-placeholder">
          <ImageOff size={24} />
        </div>
      )}

      {/* Details */}
      <div className="CartItrw-content">
        <div className="CartItrw-name">{displayName}</div>

        {/* Price Edit */}
        {editingPrice ? (
          <div className="CartItrw-price-edit">
            <input
              type="text"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="CartItrw-price-input"
              autoFocus
              onBlur={handlePriceSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePriceSave();
              }}
            />
            <button
              onClick={handlePriceSave}
              className="CartItrw-check-btn"
            >
              <Check size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingPrice(true)}
            className="CartItrw-price-btn"
          >
            <span
              className={`CartItrw-price-text ${
                item.price !== item.original_price
                  ? 'CartItrw-price-edited'
                  : 'CartItrw-price-original'
              }`}
            >
              ₦{item.price.toLocaleString()}
              {item.price !== item.original_price && ' (edited)'}
            </span>
          </button>
        )}

        {/* Quantity Controls */}
        <div className="CartItrw-quantity">
          <button
            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
            disabled={item.quantity <= 1}
            className="CartItrw-qty-btn CartItrw-qty-decrease"
          >
            <Minus size={26} />
          </button>

          <span className="CartItrw-qty-value">{item.quantity}</span>

          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            className="CartItrw-qty-btn CartItrw-qty-increase"
          >
            <Plus size={26} />
          </button>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => removeItem(item.id)}
        className="CartItrw-remove-btn"
      >
        <Trash2 size={22} />
      </button>
    </div>
  );
}