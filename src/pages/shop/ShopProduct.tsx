// ShopProduct.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Image as ImageIcon,
  X,
  ChevronDown,
  Camera,
} from "lucide-react";
import axios from "axios";
import PageShell from "../../components/PageShell";
import "../../css/shop/ShopProducts.css"; // ← we'll style this next

const ShopProduct = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { shopId, category } = location.state || {};

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  // Gallery
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

  // Collapsible categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const isMountedRef = useRef(true);

  // ─── Subscription check ───
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

  const isSubscribed = ["regular", "standard", "premium"].includes(subscriptionStatus || "");

  // ─── Fetch session & products ───
  const fetchSessionId = useCallback(() => {
    try {
      const token = localStorage.getItem("sessionToken");
      if (isMountedRef.current) setSessionId(token);
    } catch (err) {
      console.error("Error reading sessionToken:", err);
    }
  }, []);

  const fetchShopProducts = useCallback(() => {
    if (!shopId) return;

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
          setError(
            err.message.includes("Network")
              ? "Network error. Please check your connection."
              : "Failed to load products. Please try again."
          );
        }
      })
      .finally(() => {
        if (isMountedRef.current) setLoading(false);
      });
  }, [shopId, sessionId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSessionId();
    fetchShopProducts();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSessionId, fetchShopProducts]);

  // ─── Gallery handlers ───
  const openGallery = useCallback((images: string[], startIndex = 0) => {
    if (!images?.length) return;
    setGalleryImages(images);
    setGalleryStartIndex(startIndex);
    setGalleryVisible(true);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryVisible(false);
    setGalleryImages([]);
    setGalleryStartIndex(0);
  }, []);

  // ─── Category toggle ───
  const toggleCategory = useCallback((catName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  }, []);

  // ─── Filtered + flattened data (with search) ───
  const flatData = useMemo(() => {
    const result: any[] = [];
    const query = searchQuery.toLowerCase().trim();

    products.forEach((cat: any) => {
      if (!cat?.category || !Array.isArray(cat.subcategories)) return;

      const totalProducts = cat.subcategories.reduce(
        (sum: number, sub: any) => sum + sub.products.length,
        0
      );

      result.push({ type: "category", data: cat, count: totalProducts });

      const isExpanded = expandedCategories.has(cat.category) || query.length > 0;

      if (!isExpanded) return;

      cat.subcategories.forEach((sub: any) => {
        const filteredProducts = sub.products.filter((p: any) =>
          p.product_name?.toLowerCase().includes(query)
        );

        if (filteredProducts.length === 0) return;

        result.push({ type: "subcategory", data: sub });
        filteredProducts.forEach((p: any) =>
          result.push({ type: "product", data: p })
        );
      });
    });

    return result;
  }, [products, searchQuery, expandedCategories]);

  // ─── Render single product card ───
  const renderProductCard = (product: any) => {
    const images = product.images || [];
    const primary = images[0] || null;
    const hasMultiple = images.length > 1;

    return (
      <motion.div
        key={product.id}
        className="sps-product-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(0,0,0,0.12)" }}
        transition={{ duration: 0.25 }}
      >
        <motion.button
          className="sps-primary-image-wrapper"
          onClick={() => primary && openGallery(images, 0)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          type="button"
        >
          {primary ? (
            <div className="sps-primary-image-container">
              <img
                src={primary}
                alt={product.product_name}
                className="sps-product-img"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/fallback-image.jpg";
                }}
              />
              {hasMultiple && (
                <div className="sps-image-count-badge">+{images.length - 1}</div>
              )}
            </div>
          ) : (
            <div className="sps-placeholder-container">
              <ImageIcon size={28} />
              <span className="sps-placeholder-text">No Image</span>
            </div>
          )}
        </motion.button>

        <div className="sps-text-column">
          <h3 className="sps-product-name">{product.product_name}</h3>

          <div className="sps-price-row">
            <span
              className={`sps-availability ${product.is_available ? "available" : "not-available"}`}
            >
              {product.is_available ? "Available" : "Unavailable"}
            </span>
            <span className="sps-price-text">
              {product.price != null
                ? `₦${Math.floor(product.price).toLocaleString()}`
                : "N/A"}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  // ─── Main JSX ───
  return (
    <PageShell
      title={`${category === "Services" ? "Services" : "Products"} Listing`}
      isLoading={loading}
      error={error}
      onRetry={fetchShopProducts}
    >
      <motion.div
        className="sps-container"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Search */}
        <motion.div
          className="sps-search-container"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Search size={20} />
          <input
            type="text"
            placeholder="Search in your inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sps-search-input"
          />
          {searchQuery && (
            <motion.button
              className="sps-clear-search"
              onClick={() => setSearchQuery("")}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={18} />
            </motion.button>
          )}
        </motion.div>

        {/* Update button */}
        <motion.button
          className="sps-update-button"
          onClick={() => navigate("/update-products", { state: { shopId, category } })}
          whileHover={{ scale: 1.03, boxShadow: "0 6px 16px rgba(0,0,0,0.15)" }}
          whileTap={{ scale: 0.97 }}
        >
          Update {category === "Services" ? "Services" : "Products"}
        </motion.button>

        {/* List */}
        <div className="sps-list-content">
          <AnimatePresence>
            {flatData.length === 0 && !loading ? (
              <motion.div
                className="sps-empty-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Search size={48} strokeWidth={1.5} />
                <h3>No items found</h3>
                <p>Try adjusting your search or add new items</p>
              </motion.div>
            ) : (
              flatData.map((item, idx) => {
                if (item.type === "category") {
                  const { data: cat, count } = item;
                  const isExpanded = expandedCategories.has(cat.category);

                  return (
                    <motion.div
                      key={`cat-${cat.category}`}
                      className="sps-category-header"
                      onClick={() => toggleCategory(cat.category)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="sps-category-title-row">
                        <h2 className="sps-category-title">{cat.category}</h2>
                        <motion.div
                          className="sps-item-count-badge"
                          whileHover={{ scale: 1.1 }}
                        >
                          {count}
                        </motion.div>
                      </div>
                      <motion.div
                        className={`sps-chevron ${isExpanded ? "expanded" : ""}`}
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown size={20} />
                      </motion.div>
                    </motion.div>
                  );
                }

                if (item.type === "subcategory") {
                  return (
                    <motion.h3
                      key={`sub-${item.data.subcategory}`}
                      className="sps-subcategory-title"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {item.data.subcategory}
                    </motion.h3>
                  );
                }

                if (item.type === "product") {
                  return renderProductCard(item.data);
                }

                return null;
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ─── Gallery Overlay ─── */}
      <AnimatePresence>
        {galleryVisible && (
          <motion.div
            className="sps-gallery-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeGallery}
          >
            <motion.div
              className="sps-gallery-container"
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.85 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="sps-gallery-pages"
                style={{
                  transform: `translateX(-${galleryStartIndex * 100}%)`,
                }}
              >
                {galleryImages.map((url, idx) => (
                  <div key={idx} className="sps-gallery-page">
                    <img
                      src={url}
                      alt={`Image ${idx + 1}`}
                      className="sps-gallery-image"
                    />
                    {galleryImages.length > 1 && (
                      <div className="sps-gallery-count">
                        {idx + 1} / {galleryImages.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <motion.button
                className="sps-close-gallery"
                onClick={closeGallery}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={32} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default ShopProduct;