import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import '../../css/component/shop/Categories.css';

interface Category {
  id: number;
  name: string;
}

interface CategoriesProps {
  categories: Category[];
}

const Categories: React.FC<CategoriesProps> = ({ categories }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Categories:', sortedCategories);
    }
  }, [sortedCategories]);

  const categoryIconMap: Record<string, string> = {
    Vehicles: '/public/assets/G-images/Vehicle.jpg',
    electronics: '/public/assets/G-images/Electronics.jpg',
    phone: '/public/assets/Image/phone-icon.png',
    furniture: '/public/assets/G-images/Furniture.jpg',
    '': '/public/assets/Image/home-appliance-icon.png',
    fashion: '/public/assets/G-images/Fashion.jpg',
    property: '/public/assets/Image/property-icon.png',
    'health & beauty': '/public/assets/G-images/Health.jpg',
    services: '/public/assets/G-images/Services.jpg',
    'medical & healthcare': '/public/assets/G-images/Medical.jpg',
  };

  const normalizeCategoryName = (name: string): string =>
    name
      .toLowerCase()
      .replace(/and/g, '&')
      .replace(/[^a-z0-9& ]/g, '')
      .trim();

  const handleCategoryClick = (categoryId: number, categoryName: string) => {
    navigate(
      `/shop/ChildCategoryList?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}&prevRoute=${encodeURIComponent(location.pathname)}`
    );
  };

  return (
    <section className="categories-section">
      <div className="categories-header">
        <h2 className="categories-title">Categories</h2>
        <motion.button
          className="see-all-btn"
          onClick={() => navigate(`/shop/AllCategories?prevRoute=${encodeURIComponent(location.pathname)}`)}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          See All
        </motion.button>
      </div>

      <div className="categories-grid">
        {sortedCategories.map((item) => {
          const normalized = normalizeCategoryName(item.name);
          const iconSrc = categoryIconMap[normalized] || categoryIconMap[''];

          return (
            <motion.button
              key={item.id}
              className="category-card"
              onClick={() => handleCategoryClick(item.id, item.name)}
              whileHover={{ scale: 1.06, y: -6 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div
                className="category-icon"
                style={{ backgroundImage: iconSrc ? `url(${iconSrc})` : 'none' }}
              >
                {!iconSrc && <div className="icon-placeholder" />}
              </div>
              <span className="category-name">{item.name}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default Categories;