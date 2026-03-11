// src/components/cart/CartItemRow.tsx

import React, { useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { Trash2, Plus, Minus, Check, ImageOff } from 'lucide-react';

type Props = {
  item: {
    id: string;
    product_name?: string;
    name?: string;
    image?: string;
    price: number;
    original_price: number;
    quantity: number;
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Image / Placeholder */}
      {item.image ? (
        <button
          onClick={() => onOpenImageViewer?.(item.image)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            opacity: 0.9,
          }}
        >
          <img
            src={item.image}
            alt={displayName}
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              objectFit: 'cover',
            }}
          />
        </button>
      ) : (
        <div
          style={{
            width: 64,
            height: 64,
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed #e2e8f0',
          }}
        >
          <ImageOff size={24} color="#94a3b8" />
        </div>
      )}

      {/* Details */}
      <div
        style={{
          flex: 1,
          marginLeft: 14,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {displayName}
        </div>

        {/* Price Edit */}
        {editingPrice ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <input
              type="text"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              style={{
                borderBottom: '1.5px solid #2563eb',
                width: 90,
                fontSize: 15,
                fontWeight: 600,
                padding: '2px 0',
                outline: 'none',
              }}
              autoFocus
              onBlur={handlePriceSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePriceSave();
              }}
            />
            <button onClick={handlePriceSave} style={{ background: 'none', border: 'none', padding: 0 }}>
              <Check size={20} color="#10b981" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingPrice(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontSize: 15,
                color: item.price !== item.original_price ? '#dc2626' : '#16a34a',
                fontWeight: 600,
              }}
            >
              ₦{item.price.toLocaleString()}
              {item.price !== item.original_price && ' (edited)'}
            </span>
          </button>
        )}

        {/* Quantity Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 8,
          }}
        >
          <button
            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
            disabled={item.quantity <= 1}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
              opacity: item.quantity <= 1 ? 0.4 : 1,
            }}
          >
            <Minus
              size={26}
              color={item.quantity <= 1 ? '#cbd5e1' : '#64748b'}
            />
          </button>

          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              minWidth: 28,
              textAlign: 'center',
              color: '#1e293b',
            }}
          >
            {item.quantity}
          </span>

          <button
            onClick={() => updateQuantity(item.id, item.quantity + 1)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <Plus size={26} color="#64748b" />
          </button>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => removeItem(item.id)}
        style={{
          background: 'none',
          border: 'none',
          padding: 6,
          cursor: 'pointer',
        }}
      >
        <Trash2 size={22} color="#ef4444" />
      </button>
    </div>
  );
}