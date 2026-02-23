// src/pages/shop/SubcategoryList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import PageShell from '../../components/PageShell'; // adjust path if needed
import '../../css/shop/SubcategoryList.css';

const API_BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

const SubcategoryList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Read and DECODE all parameters ───────────────────────────────────────
  const categoryIdRaw = searchParams.get('categoryId');
  const categoryNameRaw = searchParams.get('categoryName') || 'Subcategories';
  const prevRouteRaw = searchParams.get('prevRoute') || '/shop/ChildCategories';
  const parentCategoryIdRaw = searchParams.get('parentCategoryId');
  const parentCategoryNameRaw = searchParams.get('parentCategoryName') || '';

  const categoryName = decodeURIComponent(categoryNameRaw);
  const prevRoute = decodeURIComponent(prevRouteRaw);
  const parentCategoryName = decodeURIComponent(parentCategoryNameRaw);

  const parsedCategoryId = categoryIdRaw ? parseInt(categoryIdRaw, 10) : null;

  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchSubcategories = useCallback(async () => {
    if (!parsedCategoryId || isNaN(parsedCategoryId)) {
      navigate('/shop');
      return;
    }

    setLoading(true);
    setError(null);

    const cacheKey = `sbcat_subcategories_${parsedCategoryId}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setSubcategories(JSON.parse(cached));
        setLoading(false);
        return;
      }

      const sessionToken = localStorage.getItem('sessionToken');
      const res = await fetch(`${API_BASE_URL}/shop-subcategories/${parsedCategoryId}/`, {
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken && { Authorization: sessionToken }),
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      setSubcategories(data);
    } catch (err: any) {
      console.error('Failed to fetch subcategories:', err);
      setError(err.message || 'Failed to load subcategories');

      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setSubcategories(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  }, [parsedCategoryId, navigate]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  const handleSubcategoryClick = useCallback(
    async (subId: number, subName: string) => {
      if (isProcessing !== null) return;

      setIsProcessing(subId);
      setSelectedId(subId);

      try {
        // 1. Increment search count
        let count = parseInt(localStorage.getItem('searchCount') || '0', 10);
        count += 1;
        localStorage.setItem('searchCount', count.toString());

        // 2. Geolocation
        if (!navigator.geolocation) {
          alert('Geolocation is not supported by your browser.');
          return;
        }

        const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position.coords),
            (err) => reject(err),
            {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 60000,
            }
          );
        });

        console.log('Current location:', coords.latitude, coords.longitude);

        // 3. Fetch real shops from backend
        const sessionToken = localStorage.getItem('sessionToken');

        const url = `${API_BASE_URL}/shop-subcategory-search/?subcategory_id=${subId}&lat=${coords.latitude}&lon=${coords.longitude}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken && { Authorization: sessionToken }),
          },
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();

        // Assuming the API returns an array of shops
        const shops = Array.isArray(data) ? data.slice(0, 50) : [];

        if (shops.length === 0) {
          alert('No shops found for this subcategory in your area.');
          return;
        }

        // 4. Navigate with real data
        navigate('/search-result', {
          state: {
            searchTerm: subName,
            shops: JSON.stringify(shops),
          },
        });
      } catch (err: any) {
        console.error('Error in handleSubcategoryClick:', err);

        let message = 'Failed to load nearby shops.';

        if (err.code === 1) {
          message = 'Location permission denied. Please enable location access.';
        } else if (err.code === 3) {
          message = 'Location request timed out. Please try again.';
        } else if (err.message.includes('fetch')) {
          message = 'Network error. Please check your connection.';
        }

        alert(message);
      } finally {
        setIsProcessing(null);
      }
    },
    [navigate, isProcessing]
  );

  const handleBack = () => {
    navigate(prevRoute);
  };

  // ── Loading state (initial list load) ────────────────────────────────
  if (loading) {
    return (
      <PageShell title={categoryName} showBackButton onBack={handleBack}>
        <motion.div
          className="sbcat-loading-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="sbcat-modern-spinner">
            <div className="sbcat-spinner-ring"></div>
            <div className="sbcat-spinner-core"></div>
            <div className="sbcat-spinner-pulse"></div>
          </div>
          <motion.p
            className="sbcat-loading-text"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Loading subcategories...
          </motion.p>
        </motion.div>
      </PageShell>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (error) {
    return (
      <PageShell title={categoryName} showBackButton onBack={handleBack}>
        <div className="sbcat-error-container">
          <p className="sbcat-error-text">{error}</p>
          <motion.button
            className="sbcat-retry-button"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchSubcategories();
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Try Again
          </motion.button>
        </div>
      </PageShell>
    );
  }

  // ── Main content ─────────────────────────────────────────────────────
  return (
    <PageShell title={categoryName} showBackButton onBack={handleBack}>
      <div className="sbcat-container">
        <div className="sbcat-grid">
          {subcategories.length === 0 ? (
            <div className="sbcat-empty-state">
              <div className="sbcat-empty-icon">🔍</div>
              <h2>No subcategories found</h2>
              <p>This category has no subcategories available yet.</p>
            </div>
          ) : (
            subcategories.map((sub: any) => (
              <motion.div
                key={sub.id}
                className={`sbcat-card ${selectedId === sub.id ? 'sbcat-selected' : ''} ${
                  isProcessing === sub.id ? 'sbcat-processing' : ''
                }`}
                onClick={() => isProcessing === null && handleSubcategoryClick(sub.id, sub.name)}
                whileHover={isProcessing === null ? { y: -5, scale: 1.02 } : {}}
                whileTap={isProcessing === null ? { scale: 0.98 } : {}}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
              >
                <div className="sbcat-card-content">
                  {isProcessing === sub.id ? (
                    <div className="sbcat-card-loading">
                      <Loader2 className="sbcat-card-spinner" size={28} />
                      <span>Finding nearby shops...</span>
                    </div>
                  ) : (
                    <>
                      <h3 className="sbcat-title">{sub.name}</h3>
                      <ChevronRight className="sbcat-chevron" size={24} />
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
};

export default SubcategoryList;