// src/components/cart/PickupItemPreviewSheet.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCircle, CheckCircle, Eye, ChevronRight } from 'lucide-react';

const CARD_HEIGHT = 140;

type Item = {
  display_name: string;
  quantity: number;
  proposed_price: string;
  image_url?: string | null;
  custom_image_url?: string | null;
  note?: string | null;
};

type PickupSheetProps = {
  items: Item[];
  onClose: () => void;
  buyerName?: string;
  title?: string;
};

export const PickupItemPreviewSheet = ({
  items,
  onClose,
  buyerName = 'Customer',
  title = 'Order Items',
}: PickupSheetProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.proposed_price) * item.quantity,
    0
  );

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 9998,
          }}
          onClick={onClose}
        />
      </AnimatePresence>

      {/* Bottom Sheet */}
      <AnimatePresence>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '92vh',
            backgroundColor: '#FAFAFA',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            overflow: 'hidden',
            zIndex: 9999,
            boxShadow: '0 -10px 30px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px 12px',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#F1F5F9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={26} color="#1E293B" />
              </button>

              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#1E293B',
                  margin: 0,
                }}
              >
                {title}
              </h2>

              <div style={{ width: 44 }} /> {/* spacer */}
            </div>

            {/* Buyer Tag (if name provided) */}
            {buyerName !== 'Customer' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '16px 20px',
                  backgroundColor: '#ECFDF5',
                  padding: '12px 16px',
                  borderRadius: 20,
                  gap: 10,
                  border: '1.5px solid #86EFAC',
                  alignSelf: 'flex-start',
                }}
              >
                <UserCircle size={28} color="#16A34A" />
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#166534',
                  }}
                >
                  {buyerName}
                </span>
                <div
                  style={{
                    backgroundColor: '#16A34A',
                    padding: '6px 12px',
                    borderRadius: 12,
                    marginLeft: 'auto',
                  }}
                >
                  <span
                    style={{
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Ready for Pickup
                  </span>
                </div>
              </motion.div>
            )}

            {/* Scrollable List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div
                style={{
                  padding: '8px 20px 120px',
                }}
              >
                {items.map((item, index) => {
                  const image = item.custom_image_url || item.image_url;

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.08,
                        type: 'spring',
                        damping: 20,
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 24,
                        padding: 16,
                        marginBottom: 14,
                        height: CARD_HEIGHT,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        border: '1px solid #F1F5F9',
                      }}
                    >
                      {/* Image with Quantity Badge */}
                      <button
                        onClick={() => image && setSelectedImage(image)}
                        style={{
                          position: 'relative',
                          marginRight: 16,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={item.display_name}
                            style={{
                              width: 100,
                              height: 100,
                              borderRadius: 18,
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 100,
                              height: 100,
                              backgroundColor: '#F8FAFC',
                              borderRadius: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '2px dashed #E2E8F0',
                            }}
                          >
                            <ImageOff size={32} color="#CBD5E1" />
                          </div>
                        )}

                        {/* Quantity Badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            backgroundColor: '#10B981',
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '3px solid white',
                          }}
                        >
                          <span
                            style={{
                              color: 'white',
                              fontSize: 16,
                              fontWeight: 900,
                            }}
                          >
                            {item.quantity}x
                          </span>
                        </div>
                      </button>

                      {/* Details */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: '#1E293B',
                            lineHeight: '24px',
                            marginBottom: 6,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.display_name}
                        </div>

                        {item.note && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: '#FEF2F2',
                              padding: '5px 10px',
                              borderRadius: 12,
                              gap: 6,
                              marginBottom: 8,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <MessageCircle size={14} color="#DC2626" />
                            <span
                              style={{
                                fontSize: 13,
                                color: '#DC2626',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: 200,
                              }}
                            >
                              {item.note}
                            </span>
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: 19,
                            fontWeight: 900,
                            color: '#16A34A',
                          }}
                        >
                          ₦{parseFloat(item.proposed_price).toLocaleString()}
                        </div>
                      </div>

                      {/* Right Chevron */}
                      <ChevronRight size={24} color="#94A3B8" />
                    </motion.div>
                  );
                })}

                {/* Spacer for floating total */}
                <div style={{ height: 100 }} />
              </div>
            </div>

            {/* Floating Total Bar */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                position: 'absolute',
                bottom: 30,
                left: 20,
                right: 20,
                backgroundColor: '#1E293B',
                borderRadius: 24,
                padding: '20px 28px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#E2E8F0',
                  }}
                >
                  Total Amount
                </span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: '#10B981',
                  }}
                >
                  ₦{totalAmount.toLocaleString()}
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Full-screen Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#000',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: 'absolute',
                top: 40,
                left: 20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 25,
                width: 50,
                height: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X size={32} color="#FFF" />
            </button>

            <img
              src={selectedImage}
              alt="Full screen"
              style={{
                maxWidth: '95vw',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}