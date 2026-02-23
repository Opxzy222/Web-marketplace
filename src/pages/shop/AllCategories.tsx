// components/AllCategories.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import PageShell from '../../components/PageShell';           // adjust path if needed
import '../../css/shop/AllCategories.css';

const categoryImages: Record<string, string> = {
  'Agriculture & Food': '/assets/G-images/Agriculture.jpg',
  'Babies & Kiddies': '/assets/G-images/Babies.jpg',
  'Books & Stationery': '/assets/G-images/Books.jpg',
  'Commercial Equipments & Tools': '/assets/G-images/Commercial.jpg',
  'Construction Tools & Materials': '/assets/G-images/Construction.jpg',
  'Custom & Personalized': '/assets/G-images/Custom.jpg',
  'Electronics': '/assets/G-images/Electronics.jpg',
  'Fashion': '/assets/G-images/Fashion.jpg',
  'Food & Restaurants': '/assets/G-images/Food.jpg',
  'Fuel & Automotive Retail': '/assets/G-images/Fuel.jpg',
  'Furniture': '/assets/G-images/Furniture.jpg',
  'Green & Eco-friendly': '/assets/G-images/Green.jpg',
  'Grocery & Supermarkets': '/assets/G-images/Grocery.jpg',
  'Health & Beauty': '/assets/G-images/Health.jpg',
  'Hospitality & Accommodations': '/assets/G-images/Hospitality.jpg',
  'Industrial & Scientific': '/assets/G-images/Industrial.jpg',
  'Luxury & Designer': '/assets/G-images/Luxury.jpg',
  'Medical & Healthcare': '/assets/G-images/Medical.jpg',
  'Music & Audio': '/assets/G-images/Music.jpg',
  'Office & School Supplies': '/assets/G-images/Office.jpg',
  'Party & Event Supplies': '/assets/G-images/Party.jpg',
  'Pets': '/assets/G-images/Pets.jpg',
  'Printing & Publishing': '/assets/G-images/Printing.jpg',
  'Promotional Products': '/assets/G-images/Promotional.jpg',
  'Property': '/assets/G-images/Property.jpg',
  'Seasonal & Holiday': '/assets/G-images/Seasonal.jpg',
  'Services': '/assets/G-images/Services.jpg',
  'Spiritual & Wellness': '/assets/G-images/Spiritual.jpg',
  'Sports, Arts & outdoors': '/assets/G-images/Sports.jpg',
  'Textiles & Fabrics': '/assets/G-images/Textile.jpg',
  'Toys & Hobbies': '/assets/G-images/Toys.jpg',
  'Travel & Luggage': '/assets/G-images/Travel.jpg',
   Vehicles: '/assets/G-images/Vehicle.jpg',
  'Vintage & Thrift': '/assets/G-images/Vintage.jpg',
  '': '/assets/G-images/default.jpg',
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
      const cached = localStorage.getItem('categories_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setCategories(parsed);
        setLoading(false);
        return;
      }

      const response = await axios.get('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/all-shop-categories/');
      const categoryArray = Object.values(response.data) as Category[];
      const sorted = categoryArray.sort((a, b) => a.name.localeCompare(b.name));
      
      setCategories(sorted);
      localStorage.setItem('categories_cache', JSON.stringify(sorted));
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryClick = (categoryId: number, categoryName: string) => {
    navigate(
      `/child-category?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}&prevRoute=/shop/AllCategories`
    );
  };

  // ── Loading / Error states inside PageShell ────────────────────────
  if (loading) {
    return (
      <PageShell title="All Categories" showBackButton={true}>
        <div className="alctries-loading-container">
          <Loader2 className="alctries-spinner" size={48} />
          <p className="alctries-loading-text">Loading categories...</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="All Categories" showBackButton={true}>
        <div className="alctries-error-container">
          <p className="alctries-error-text">{error}</p>
          <motion.button
            className="alctries-retry-button"
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchCategories();
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

  return (
    <PageShell title="All Categories" showBackButton={true}>
      <div className="alctries-categories-container">
        <div className="alctries-grid">
          {categories.map((category) => {
            const normalizedName = category.name.trim();
            const imageSrc = categoryImages[normalizedName] || categoryImages[''];

            return (
              <motion.div
                key={category.id}
                className="alctries-category-card"
                onClick={() => handleCategoryClick(category.id, category.name)}
                whileHover={{ y: -6, scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <div className="alctries-card-image-wrapper">
                  <img
                    src={imageSrc}
                    alt={category.name}
                    className="alctries-category-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = categoryImages['']!;
                    }}
                  />
                </div>
                <div className="alctries-card-content">
                  <h3 className="alctries-category-title">{category.name}</h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
};

export default AllCategories;