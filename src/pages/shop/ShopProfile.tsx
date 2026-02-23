// ShopProfile.jsx - Modern Business Profile Editor
import React, { useState, useEffect, useCallback, useRef } from 'react';
import "../../css/shop/ShopProfile.css";

const API_BASE_URL = 'https://retail-alvinia-goza-f6a0e4f7.koyeb.app';

const ShopProfile = ({ searchParams }) => {
  const { shopId } = searchParams || {};
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    image: null,
    parentCategory: null,
    childCategories: []
  });
  const [originalData, setOriginalData] = useState({});
  const [categories, setCategories] = useState({ parents: [], children: [] });
  const [multiSelectOpen, setMultiSelectOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load session & shop data
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('sessionToken');
      setSessionToken(token);
      
      if (shopId && token) {
        await fetchShopData(shopId, token);
      }
    };
    init();
  }, [shopId]);

  const fetchShopData = async (id, token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shop/profile/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      setFormData({
        name: data.name || '',
        description: data.description || '',
        address: data.address || '',
        image: data.image || null,
        parentCategory: data.parent_category_id || null,
        childCategories: data.category_ids || []
      });
      setOriginalData({ ...data });
      
      // Load parent categories
      await loadParentCategories(token);
    } catch (error) {
      console.error('Failed to load shop data:', error);
    }
  };

  const loadParentCategories = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/category/dropdown-options/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCategories(prev => ({
        ...prev,
        parents: data.categories.sort((a, b) => a.name.localeCompare(b.name))
      }));
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadChildCategories = async (parentId) => {
    if (!parentId || !sessionToken) return;
    
    try {
      const formData = new FormData();
      formData.append('parent_id', parentId.toString());
      
      const response = await fetch(`${API_BASE_URL}/category/subcategories/`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      setCategories(prev => ({
        ...prev,
        children: data.subcategories.sort((a, b) => a.name.localeCompare(b.name))
      }));
    } catch (error) {
      console.error('Failed to load child categories:', error);
    }
  };

  // Form handlers
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleParentChange = useCallback((parentId) => {
    updateField('parentCategory', parentId);
    updateField('childCategories', []);
    if (parentId) {
      loadChildCategories(parentId);
    } else {
      setCategories(prev => ({ ...prev, children: [] }));
    }
  }, [updateField]);

  const toggleChildCategory = useCallback((childId) => {
    setFormData(prev => ({
      ...prev,
      childCategories: prev.childCategories.includes(childId)
        ? prev.childCategories.filter(id => id !== childId)
        : [...prev.childCategories, childId]
    }));
  }, []);

  const pickImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      updateField('image', url);
    }
  }, [updateField]);

  // Smart update - only changed fields
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    
    const changes = {};
    Object.keys(formData).forEach(key => {
      if (JSON.stringify(formData[key]) !== JSON.stringify(originalData[key])) {
        changes[key] = formData[key];
      }
    });

    if (Object.keys(changes).length === 0) {
      alert('No changes detected');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      Object.keys(changes).forEach(key => {
        if (key === 'image' && changes[key]) {
          submitData.append('image', changes[key]);
        } else if (key === 'parentCategory') {
          submitData.append('category_id', changes[key]);
        } else if (key === 'childCategories' && Array.isArray(changes[key])) {
          changes[key].forEach(id => submitData.append('subcategory_ids', id));
        } else if (changes[key] !== null && changes[key] !== undefined) {
          submitData.append(key === 'name' ? 'shop_name' : key, changes[key]);
        }
      });
      submitData.append('shop_id', shopId);

      const response = await fetch(`${API_BASE_URL}/shop/profile/${shopId}/`, {
        method: 'POST',
        body: submitData,
        headers: { Authorization: `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        setOriginalData(formData);
        alert('Profile updated successfully!');
        window.history.back();
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, originalData, shopId, sessionToken, isSubmitting]);

  const filteredChildren = categories.children.filter(child =>
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  return (
    <div className="shop-profile-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
      
      {/* Header */}
      <header className="profile-header">
        <button className="back-button" onClick={() => window.history.back()}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1>Business Profile</h1>
        <div className="header-actions">
          <button 
            className={`save-button ${hasChanges ? 'has-changes' : 'disabled'}`}
            onClick={handleSubmit}
            disabled={!hasChanges || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Image Upload */}
      <div className="image-section">
        <div 
          className="profile-image-container"
          onClick={pickImage}
          role="button"
          tabIndex={0}
        >
          <div 
            className="profile-image"
            style={{ 
              backgroundImage: `url(${formData.image || '/placeholder-avatar.svg'})`
            }}
          />
          <button className="upload-button">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            Edit
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="form-grid">
        <div className="form-field">
          <label>Business Name</label>
          <input
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Enter business name"
            className="form-input"
          />
        </div>

        <div className="form-field">
          <label>Address</label>
          <input
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Enter business address"
            className="form-input"
          />
        </div>

        <div className="form-field full-width">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Tell us about your business..."
            className="form-textarea"
            rows={4}
          />
        </div>

        <div className="form-field">
          <label>Parent Category</label>
          <select
            value={formData.parentCategory || ''}
            onChange={(e) => handleParentChange(parseInt(e.target.value) || null)}
            className="form-select"
          >
            <option value="">Select parent category</option>
            {categories.parents.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {formData.parentCategory && categories.children.length > 0 && (
          <div className="form-field full-width">
            <label>Child Categories ({formData.childCategories.length} selected)</label>
            <div className="multi-select-container">
              <div 
                className="select-trigger"
                onClick={() => setMultiSelectOpen(true)}
              >
                <span>{searchTerm || 'Search categories...'}</span>
                <svg className="chevron" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </div>
            </div>

            {/* Tags Preview */}
            {formData.childCategories.length > 0 && (
              <div className="tags-preview">
                {formData.childCategories.slice(0, 3).map(id => {
                  const cat = categories.children.find(c => c.id === id);
                  return cat ? (
                    <span key={id} className="tag">
                      {cat.name}
                      <button 
                        className="tag-remove"
                        onClick={() => toggleChildCategory(id)}
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
                {formData.childCategories.length > 3 && (
                  <span className="tag">+{formData.childCategories.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-Select Modal */}
      {multiSelectOpen && (
        <MultiSelectModal
          categories={categories.children}
          selected={formData.childCategories}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          onToggle={toggleChildCategory}
          onClose={() => setMultiSelectOpen(false)}
          onSubmit={() => setMultiSelectOpen(false)}
        />
      )}
    </div>
  );
};

// Reusable Multi-Select Modal
const MultiSelectModal = ({ 
  categories, 
  selected, 
  searchTerm, 
  onSearch, 
  onToggle, 
  onClose, 
  onSubmit 
}) => {
  const filtered = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Select Categories</h3>
          <div className="modal-actions">
            <button onClick={onSubmit} className="btn-primary">
              Done
            </button>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
        
        <div className="modal-search">
          <input
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search categories..."
          />
        </div>

        <div className="modal-list">
          {filtered.map(category => (
            <button
              key={category.id}
              className={`list-item ${selected.includes(category.id) ? 'selected' : ''}`}
              onClick={() => onToggle(category.id)}
            >
              <span>{category.name}</span>
              {selected.includes(category.id) && (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShopProfile;
