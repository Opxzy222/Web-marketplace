// components/ViewReceipt.tsx
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Eye,
  Download,
  Loader2,
  Image,
  AlertCircle
} from "lucide-react";
import '../../css/component/shop/ViewReceipt.css';

interface Receipt {
  pdf_url?: string;
  image_urls?: string[];
  receipt_id?: string | number;
}

interface ImageItem {
  url: string;
  width: number;
  height: number;
}

interface ViewReceiptProps {
  receipt: Receipt;
}

const ViewReceipt: React.FC<ViewReceiptProps> = ({ receipt }) => {
  if (!receipt || typeof receipt !== "object") {
    return (
      <div className="receipt-error">
        <AlertCircle size={48} className="error-icon" />
        <p className="error-text">Invalid receipt data</p>
      </div>
    );
  }

  const { pdf_url, image_urls, receipt_id } = receipt;
  
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [downloadedImage, setDownloadedImage] = useState<string | null>(null);

  // Format image_urls for viewer with fallback
  const fallbackImage = "https://via.placeholder.com/800x1200/6B7280/FFFFFF?text=No+Image";
  const images: ImageItem[] = React.useMemo(() => {
    const urls = image_urls?.length ? image_urls : [fallbackImage];
    return urls.map(url => ({
      url,
      width: 800,
      height: 1200,
    }));
  }, [image_urls]);

  // Simulate download for demo (browser download)
  const saveImage = useCallback(async () => {
    if (saving || !images[currentImageIndex]?.url) return;
    
    setSaving(true);
    try {
      // Create fake download for demo
      const link = document.createElement('a');
      link.href = images[currentImageIndex].url;
      link.download = `receipt_${receipt_id || "unknown"}_page_${currentImageIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Simulate success
      setTimeout(() => {
        setDownloadedImage(images[currentImageIndex].url);
        setSaving(false);
      }, 1500);
    } catch (err) {
      setError(`Failed to save image: ${err}`);
      setSaving(false);
    }
  }, [saving, images, currentImageIndex, receipt_id]);

  const viewReceiptAsImages = () => {
    if (!images.length) {
      setError("No images available for this receipt.");
      return;
    }
    setError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setError(null);
    setDownloadedImage(null);
  };

  return (
    <div className="view-receipt-container">
      {/* Action Buttons */}
      <div className="button-container">
        <motion.button
          className={`view-button ${!images.length ? 'disabled' : ''}`}
          onClick={viewReceiptAsImages}
          disabled={!images.length}
          whileHover={!images.length ? {} : { scale: 1.05 }}
          whileTap={!images.length ? {} : { scale: 0.95 }}
        >
          <Eye size={18} />
          <span>View</span>
        </motion.button>
        
        {pdf_url && (
          <motion.button
            className="view-button pdf-button"
            onClick={() => window.open(pdf_url, '_blank')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Image size={18} />
            <span>PDF</span>
          </motion.button>
        )}
      </div>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {modalVisible && (
          <motion.div
            className="image-viewer-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="viewer-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {error ? (
                <div className="error-content">
                  <AlertCircle size={64} className="error-icon-large" />
                  <p className="error-message">{error}</p>
                  <motion.button
                    className="close-error-button"
                    onClick={closeModal}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Close
                  </motion.button>
                </div>
              ) : (
                <>
                  <div className="viewer-header">
                    <motion.button
                      className="header-button close-header"
                      onClick={closeModal}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={24} />
                    </motion.button>
                    
                    <div className="header-title">
                      Receipt Images ({images.length})
                    </div>
                    
                    <motion.button
                      className={`header-button save-header ${saving ? 'saving' : ''}`}
                      onClick={saveImage}
                      disabled={saving}
                      whileHover={!saving ? { scale: 1.1 } : {}}
                      whileTap={!saving ? { scale: 0.9 } : {}}
                    >
                      {saving ? (
                        <Loader2 size={20} className="spinner" />
                      ) : (
                        <Download size={20} />
                      )}
                    </motion.button>
                  </div>

                  <div className="image-container">
                    <motion.img
                      key={currentImageIndex}
                      src={images[currentImageIndex].url}
                      alt={`Receipt page ${currentImageIndex + 1}`}
                      className="main-image"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      onError={() => setError(`Failed to load image ${currentImageIndex + 1}`)}
                    />
                    
                    {/* Page Indicator */}
                    <div className="page-indicator">
                      <span>{currentImageIndex + 1} / {images.length}</span>
                    </div>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                      <>
                        <motion.button
                          className="nav-button prev"
                          onClick={() => setCurrentImageIndex((prev) => 
                            prev > 0 ? prev - 1 : images.length - 1
                          )}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                          </svg>
                        </motion.button>
                        
                        <motion.button
                          className="nav-button next"
                          onClick={() => setCurrentImageIndex((prev) => 
                            prev < images.length - 1 ? prev + 1 : 0
                          )}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                          </svg>
                        </motion.button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Navigation */}
                  {images.length > 1 && (
                    <div className="thumbnails">
                      {images.map((image, index) => (
                        <motion.button
                          key={index}
                          className={`thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <img 
                            src={image.url} 
                            alt={`Thumb ${index + 1}`}
                            loading="lazy"
                          />
                          {currentImageIndex === index && (
                            <div className="thumbnail-active-overlay" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ViewReceipt;
