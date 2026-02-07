import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaMagnifyingGlass, FaImage, FaCartShopping, FaCircleCheck } from "react-icons/fa6";
import { useCart } from "../../contexts/CartContext";
import "../../css/component/shop/ShopProducts.css";

interface Product {
  id: number | string;
  product_name: string;
  price: number | null;
  is_available: boolean;
  image?: string;
  images?: string[];
}

interface Subcategory {
  subcategory: string;
  products: Product[];
}

interface Category {
  category: string;
  subcategories: Subcategory[];
}

type FlatListItem = 
  | { type: 'category'; data: Category }
  | { type: 'subcategory'; data: Subcategory; category: string }
  | { type: 'product'; data: Product; category: string; subcategory: string };

interface Props {
  products?: Category[] | null;
  shopId: string | number;
  shopName?: string;
}

const ShopProduct: React.FC<Props> = ({ products = [], shopId, shopName }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const galleryRef = useRef<HTMLDivElement>(null);

  const currentShopId = Number(shopId || searchParams.get("shopId"));
  const currentShopName = shopName || searchParams.get("name") || `Shop #${currentShopId}`;

  // Loading simulation
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) next.delete(categoryName);
      else next.add(categoryName);
      return next;
    });
  }, []);

  const openGallery = useCallback((images: string[], startIndex: number = 0) => {
    if (images.length === 0) return;
    setGalleryImages(images);
    setGalleryStartIndex(startIndex);
    setGalleryVisible(true);
    setTimeout(() => {
      if (galleryRef.current) {
        galleryRef.current.scrollTo({
          left: startIndex * window.innerWidth,
          behavior: "smooth"
        });
      }
    }, 100);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryVisible(false);
    setGalleryImages([]);
    setGalleryStartIndex(0);
  }, []);

  const handleAddToCart = useCallback((product: Product) => {
    if (!product.is_available) {
      alert('Item Unavailable', 'This item is currently not available.');
      return;
    }
    if (!currentShopId) {
      alert('Error', 'Shop ID is missing.');
      return;
    }

    addItem({
      shopId: currentShopId,
      shopName: currentShopName,
      product_name: product.product_name,
      price: product.price || 0,
      original_price: product.price || 0,
      quantity: 1,
      image: product.images?.[0] || product.image,
      is_custom: false,
    });

    alert('Added to Cart!', `"${product.product_name}" added to cart`);
  }, [currentShopId, currentShopName, addItem]);

  // Flatten data structure with search
  const flatData = useMemo(() => {
    const result: FlatListItem[] = [];
    const query = searchQuery.toLowerCase();
    const safeProducts = Array.isArray(products) ? products : [];

    safeProducts.forEach((category) => {
      if (!category?.category || !Array.isArray(category.subcategories)) return;

      result.push({ type: 'category', data: category });

      const hasMatch = category.subcategories.some((sub) =>
        sub.products.some((p) => p.product_name?.toLowerCase().includes(query))
      );

      const isExpanded = expandedCategories.has(category.category) || query.length > 0;
      if (!hasMatch || !isExpanded) return;

      category.subcategories.forEach((sub) => {
        const filtered = sub.products.filter((p) =>
          p.product_name?.toLowerCase().includes(query)
        );
        if (filtered.length === 0) return;

        result.push({ type: 'subcategory', data: sub, category: category.category });
        filtered.forEach((p) => {
          result.push({
            type: 'product',
            data: p,
            category: category.category,
            subcategory: sub.subcategory,
          });
        });
      });
    });

    return result;
  }, [products, searchQuery, expandedCategories]);

  const renderItem = useCallback(({ item }: { item: FlatListItem }) => {
    if (item.type === 'category') {
      const cat = item.data;
      const isExpanded = expandedCategories.has(cat.category);
      const count = cat.subcategories.reduce((s, sub) => s + sub.products.length, 0);

      return (
        <motion.div 
          className="category-header"
          onClick={() => toggleCategory(cat.category)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="category-title-row">
            <h2 className="category-title">{cat.category}</h2>
            <motion.div 
              className="item-count-badge"
              whileHover={{ scale: 1.1 }}
            >
              {count}
            </motion.div>
          </div>
          <motion.div 
            className={`chevron ${isExpanded ? 'expanded' : ''}`}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            ▼
          </motion.div>
        </motion.div>
      );
    }

    if (item.type === 'subcategory') {
      return (
        <motion.div 
          className="subcategory-title"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {item.data.subcategory}
        </motion.div>
      );
    }

    if (item.type === 'product') {
      const p = item.data;
      const images = p.images || [];
      const primaryImage = images[0] || p.image || null;
      const hasMultiple = images.length > 1;

      return (
        <motion.div 
          className="product-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ 
            scale: 1.02,
            boxShadow: "0 15px 35px rgba(0,0,0,0.15)"
          }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="primary-image-wrapper"
            onClick={() => primaryImage && openGallery(images, 0)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {primaryImage ? (
              <div className="primary-image-container">
                <img 
                  src={primaryImage} 
                  alt={p.product_name}
                  className="product-img"
                  loading="lazy"
                />
                {hasMultiple && (
                  <div className="image-count-badge">
                    +{images.length - 1}
                  </div>
                )}
              </div>
            ) : (
              <div className="placeholder-container">
                <FaImage />
                <span className="placeholder-text">No Image</span>
              </div>
            )}
          </motion.div>

          <div className="text-column">
            <h3 className="product-name">{p.product_name}</h3>
            <div className="price-row">
              <span className={`availability ${p.is_available ? 'available' : 'not-available'}`}>
                {p.is_available ? 'Available' : 'Unavailable'}
              </span>
              <span className="price-text">
                {p.price != null ? `₦${Math.floor(p.price).toLocaleString()}` : 'N/A'}
              </span>
            </div>

            <motion.button
              className={`add-to-cart-btn ${!p.is_available ? 'disabled' : ''}`}
              onClick={() => handleAddToCart(p)}
              disabled={!p.is_available}
              whileHover={!p.is_available ? {} : { scale: 1.1 }}
              whileTap={!p.is_available ? {} : { scale: 0.95 }}
              animate={{ 
                scale: p.is_available ? 1 : 0.95 
              }}
            >
              <FaCartShopping />
              <span>Add</span>
            </motion.button>
          </div>
        </motion.div>
      );
    }

    return null;
  }, [expandedCategories, handleAddToCart, openGallery]);

  if (loading) {
    return (
      <motion.div 
        className="loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          ⏳
        </motion.div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div 
        className="container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="search-container"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <FaMagnifyingGlass />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery.length > 0 && (
            <motion.button
              className="clear-search"
              onClick={() => setSearchQuery("")}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              ×
            </motion.button>
          )}
        </motion.div>

        <div className="list-content">
          <AnimatePresence>
            {flatData.map((item, index) => (
              <motion.div
                key={`${item.type}-${index}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderItem({ item })}
              </motion.div>
            ))}
          </AnimatePresence>

          {flatData.length === 0 && (
            <motion.div 
              className="empty-state"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <FaMagnifyingGlass className="empty-icon" />
              <h2 className="empty-title">No products found</h2>
              <p className="empty-text">Try adjusting your search</p>
            </motion.div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {galleryVisible && (
          <motion.div 
            className="gallery-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeGallery}
          >
            <motion.div 
              className="gallery-container"
              ref={galleryRef}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="gallery-pages">
                {galleryImages.map((imgUrl, index) => (
                  <motion.div 
                    key={index}
                    className="gallery-page"
                    style={{ width: "100vw", height: "100vh" }}
                  >
                    <img 
                      src={imgUrl} 
                      alt={`Product ${index + 1}`}
                      className="gallery-image"
                    />
                    {galleryImages.length > 1 && (
                      <div className="gallery-count">
                        {index + 1} / {galleryImages.length}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <motion.button
                className="close-gallery"
                onClick={closeGallery}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ShopProduct;