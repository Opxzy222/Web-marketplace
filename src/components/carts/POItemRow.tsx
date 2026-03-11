// src/components/po/POItemRow.tsx

import React from 'react';
import { ImageOff } from 'lucide-react';

type Props = {
  item: {
    name: string;
    quantity: number;
    original_price: string;
    proposed_price: string;
    change_type: 'original' | 'buyer_changed' | 'seller_changed' | 'custom';
    image?: string;
  };
};

export default function POItemRow({ item }: Props) {
  const priceDiff = parseFloat(item.proposed_price) - parseFloat(item.original_price);
  const isSellerUp = item.change_type === 'seller_changed' && priceDiff > 0;
  const isSellerDown = item.change_type === 'seller_changed' && priceDiff < 0;
  const isCustom = item.change_type === 'custom';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Image or Placeholder */}
      {item.image ? (
        <img
          src={item.image}
          alt={item.name}
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            width: 56,
            height: 56,
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed #e2e8f0',
          }}
        >
          <ImageOff size={20} color="#94a3b8" />
        </div>
      )}

      {/* Details */}
      <div style={{ flex: 1, marginLeft: 12 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1e293b',
          }}
        >
          {item.name}
        </div>

        <div
          style={{
            fontSize: 14,
            color: '#64748b',
            marginTop: 2,
          }}
        >
          × {item.quantity}
        </div>

        {/* Price Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 6,
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: isSellerUp
                ? '#dc2626'
                : isSellerDown
                ? '#16a34a'
                : isCustom
                ? '#f59e0b'
                : '#000',
            }}
          >
            ₦{parseFloat(item.proposed_price).toLocaleString()}
          </span>

          {item.change_type === 'seller_changed' && priceDiff !== 0 && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: priceDiff > 0 ? '#dc2626' : '#16a34a',
              }}
            >
              {priceDiff > 0 ? '+' : ''}₦{Math.abs(priceDiff).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}