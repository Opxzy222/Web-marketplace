// ChildCategoryList.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios'; // Configure your API base
import PageShell from '../../components/PageShell'; // Adjust path
import "../../css/shop/ChildCategoryList.css";

const API_BASE_URL = ''; // Your API base URL

// In-memory cache for child categories
const categoryCache = new Map();

const ChildCategoryList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [childCategories, setChildCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const lastFetchedDataRef = useRef(null);

  const categoryId = searchParams.get('categoryId');
  const categoryName = searchParams.get('categoryName');
  const prevRoute = searchParams.get('prevRoute');

  useEffect(() => {
    const loadData = async () => {
      if (!categoryId) {
        navigate('/shop');
        return;
      }
      
      try {
        // Check in-memory cache
        if (categoryCache.has(categoryId)) {
          const cachedData = categoryCache.get(categoryId);
          setChildCategories(cachedData);
          lastFetchedDataRef.current = cachedData;
          setLoading(false);
          return;
        }

        // Check localStorage cache
        const cacheKey = `childCategories_${categoryId}`;
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setChildCategories(parsedData);
          lastFetchedDataRef.current = parsedData;
          categoryCache.set(categoryId, parsedData);
          setLoading(false);
          return;
        }

        // Fetch from API
        const sessionToken = localStorage.getItem('sessionToken');
        const response = await axios.get(`${API_BASE_URL}/shop-childcategories/${categoryId}/`, {
          headers: sessionToken ? { Authorization: sessionToken } : {},
        });
        const data = response.data;
        setChildCategories(data);
        lastFetchedDataRef.current = data;
        categoryCache.set(categoryId, data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (error) {
        console.error('Error fetching child categories:', error);
        // Fallback to last fetched data if available
        if (lastFetchedDataRef.current) {
          setChildCategories(lastFetchedDataRef.current);
        }
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [categoryId, navigate]);

  const handleCategoryClick = useCallback((childCategoryId, childCategoryName) => {
    setSelectedCategoryId(childCategoryId);
    navigate({
      pathname: '/shop/SubcategoryList',
      search: `?categoryId=${childCategoryId}&categoryName=${encodeURIComponent(childCategoryName)}&prevRoute=/shop/ChildCategoryList&parentCategoryId=${categoryId}&parentCategoryName=${encodeURIComponent(categoryName)}`
    });
  }, [navigate, categoryId, categoryName]);

  const renderChildCategory = (item) => (
    <div 
      className={`subcategory-card ${selectedCategoryId === item.id ? 'selected' : ''}`}
      onClick={() => handleCategoryClick(item.id, item.name)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(item.id, item.name)}
    >
      <div className="subcategory-card-inner">
        <div className="card-gradient">
          <span className="subcategory-title">{item.name}</span>
          <svg className="chevron-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </div>
      </div>
    </div>
  );

  const retryFetch = () => {
    setLoading(true);
    setError(null);
    // Trigger re-fetch by resetting deps
  };

  return (
    <PageShell 
      title={categoryName || 'Categories'} 
      isLoading={loading} 
      error={error} 
      onRetry={retryFetch}
      showBackButton={true}
    >
      <div className="child-category-list">
        <div className="content-wrapper">
          <div className="list-content">
            {childCategories.map(renderChildCategory)}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ChildCategoryList;
