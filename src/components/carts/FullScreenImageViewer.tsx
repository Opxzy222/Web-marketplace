// src/components/common/FullScreenImageViewer.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { X } from 'lucide-react';

type Props = {
  visible: boolean;
  onClose: () => void;
  images: string[];           // Array of image URLs
  initialIndex?: number;      // Optional: start at specific index (default 0)
};

export default function FullScreenImageViewer({
  visible,
  onClose,
  images,
  initialIndex = 0,
}: Props) {
  // Safety: don't render if no images
  if (images.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#000',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onClose} // click backdrop to close
        >
          {/* Stop propagation so clicking inside doesn't close */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Zoom/Pan Wrapper */}
            <TransformWrapper
              initialScale={1}
              initialPositionX={0}
              initialPositionY={0}
              limitToBounds={false}
              doubleClick={{ disabled: true }}
            >
              <TransformComponent
                wrapperStyle={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                contentStyle={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={images[initialIndex]}
                  alt={`Image ${initialIndex + 1}`}
                  style={{
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    objectFit: 'contain',
                    userSelect: 'none',
                    pointerEvents: 'auto',
                  }}
                  draggable={false}
                />
              </TransformComponent>
            </TransformWrapper>

            {/* Header Overlay: Close button + Page indicator */}
            <div
              style={{
                position: 'absolute',
                top: 40,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 20px',
                zIndex: 10,
              }}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                style={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  borderRadius: 30,
                  padding: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={32} color="#FFF" />
              </button>

              {/* Page Indicator */}
              <div
                style={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  padding: '8px 16px',
                  borderRadius: 20,
                  color: '#FFF',
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {initialIndex + 1} / {images.length}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}