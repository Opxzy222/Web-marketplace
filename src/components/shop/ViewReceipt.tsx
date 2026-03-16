// components/shop/ViewReceipt.tsx
import React, { useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Eye,
  Download,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "../../css/component/shop/ViewReceipt.css";

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

const FALLBACK_IMAGE =
  "https://via.placeholder.com/800x1200/6B7280/FFFFFF?text=No+Image";

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

  const images: ImageItem[] = useMemo(() => {
    const urls = image_urls?.length ? image_urls : [FALLBACK_IMAGE];
    return urls.map((url) => ({
      url,
      width: 800,
      height: 1200,
    }));
  }, [image_urls]);

  const hasImages = images.length > 0;

  const handleView = () => {
    if (!hasImages) {
      setError("No images available for this receipt.");
      return;
    }
    setError(null);
    setModalVisible(true);
    setCurrentImageIndex(0);
  };

  const closeModal = () => {
    setModalVisible(false);
    setError(null);
  };

  const saveImage = useCallback(async () => {
    if (saving || !images[currentImageIndex]?.url) return;

    setSaving(true);
    try {
      const link = document.createElement("a");
      link.href = images[currentImageIndex].url;
      link.download = `receipt_${receipt_id || "unknown"}_page_${currentImageIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch (err) {
      console.error("Download failed:", err);
      setError("Failed to download image");
    } finally {
      setSaving(false);
    }
  }, [saving, images, currentImageIndex, receipt_id]);

  const modalContent = (
    <AnimatePresence>
      {modalVisible && (
        <motion.div
          className="image-viewer-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeModal}
        >
          <div className="viewer-content">
            {error ? (
              <div className="error-content">
                <AlertCircle size={64} className="error-icon-large" />
                <p className="error-message">{error}</p>
                <motion.button
                  className="close-error-button"
                  onClick={closeModal}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
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
                    whileTap={{ scale: 0.94 }}
                  >
                    <X size={26} />
                  </motion.button>

                  <div className="header-title">
                    Receipt {currentImageIndex + 1} / {images.length}
                  </div>

                  <motion.button
                    className={`header-button save-header ${saving ? "saving" : ""}`}
                    onClick={saveImage}
                    disabled={saving}
                    whileHover={!saving ? { scale: 1.1 } : {}}
                    whileTap={!saving ? { scale: 0.94 } : {}}
                  >
                    {saving ? (
                      <Loader2 size={24} className="spinner" />
                    ) : (
                      <Download size={24} />
                    )}
                  </motion.button>
                </div>

                <div className="image-container">
                  <TransformWrapper
                    initialScale={1}
                    minScale={0.5}
                    maxScale={6}
                    limitToBounds={false}
                    centerOnInit={false}
                    wheel={{ step: 0.12 }}
                    doubleClick={{ step: 1.8 }}
                    pinch={{ step: 0.6 }}
                  >
                    <TransformComponent
                      wrapperClass="zoom-wrapper"
                      contentClass="zoom-content"
                    >
                      <motion.img
                        key={currentImageIndex}
                        src={images[currentImageIndex].url}
                        alt={`Receipt page ${currentImageIndex + 1}`}
                        className="main-image"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.28 }}
                        onError={() => setError(`Failed to load image ${currentImageIndex + 1}`)}
                      />
                    </TransformComponent>
                  </TransformWrapper>

                  {images.length > 1 && (
                    <>
                      <motion.button
                        className="nav-button prev"
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev > 0 ? prev - 1 : images.length - 1
                          )
                        }
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                      >
                        ←
                      </motion.button>

                      <motion.button
                        className="nav-button next"
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev < images.length - 1 ? prev + 1 : 0
                          )
                        }
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                      >
                        →
                      </motion.button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="thumbnails">
                    {images.map((img, idx) => (
                      <motion.button
                        key={idx}
                        className={`thumbnail ${currentImageIndex === idx ? "active" : ""}`}
                        onClick={() => setCurrentImageIndex(idx)}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                      >
                        <img src={img.url} alt={`Page ${idx + 1}`} loading="lazy" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="view-receipt-container">
        <div className="button-container">
          <motion.button
            className={`view-button ${!hasImages ? "disabled" : ""}`}
            onClick={handleView}
            disabled={!hasImages}
            whileHover={hasImages ? { scale: 1.05 } : {}}
            whileTap={hasImages ? { scale: 0.96 } : {}}
          >
            <Eye size={18} />
            <span>View</span>
          </motion.button>

          {pdf_url && (
            <motion.button
              className="view-button pdf-button"
              onClick={() => window.open(pdf_url, "_blank", "noopener,noreferrer")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              <ImageIcon size={18} />
              <span>PDF</span>
            </motion.button>
          )}
        </div>
      </div>

      {createPortal(modalContent, document.body)}
    </>
  );
};

export default ViewReceipt;