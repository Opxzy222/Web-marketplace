import React, { useState, useEffect, useRef } from 'react';

type ProductImageManagerProps = {
  productKey: string;
  currentImageUrl: string | null;
  onImageSelect: (key: string, file: any) => void;
  onImageRemove: (key: string) => void;
};

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  productKey,
  currentImageUrl,
  onImageSelect,
  onImageRemove,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [displayImages, setDisplayImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImageSelectRef = useRef(onImageSelect);

  useEffect(() => {
    onImageSelectRef.current = onImageSelect;
  }, [onImageSelect]);

  // Sync with server image (single URL → treat as array with 0 or 1 item)
  useEffect(() => {
    const serverImages = currentImageUrl ? [currentImageUrl] : [];
    setDisplayImages(serverImages);
    setPendingFiles([]); // Clear pending when server updates
  }, [currentImageUrl]);

  // When new local images are added → notify parent one by one
  useEffect(() => {
    pendingFiles.forEach(file => {
      onImageSelectRef.current(productKey, file);
    });
  }, [pendingFiles, productKey]);

  // If no images left → trigger remove callback
  useEffect(() => {
    if (displayImages.length === 0 && (currentImageUrl || pendingFiles.length > 0)) {
      onImageRemove(productKey);
    }
  }, [displayImages.length, currentImageUrl, pendingFiles.length, productKey, onImageRemove]);

  const openPicker = async (source: 'camera' | 'library') => {
    if (displayImages.length >= 3) {
      alert('Maximum Reached\nYou can add up to 3 images only.');
      return;
    }

    // For web, we only support file picker (no camera access in standard web)
    const input = fileInputRef.current;
    if (!input) return;

    input.accept = 'image/*';
    input.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      files.forEach(file => {
        if (displayImages.length + pendingFiles.length < 3) {
          const fileObj = {
            uri: URL.createObjectURL(file),
            name: `product_${productKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
            type: file.type || 'image/jpeg',
            file: file, // Keep actual File object for FormData
          };

          setDisplayImages(prev => [...prev, fileObj.uri]);
          setPendingFiles(prev => [...prev, fileObj]);
        }
      });
    } catch (err) {
      console.error(`[ProductImageManager ${productKey}] Picker error:`, err);
      alert('Error\nFailed to pick image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    if (confirm('Remove Image\nDelete this photo?')) {
      setDisplayImages(prev => prev.filter((_, i) => i !== index));

      // Remove corresponding pending file if it's a local one
      if (index >= (currentImageUrl ? 1 : 0)) {
        setPendingFiles(prev => prev.filter((_, i) => i !== index - (currentImageUrl ? 1 : 0)));
      }
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    setDisplayImages(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
  };

  const hasImage = displayImages.length > 0;
  const primaryUri = displayImages[0] || null;
  const showCountBadge = displayImages.length > 1;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Tiny preview in list row */}
      <button 
        className="product-image-manager-icon"
        onClick={() => setModalVisible(true)}
        type="button"
        title="Manage images"
      >
        {hasImage && primaryUri ? (
          <div className="preview-wrapper">
            <img src={primaryUri} alt="Product preview" className="tiny-preview" />
            {showCountBadge && (
              <div className="count-badge">
                +{displayImages.length - 1}
              </div>
            )}
            <div className="tiny-overlay">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </div>
          </div>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="image-outline">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v6H7zm4-4h2v10h-2zm4 4h2v4h-2z"/>
          </svg>
        )}
      </button>

      {/* Modal */}
      {modalVisible && (
        <div className="product-image-manager-modal-overlay" onClick={() => setModalVisible(false)}>
          <div 
            className="product-image-manager-modal-content" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Product Images</h3>
              <span className="image-counter">({displayImages.length}/3)</span>
              <button 
                className="modal-close" 
                onClick={() => setModalVisible(false)}
                type="button"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <div className="gallery-container">
              <div className="gallery-scroll">
                {displayImages.map((uri, index) => (
                  <div key={`${uri}-${index}`} className="image-container">
                    <img 
                      src={uri} 
                      alt={`Product image ${index + 1}`}
                      className="gallery-image" 
                    />
                    <div className="image-controls">
                      {index > 0 && (
                        <button 
                          className="move-arrow left" 
                          onClick={() => moveImage(index, index - 1)}
                          type="button"
                          title="Move left"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                          </svg>
                        </button>
                      )}
                      {index < displayImages.length - 1 && (
                        <button 
                          className="move-arrow right" 
                          onClick={() => moveImage(index, index + 1)}
                          type="button"
                          title="Move right"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                          </svg>
                        </button>
                      )}
                      <button 
                        className="delete-btn" 
                        onClick={() => removeImage(index)}
                        type="button"
                        title="Delete image"
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {displayImages.length < 3 && <div className="image-spacer" />}
              </div>
            </div>

            <div className="image-actions">
              <button
                className="action-btn camera-btn"
                onClick={() => openPicker('camera')}
                disabled={isProcessing || displayImages.length >= 3}
                type="button"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span>Take Photo</span>
              </button>
              <button
                className="action-btn gallery-btn"
                onClick={() => openPicker('library')}
                disabled={isProcessing || displayImages.length >= 3}
                type="button"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
                <span>Gallery</span>
              </button>
            </div>

            <button
              className={`done-btn ${isProcessing ? 'disabled' : ''}`}
              onClick={() => setModalVisible(false)}
              type="button"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="spinner"></div>
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
