// ShopProduct.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  X,
} from "lucide-react";
import axios from "axios";
import PageShell from "../../components/PageShell"; // ← new import
import "../../css/shop/ShopProducts.css";

const ShopProduct = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { shopId, category } = location.state || {};

  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  // Gallery state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);

  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load subscription status
  useEffect(() => {
    try {
      const cache = localStorage.getItem("subscription_cache");
      if (cache) {
        const parsed = JSON.parse(cache);
        setSubscriptionStatus(parsed.plan?.trim().toLowerCase() || null);
      }
    } catch (e) {
      console.error("Failed to parse subscription cache:", e);
    }
  }, []);

  const isSubscribed = ["regular", "standard", "premium"].includes(
    subscriptionStatus || ""
  );

  // Simple custom debounce
  const debouncedFetch = useCallback((callback: () => void) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      callback();
    }, 300);
  }, []);

  const fetchSessionId = useCallback(() => {
    try {
      const token = localStorage.getItem("sessionToken");
      if (isMountedRef.current) {
        setSessionId(token);
      }
    } catch (err) {
      console.error("Error reading sessionToken:", err);
    }
  }, []);

  const fetchShopProducts = useCallback(() => {
    if (!isMountedRef.current || !shopId) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("shop_id", shopId);

    axios
      .post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop-products/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: sessionId ? `Bearer ${sessionId}` : "",
        },
        timeout: 10000,
      })
      .then((response) => {
        if (isMountedRef.current) {
          setProducts(response.data.products || []);
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          console.error("Fetch products error:", err);
          setError(
            err.message.includes("Network")
              ? "Network error. Please check your connection."
              : "Failed to load products. Please try again."
          );
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
        }
      });
  }, [shopId, sessionId]);

  // Initial fetches
  useEffect(() => {
    isMountedRef.current = true;
    fetchSessionId();

    debouncedFetch(() => {
      fetchShopProducts();
    });

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchSessionId, fetchShopProducts, debouncedFetch]);

  const openImageGallery = (images: string[], startIndex = 0) => {
    if (!images?.length) return;
    setGalleryImages(images);
    setCurrentGalleryIndex(startIndex);
    setGalleryVisible(true);
  };

  const closeGallery = () => {
    setGalleryVisible(false);
    setGalleryImages([]);
    setCurrentGalleryIndex(0);
  };

  const handleUpdateProduct = () => {
    navigate("/update-products", { state: { shopId, category } });
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products
      .map((categoryData: any) => {
        const filteredSubs = categoryData.subcategories
          .map((sub: any) => {
            const filtered = sub.products.filter((p: any) =>
              p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return { ...sub, products: filtered };
          })
          .filter((sub: any) => sub.products.length > 0);

        return { ...categoryData, subcategories: filteredSubs };
      })
      .filter((cat: any) => cat.subcategories.length > 0);
  }, [products, searchQuery]);

  // ────────────────────────────────────────────────
  // Render Helpers
  // ────────────────────────────────────────────────

  const renderProduct = (product: any) => {
    const images = product.images || [];
    const primary = images[0];

    return (
      <div key={product.id} className="product-card">
        <button
          className="image-wrapper"
          onClick={() => primary && openImageGallery(images, 0)}
          type="button"
        >
          {primary ? (
            <div className="primary-image-container">
              <img
                src={primary}
                alt={product.product_name}
                className="product-img"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/fallback-image.jpg";
                }}
              />
              {images.length > 1 && (
                <div className="image-count-badge">
                  +{images.length - 1}
                </div>
              )}
            </div>
          ) : (
            <div className="placeholder-container">
              <ImageIcon size={32} />
              <span>No Image</span>
            </div>
          )}
        </button>

        <div className="text-column">
          <h4 className="product-name">{product.product_name}</h4>

          <div className="price-row">
            <span
              className={`availability-badge ${
                product.is_available ? "available" : "not-available"
              }`}
            >
              {product.is_available ? "Available" : "Unavailable"}
            </span>

            <span className="price-text">
              {product.price != null
                ? `₦${Math.floor(product.price).toLocaleString()}`
                : "N/A"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────
  // Single return using PageShell
  // ────────────────────────────────────────────────
  // ... imports unchanged

return (
  <PageShell
    title={`${category === "Services" ? "Services" : "Products"} Listing`}
    isLoading={loading}
    error={error}
    onRetry={fetchShopProducts}
  >
    <div className="sps-content-wrapper">
      <button className="sps-update-button" onClick={handleUpdateProduct}>
        Update {category === "Services" ? "services" : "products"}
      </button>

      <input
        className="sps-search-input"
        placeholder="Search in your inventory..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {(!products || products.length === 0) && (
        <p className="sps-no-items">No items available yet.</p>
      )}

      <div className="sps-content-container">
        <AnimatePresence>
          {filteredProducts.map((categoryData: any) => (
            <motion.div
              key={categoryData.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="sps-category-section"
            >
              <h2 className="sps-category-title">{categoryData.category}</h2>

              {categoryData.subcategories.map((sub: any) => (
                <div
                  key={sub.subcategory}
                  className="sps-subcategory-section"
                >
                  <h3 className="sps-subcategory-title">{sub.subcategory}</h3>

                  <div className="sps-products-grid">
                    {sub.products.map(renderProduct)}
                  </div>
                </div>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>

    {/* Gallery */}
    {galleryVisible && (
      <div className="sps-gallery-overlay" onClick={closeGallery}>
        <div className="sps-gallery-container" onClick={(e) => e.stopPropagation()}>
          <div
            className="sps-gallery-scroll"
            style={{ transform: `translateX(-${currentGalleryIndex * 100}%)` }}
          >
            {galleryImages.map((url, idx) => (
              <div key={idx} className="sps-gallery-page">
                <img
                  src={url}
                  alt={`Item image ${idx + 1}`}
                  className="sps-gallery-image"
                  loading="lazy"
                />
                {galleryImages.length > 1 && (
                  <div className="sps-gallery-count-badge">
                    {idx + 1} / {galleryImages.length}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button className="sps-close-gallery-btn" onClick={closeGallery}>
            <X size={32} />
          </button>

          {galleryImages.length > 1 && (
            <div className="sps-gallery-nav">
              <button className="sps-nav-btn sps-prev" onClick={() => setCurrentGalleryIndex(i => Math.max(0, i - 1))}>
                ←
              </button>
              <button className="sps-nav-btn sps-next" onClick={() => setCurrentGalleryIndex(i => Math.min(galleryImages.length - 1, i + 1))}>
                →
              </button>
            </div>
          )}
        </div>
      </div>
    )}
  </PageShell>
);
};

export default ShopProduct;