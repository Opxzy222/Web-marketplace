// SearchBar.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GeolocationSearch from './GeolocationSearch';
import LocationSearch from './LocationSearch';
import ShopIdSearch from './ShopIdSearch';

import '../../css/component/shop/SearchBar.css';

const FILTERS = [
  { key: 'geolocation', label: 'Near Me' },
  { key: 'location',    label: 'City / Area' },
  { key: 'spaceId',     label: 'Space ID' },
];

interface SearchBarProps {
  onSuggestionsStateChange?: (state: { showSuggestions: boolean; suggestionsHeight: number }) => void;
  onFocusChange?: (focused: boolean) => void;
  onPopulationStateChange?: (state: { isPopulating: boolean; progress: number }) => void;
}

export default function SearchBar({
  onSuggestionsStateChange,
  onFocusChange,
  onPopulationStateChange,
}: SearchBarProps) {
  const [activeFilter, setActiveFilter] = useState('geolocation');

  const handleSearch = async (searchData: any) => {
    try {
      let count = parseInt(localStorage.getItem('searchCount') || '0', 10);
      count += 1;
      localStorage.setItem('searchCount', count.toString());
    } catch (err) {
      console.error('Error updating search count:', err);
    }
  };

  const switchFilter = (key: string) => {
    if (key !== activeFilter) setActiveFilter(key);
  };

  const renderActiveSearch = () => {
    switch (activeFilter) {
      case 'geolocation':
        return (
          <GeolocationSearch
            onSearch={handleSearch}
            onFocusChange={onFocusChange}
            onSuggestionsStateChange={onSuggestionsStateChange}
            onPopulationStateChange={onPopulationStateChange}
          />
        );
      case 'location':
        return <LocationSearch onSearch={handleSearch} />;
      case 'spaceId':
        return <ShopIdSearch onSearch={handleSearch} />;
      default:
        return null;
    }
  };

  return (
    <section className="sb-search-bar">
      {/* Filter Tabs – modern segmented control */}
      <div className="sb-tabs-container">
        {FILTERS.map((filter) => (
          <motion.button
            key={filter.key}
            className={`sb-tab ${activeFilter === filter.key ? 'sb-tab-active' : ''}`}
            onClick={() => switchFilter(filter.key)}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            {filter.label}
          </motion.button>
        ))}
      </div>

      {/* Active Search Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFilter}
          className="sb-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderActiveSearch()}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}