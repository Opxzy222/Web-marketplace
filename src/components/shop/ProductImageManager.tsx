// components/shop/ProductImageManager.tsx
import React, { useState, useEffect, useRef } from 'react';
import '../../css/component/shop/ProductImageManager.css';

interface ProductImageManagerProps {
  productKey: string;
  currentImageUrl: string | null;
  onImageSelect: (key: string, file: any) => void;
  onImageRemove: (key: string) => void;
}

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productKey,
  currentImageUrl,
  onImageSelect,
  onImageRemove,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(currentImageUrl);
  const [pendingFile, setPendingFile] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview with server URL changes
  useEffect(() => {
    setPreviewUri(currentImageUrl);
    if (currentImageUrl) setPendingFile(null);
  }, [currentImageUrl]);

  const openPicker = (source: 'camera' | 'library') => {
    // On web → camera not directly supported (would need getUserMedia)
    // For simplicity we use gallery for both (you can add camera later if needed)
    if (source === 'camera') {
      alert('Camera access not supported on web. Please choose from gallery.');
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const uri = URL.createObjectURL(file);
      const fileObj = {
        uri,
        name: `product_${productKey}_${Date.now()}.jpg`,
        type: file.type || 'image/jpeg',
        file,
      };

      setPreviewUri(uri);
      setPendingFile(fileObj);
      onImageSelect(productKey, fileObj);
    } catch (err) {
      console.error('Image processing error:', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    if (!window.confirm('Remove image?')) return;

    setPreviewUri(null);
    setPendingFile(null);
    onImageRemove(productKey);
  };

  const hasImage = !!previewUri;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="pdtImgr-hidden-input"
      />

      {/* Small icon/preview in table cell */}
      <button
        className="pdtImgr-icon-button"
        onClick={() => setModalVisible(true)}
        type="button"
        title="Manage product image"
      >
        {hasImage && previewUri ? (
          <div className="pdtImgr-preview-wrapper">
            <img
              src={previewUri}
              alt="Product preview"
              className="pdtImgr-tiny-preview"
            />
            <div className="pdtImgr-tiny-overlay">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </div>
          </div>
        ) : (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="pdtImgr-placeholder-icon"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v6H7zm4-4h2v10h-2zm4 4h2v4h-2z"/>
          </svg>
        )}
      </button>

      {/* Modal */}
      {modalVisible && (
        <div className="pdtImgr-modal-overlay" onClick={() => setModalVisible(false)}>
          <div className="pdtImgr-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="pdtImgr-modal-header">
              <h3 className="pdtImgr-modal-title">Product Image</h3>
              <button
                className="pdtImgr-modal-close"
                onClick={() => setModalVisible(false)}
                type="button"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Large preview */}
            <div className="pdtImgr-preview-container">
              {previewUri ? (
                <img
                  src={previewUri}
                  alt="Product preview"
                  className="pdtImgr-preview-image"
                />
              ) : (
                <div className="pdtImgr-placeholder">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v6H7zm4-4h2v10h-2zm4 4h2v4h-2z"/>
                  </svg>
                  <p className="pdtImgr-placeholder-text">No image selected</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pdtImgr-button-row">
              <button
                className="pdtImgr-action-button pdtImgr-camera-button"
                onClick={() => openPicker('camera')}
                disabled={isProcessing}
                type="button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span>Take Photo</span>
              </button>

              <button
                className="pdtImgr-action-button pdtImgr-gallery-button"
                onClick={() => openPicker('library')}
                disabled={isProcessing}
                type="button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                <span>Choose from Gallery</span>
              </button>
            </div>

            {/* Remove button */}
            {previewUri && (
              <button
                className="pdtImgr-remove-button"
                onClick={handleRemove}
                disabled={isProcessing}
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                <span>Remove Image</span>
              </button>
            )}

            {/* Done */}
            <button
              className={`pdtImgr-done-button ${isProcessing ? 'disabled' : ''}`}
              onClick={() => setModalVisible(false)}
              disabled={isProcessing}
              type="button"
            >
              {isProcessing ? (
                <div className="pdtImgr-spinner"></div>
              ) : (
                'Done'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductImageManager;