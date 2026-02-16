// components/AllCategories.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import '../../css/shop/AllCategories.css';

const categoryImages: Record<string, string> = {
  'Agriculture & Food': '/assets/categories/Agriculture.jpg',
  'Babies & Kiddies': '/assets/categories/Babies.jpg',
  'Books & Stationery': '/assets/categories/Books.jpg',
  'Commercial Equipments & Tools': '/assets/categories/Commercial.jpg',
  'Construction Tools & Materials': '/assets/categories/Construction.jpg',
  'Custom & Personalized': '/assets/categories/Custom.jpg',
  'Electronics': '/assets/categories/Electronics.jpg',
  'Fashion': '/assets/categories/Fashion.jpg',
  'Food & Restaurants': '/assets/categories/Food.jpg',
  'Fuel & Automotive Retail': '/assets/categories/Fuel.jpg',
  'Furniture': '/assets/categories/Furniture.jpg',
  'Green & Eco-friendly': '/assets/categories/Green.jpg',
  'Grocery & Supermarkets': '/assets/categories/Grocery.jpg',
  'Health & Beauty': '/assets/categories/Health.jpg',
  'Hospitality & Accommodations': '/assets/categories/Hospitality.jpg',
  'Industrial & Scientific': '/assets/categories/Industrial.jpg',
  'Luxury & Designer': '/assets/categories/Luxury.jpg',
  'Medical & Healthcare': '/assets/categories/Medical.jpg',
  'Music & Audio': '/assets/categories/Music.jpg',
  'Office & School Supplies': '/assets/categories/Office.jpg',
  'Party & Event Supplies': '/assets/categories/Party.jpg',
  'Pets': '/assets/categories/Pets.jpg',
  'Printing & Publishing': '/assets/categories/Printing.jpg',
  'Promotional Products': '/assets/categories/Promotional.jpg',
  'Property': '/assets/categories/Property.jpg',
  'Seasonal & Holiday': '/assets/categories/Seasonal.jpg',
  'Services': '/assets/categories/Services.jpg',
  'Spiritual & Wellness': '/assets/categories/Spiritual.jpg',
  'Sports, Arts & outdoors': '/assets/categories/Sports.jpg',
  'Textiles & Fabrics': '/assets/categories/Textile.jpg',
  'Toys & Hobbies': '/assets/categories/Toys.jpg',
  'Travel & Luggage': '/assets/categories/Travel.jpg',
  'Vehicles': '/assets/categories/Vehicle.jpg',
  'Vintage & Thrift': '/assets/categories/Vintage.jpg',
  '': '/assets/categories/default.jpg',
};

interface Category {
  id: number;
  name: string;
}

const AllCategories: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      // Check cache first
      const cached = localStorage.getItem('categories_cache');
      if (cached) {
        console.log('Using cached categories');
        const parsed = JSON.parse(cached);
        setCategories(parsed);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      console.log('Fetching all categories from backend');
      const response = await axios.get('/all-shop-categories/');
      const categoryArray = Object.values(response.data) as Category[];
      const sorted = categoryArray.sort((a, b) => a.name.localeCompare(b.name));
      
      setCategories(sorted);
      localStorage.setItem('categories_cache', JSON.stringify(sorted));
      console.log('Fetched and cached categories:', sorted.map(item => item.name));
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryClick = (categoryId: number, categoryName: string) => {
    navigate(`/shop/ChildCategoryList?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}&prevRoute=/shop/AllCategories`);
  };

  const renderCategoryItem = (item: Category, index: number) => {
    const normalizedName = item.name.trim();
    const imageSrc = categoryImages[normalizedName] || categoryImages[''];
    
    const isLastAndOdd = index === categories.length - 1 && categories.length % 2 !== 0;

    return (
      <motion.button
        key={item.id}
        className={`category-item ${isLastAndOdd ? 'last-category-item' : ''}`}
        onClick={() => handleCategoryClick(item.id, item.name)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="icon-container">
          <img 
            src={imageSrc} 
            alt={item.name}
            className="category-icon"
            onError={(e) => {
              console.warn(`No image found for category: ${normalizedName}, using fallback`);
              (e.target as HTMLImageElement).src = categoryImages['']!;
            }}
          />
        </div>
        <p className="category-name">{item.name}</p>
      </motion.button>
    );
  };

  if (loading) {
    return (
      <div className="centered-container">
        <div className="gradient-bg">
          <header className="header">
            <motion.button 
              className="back-button" 
              onClick={() => navigate('/shop')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={26} />
            </motion.button>
            <h1 className="header-title">All Categories</h1>
            <div className="header-spacer" />
          </header>
          
          <div className="loader-container">
            <Loader2 className="spinner" size={48} />
            <p className="loading-text">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="centered-container">
        <div className="gradient-bg">
          <header className="header">
            <motion.button 
              className="back-button" 
              onClick={() => navigate('/shop')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={26} />
            </motion.button>
            <h1 className="header-title">All Categories</h1>
            <div className="header-spacer" />
          </header>
          
          <div className="loader-container">
            <p className="error-text">Failed to load categories.</p>
            <motion.button
              className="retry-button"
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchCategories();
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Retry
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="gradient-bg">
        <header className="header">
          <motion.button 
            className="back-button" 
            onClick={() => navigate('/shop')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={26} />
          </motion.button>
          <h1 className="header-title">All Categories</h1>
          <div className="header-spacer" />
        </header>
        
        <div className="categories-grid">
          {categories.map((category, index) => renderCategoryItem(category, index))}
        </div>
      </div>
    </div>
  );
};

export default AllCategories;
