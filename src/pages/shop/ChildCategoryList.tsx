// components/shop/ChildCategories.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import PageShell from '../../components/PageShell'; // Adjust path if needed
import '../../css/shop/ChildCategories.css';

const API_BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

const ChildCategories: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read parameters safely
  const parentCategoryId = searchParams.get('categoryId');
  const parentCategoryName = searchParams.get('categoryName') || 'Categories';
  const prevRoute = searchParams.get('prevRoute') || '/shop/AllCategories';

  const parsedParentId = parentCategoryId ? parseInt(parentCategoryId, 10) : null;

  const [childCategories, setChildCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildCategories = useCallback(async () => {
    if (!parsedParentId || isNaN(parsedParentId)) {
      navigate('/shop');
      return;
    }

    setLoading(true);
    setError(null);

    const cacheKey = `chcat_childcategories_${parsedParentId}`;

    try {
      // 1. Check localStorage cache
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setChildCategories(parsed);
        setLoading(false);
        return;
      }

      // 2. Fetch from API
      const sessionToken = localStorage.getItem('sessionToken');

      const response = await fetch(
        `${API_BASE_URL}/shop-childcategories/${parsedParentId}/`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken && { Authorization: sessionToken }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();

      // Store in cache
      localStorage.setItem(cacheKey, JSON.stringify(data));
      setChildCategories(data);

    } catch (err: any) {
      console.error('Failed to load child categories:', err);
      setError(err.message || 'Failed to load subcategories');

      // Optional: show cached data even on error
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setChildCategories(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  }, [parsedParentId, navigate]);

  useEffect(() => {
    fetchChildCategories();
  }, [fetchChildCategories]);

  const handleCategoryClick = useCallback(
  (childId: number, childName: string) => {
    const nextParams = new URLSearchParams({
      categoryId: childId.toString(),
      categoryName: encodeURIComponent(childName),               // ← new name, safe to encode
      prevRoute: '/shop/ChildCategories',
      parentCategoryId: parentCategoryId || '',
      parentCategoryName: parentCategoryName || '',              // ← already decoded, DO NOT encode
    });

      navigate(`/sub-categories?${nextParams.toString()}`);
      
  },
  [navigate, parentCategoryId, parentCategoryName]
);

  const handleBack = () => {
    if (prevRoute && prevRoute !== window.location.pathname) {
      navigate(prevRoute);
    } else {
      navigate(-1);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell title={parentCategoryName} showBackButton={true} onBack={handleBack}>
        <div className="chcat-loading-container">
          <Loader2 className="chcat-spinner" size={48} />
          <p className="chcat-loading-text">Loading subcategories...</p>
        </div>
      </PageShell>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <PageShell title={parentCategoryName} showBackButton={true} onBack={handleBack}>
        <div className="chcat-error-container">
          <p className="chcat-error-text">{error}</p>
          <motion.button
            className="chcat-retry-button"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchChildCategories();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Try Again
          </motion.button>
        </div>
      </PageShell>
    );
  }

  // ── Main content ─────────────────────────────────────────────────────────
  return (
    <PageShell title={parentCategoryName} showBackButton={true} onBack={handleBack}>
      <div className="chcat-categories-container">
        <div className="chcat-grid">
          {childCategories.length === 0 ? (
            <div className="chcat-empty-state">
              <div className="chcat-empty-icon">📂</div>
              <h2>No subcategories found</h2>
              <p>This category doesn't have any subcategories yet.</p>
            </div>
          ) : (
            childCategories.map((category) => (
              <motion.div
                key={category.id}
                className="chcat-category-card"
                onClick={() => handleCategoryClick(category.id, category.name)}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <div className="chcat-card-content">
                  <h3 className="chcat-category-title">{category.name}</h3>
                  <ChevronRight className="chcat-chevron" size={24} />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default ChildCategories;