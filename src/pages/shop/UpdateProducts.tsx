import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PageShell from '../../components/PageShell'; // Adjust path if needed
import ProductImageManager from '../../components/shop/ProductImageManager';
import '../../css/shop/UpdateProducts.css';

const UpdateShopProducts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { shopId, category } = location.state || {};
  const shop_id = shopId ? Number(shopId) : null;

  const [groupedProductSuggestions, setGroupedProductSuggestions] = useState({});
  const [selectedProducts, setSelectedProducts] = useState({});
  const [customProducts, setCustomProducts] = useState([]);
  const [customProductName, setCustomProductName] = useState('');
  const [customProductCategory, setCustomProductCategory] = useState('');
  const [customProductSubcategory, setCustomProductSubcategory] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
  const [subcategorySearchQuery, setSubcategorySearchQuery] = useState('');
  const [subcategoryTouched, setSubcategoryTouched] = useState(false);
  const [subcategoryResetTrigger, setSubcategoryResetTrigger] = useState(0);
  const customNameInputRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [activePriceContext, setActivePriceContext] = useState(null);
  const [tempPrice, setTempPrice] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteInfo, setPendingDeleteInfo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalValue, setModalValue] = useState('');
  const [modalTargetInfo, setModalTargetInfo] = useState(null);
  const [dropdownState, setDropdownState] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingImages, setPendingImages] = useState({});

  // ────────────────────────────────────────────────
  // Your existing helper functions & logic (unchanged)
  // ────────────────────────────────────────────────

  const getDropdownKey = (category, subcategory) => `${category}-${subcategory}`;
  const getImageKey = (type, id, item) =>
    type === 'suggestion'
      ? `suggestion_${id}`
      : `custom_${item?.serverIndex !== undefined ? item.serverIndex : id}`;

  // Fetch product suggestions
  useEffect(() => {
    const fetchProductSuggestions = async () => {
      if (!shop_id) {
        console.warn("No shop_id found");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await axios.post(
          'https://retail-alvinia-goza-f6a0e4f7.koyeb.app/product-suggestion/',
          new URLSearchParams({ shop_id }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );

        const data = response.data || {};
        const suggestions = data.product_suggestions || {};
        const selected = data.selected_products || [];

        setGroupedProductSuggestions(suggestions);

        // Pre-selected suggested products
        const preselected = {};
        selected
          .filter(p => !p.custom_name)
          .forEach(p => {
            const suggestion = Object.values(suggestions)
              .flatMap(sub => Object.values(sub).flat())
              .find(s => s.id === p.product_suggestion_id);

            if (suggestion) {
              const cat = Object.keys(suggestions).find(c =>
                Object.values(suggestions[c]).flat().some(s => s.id === p.product_suggestion_id)
              );
              if (cat) {
                const sub = Object.keys(suggestions[cat]).find(s =>
                  suggestions[cat][s].some(s => s.id === p.product_suggestion_id)
                );
                if (sub) {
                  preselected[cat] = preselected[cat] || {};
                  preselected[cat][sub] = preselected[cat][sub] || [];
                  preselected[cat][sub].push({
                    value: p.product_suggestion_id,
                    label: suggestion.name,
                    is_available: p.is_available,
                    price: p.price || '',
                    image: p.image || null,
                    category_id: suggestion.category_id,
                    subcategory_id: suggestion.subcategory_id,
                    category_name: cat,
                    subcategory_name: sub,
                  });
                }
              }
            }
          });

        setSelectedProducts(preselected);

        // Custom products
        const customs = selected
          .filter(p => p.custom_name)
          .map((p, i) => ({
            name: p.custom_name,
            category: p.category_name || '',
            subcategory: p.subcategory_name || '',
            is_available: p.is_available,
            price: p.price || '',
            category_id: p.category_id || '',
            subcategory_id: p.subcategory_id || '',
            category_name: p.category_name || '',
            subcategory_name: p.subcategory_name || '',
            image: p.image || null,
            serverIndex: i,
          }));

        setCustomProducts(customs);
      } catch (error) {
        console.error('Error fetching product suggestions:', error);
        alert('Failed to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductSuggestions();
  }, [shop_id]);

  const handleAddCustomProduct = () => {
    if (!customProductName.trim()) {
      alert('Product name is required');
      return;
    }

    if (customProductCategory && !customProductSubcategory) {
      alert('Please select a subcategory.');
      return;
    }

    const category = customProductCategory ? groupedProductSuggestions[customProductCategory] : null;
    const subcategory = category ? category[customProductSubcategory] : null;

    const category_id = subcategory ? subcategory[0]?.category_id : '';
    const subcategory_id = subcategory ? subcategory[0]?.subcategory_id : '';

    const newCustomProduct = {
      name: customProductName.trim(),
      category: customProductCategory || '',
      subcategory: customProductSubcategory || '',
      category_id: category_id || '',
      subcategory_id: subcategory_id || '',
      is_available: true,
      price: '',
      category_name: customProductCategory || '',
      subcategory_name: customProductSubcategory || '',
    };

    setCustomProducts([...customProducts, newCustomProduct]);
    setCustomProductName('');
    setCustomProductCategory('');
    setCustomProductSubcategory('');
  };

  const handleRemoveCustomProduct = index => {
    setCustomProducts(customProducts.filter((_, i) => i !== index));
  };

  const handleProductChange = (category, subcategory, selectedOptions) => {
    setSelectedProducts(prevState => ({
      ...prevState,
      [category]: {
        ...prevState[category],
        [subcategory]: selectedOptions.map(option => ({
          ...option,
          is_available: prevState[category]?.[subcategory]?.find(p => p.value === option.value)?.is_available ?? true,
          category_id: groupedProductSuggestions[category]?.[subcategory]?.find(p => p.id === option.value)?.category_id,
          subcategory_id: groupedProductSuggestions[category]?.[subcategory]?.find(p => p.id === option.value)?.subcategory_id,
          category_name: category,
          subcategory_name: subcategory
        }))
      }
    }));
  };

  const handleCheckboxChange = (category, subcategory, productId) => {
    setSelectedProducts(prevState => ({
      ...prevState,
      [category]: {
        ...prevState[category],
        [subcategory]: prevState[category][subcategory].map(product =>
          product.value === productId
            ? { ...product, is_available: !product.is_available }
            : product
        )
      }
    }));
  };

  const handleSelection = useCallback((category, subcategory, itemId, isSelected, selectedValues, products, productsMap, selectedProducts) => {
    const newSelectedValues = isSelected
      ? selectedValues.filter((id) => id !== itemId)
      : [...selectedValues, itemId];

    const selectedOptions = newSelectedValues
      .map((id) => {
        const product = productsMap[`${category}_${subcategory}_${id}`];
        if (!product) {
          console.warn(`Product with ID ${id} not found`);
          return null;
        }
        const existingProduct = selectedProducts[category]?.[subcategory]?.find(
          (p) => p.value === id
        );
        return {
          value: product.id,
          label: product.name,
          is_available: existingProduct ? existingProduct.is_available : true,
          price: existingProduct?.price ?? null,
        };
      })
      .filter((option) => option !== null);

    handleProductChange(category, subcategory, selectedOptions);
  }, [handleProductChange]);

  const ProductItem = ({ item, isSelected, onSelect }) => {
    return (
      <button className={`product-item ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
        <span className={`checkbox-icon ${isSelected ? 'checked' : ''}`}>
          {isSelected ? '✓' : '□'}
        </span>
        <span className="product-name">{item.name}</span>
      </button>
    );
  };

  const handleProductPriceChange = (category, subcategory, productId, value) => {
    setSelectedProducts(prevState => ({
      ...prevState,
      [category]: {
        ...prevState[category],
        [subcategory]: prevState[category][subcategory].map(product =>
          product.value === productId
            ? { ...product, price: value || '' }
            : product
        )
      }
    }));
  };

  const handleCustomProductCheckboxChange = (index) => {
    setCustomProducts(prevState => {
      const newProducts = [...prevState];
      newProducts[index] = {
        ...newProducts[index],
        is_available: !newProducts[index].is_available
      };
      return newProducts;
    });
  };

  const handleCustomProductPriceChange = (index, value) => {
    setCustomProducts(prevState => {
      const newProducts = [...prevState];
      newProducts[index].price = value;
      return newProducts;
    });
  };

  const handleCustomProductNameChange = (index, value) => {
    const updatedProducts = [...customProducts];
    updatedProducts[index].name = value.trim();
    setCustomProducts(updatedProducts);
  };

  const handleRemoveProduct = (category, subcategory, productId) => {
    setSelectedProducts(prevState => ({
      ...prevState,
      [category]: {
        ...prevState[category],
        [subcategory]: prevState[category][subcategory].filter(product => product.value !== productId),
      }
    }));
  };

  const handleSubmitProducts = async () => {
    try {
      const formData = new FormData();
      formData.append('shop_id', shop_id);
      setIsSubmitting(true);

      const allProducts = [];
      const seenProductIds = new Set();

      Object.entries(selectedProducts).forEach(([category, subcategories]) => {
        Object.values(subcategories).flat().forEach(product => {
          if (!seenProductIds.has(product.value)) {
            seenProductIds.add(product.value);
            allProducts.push(product);
          }
        });
      });

      // Suggested Products
      allProducts.forEach(product => {
        const productId = product.value;
        formData.append('product_suggestions[]', productId);
        formData.append(`is_available_${productId}`, product.is_available ? 'true' : 'false');
        formData.append(`price_${productId}`, product.price ? product.price.toString() : '');

        const imgKey = getImageKey('suggestion', productId);
        if (pendingImages[imgKey]) {
          formData.append(`image_suggestion_${productId}`, pendingImages[imgKey]);
        } else if (product.image) {
          formData.append(`keep_image_suggestion_${productId}`, 'true');
        }
      });

      // Custom Products
      customProducts.forEach((customProduct, index) => {
        formData.append('custom_products[]', customProduct.name);
        formData.append(`is_available_custom_${index}`, customProduct.is_available ? 'true' : 'false');
        formData.append(`price_custom_${index}`, customProduct.price || '');
        formData.append(`category_custom_${index}`, customProduct.category_id || '');
        formData.append(`subcategory_custom_${index}`, customProduct.subcategory_id || '');

        const imgKey = getImageKey('custom', index);
        if (pendingImages[imgKey]) {
          formData.append(`image_custom_${index}`, pendingImages[imgKey]);
        } else if (customProduct.image) {
          formData.append(`keep_image_custom_${index}`, 'true');
        }
      });

      const response = await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/update-shop-products/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Products updated successfully!');
      navigate(`/shop/ShopProduct?shopId=${shop_id}`);
    } catch (error) {
      console.error('Error updating products:', error);
      const msg = error.response?.data?.error || 'Failed to update products. Please try again.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const productsMap = useMemo(() => {
    const map = {};
    Object.entries(groupedProductSuggestions).forEach(([category, subcategories]) => {
      Object.entries(subcategories).forEach(([subcategory, products]) => {
        products.forEach(product => {
          map[`${category}_${subcategory}_${product.id}`] = product;
        });
      });
    });
    return map;
  }, [groupedProductSuggestions]);

  const sortedSubcategories = useMemo(() => {
    return Object.entries(groupedProductSuggestions).reduce((acc, [category, subcategories]) => {
      const sorted = Object.keys(subcategories).sort((a, b) => {
        const aHasProducts = selectedProducts[category]?.[a]?.length > 0;
        const bHasProducts = selectedProducts[category]?.[b]?.length > 0;
        if (aHasProducts && !bHasProducts) return -1;
        if (!aHasProducts && bHasProducts) return 1;
        return a.localeCompare(b);
      });
      acc[category] = sorted;
      return acc;
    }, {});
  }, [groupedProductSuggestions, selectedProducts]);

  const selectedValuesMap = useMemo(() => {
    const map = {};
    Object.entries(selectedProducts).forEach(([category, subcategories]) => {
      Object.entries(subcategories).forEach(([subcategory, products]) => {
        const selectedValues = products
          .map(p => p.value)
          .filter(id => id !== undefined) || [];
        map[`${category}_${subcategory}`] = new Set(selectedValues);
      });
    });
    return map;
  }, [selectedProducts]);

  // Initialize expanded categories
  useEffect(() => {
    const initialExpanded = Object.keys(groupedProductSuggestions).reduce((acc, category) => {
      acc[category] = false;
      return acc;
    }, {});
    setExpandedCategories(initialExpanded);
  }, [groupedProductSuggestions]);

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Initialize selected products structure
  useEffect(() => {
    const initializedSelectedProducts = {};
    Object.entries(groupedProductSuggestions).forEach(([category, subcategories]) => {
      initializedSelectedProducts[category] = {};
      Object.keys(subcategories).forEach((subcategory) => {
        if (!initializedSelectedProducts[category][subcategory]) {
          initializedSelectedProducts[category][subcategory] =
            selectedProducts[category]?.[subcategory] || [];
        }
      });
    });
    setSelectedProducts(initializedSelectedProducts);
  }, [groupedProductSuggestions]);

  // ────────────────────────────────────────────────
  // Single return using PageShell
  // ────────────────────────────────────────────────
  return (
    <PageShell
      title="Edit Space Listings"
      isLoading={loading}
      error={null}           // Add real error state if you implement fetch error handling
      // onRetry={/* optional retry function */}
      showBackButton={true}  // Enables back arrow in global header
    >
      <div className="update-shop-products">
        <div className="scroll-container">
          <div className="shop-manager-content">
            {/* Custom Product Section */}
            <div className="custom-product-container">
              {customProducts.length > 0 && (
                <div className="table-wrapper">
                  <h3 className="custom-table-title">Create Your Own Listing</h3>
                  <div className="table-scroll-container">
                    <table className="product-table">
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th>Type</th>
                          <th>Available</th>
                          <th>Price</th>
                          <th>Img</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customProducts.map((product, index) => (
                          <tr key={index}>
                            <td>
                              {editingIndex === index ? (
                                <input
                                  className="custom-name-input"
                                  value={product.name}
                                  onChange={(e) => handleCustomProductNameChange(index, e.target.value)}
                                  onBlur={() => setEditingIndex(null)}
                                  onKeyDown={(e) => e.key === 'Enter' && setEditingIndex(null)}
                                  autoFocus
                                  placeholder="Enter listing name"
                                />
                              ) : (
                                <button 
                                  className="editable-text"
                                  onClick={() => setEditingIndex(index)}
                                >
                                  {product.name}
                                </button>
                              )}
                            </td>
                            <td className="category-cell">
                              <div className="category-display">
                                <div className="category-name">{product.category_name || '—'}</div>
                                {product.subcategory_name ? (
                                  <div className="subcategory-name">└ {product.subcategory_name}</div>
                                ) : (
                                  <div className="no-subcategory">No subcategory</div>
                                )}
                              </div>
                            </td>
                            <td>
                              <label className="checkbox-container">
                                <input
                                  type="checkbox"
                                  checked={product.is_available}
                                  onChange={() => handleCustomProductCheckboxChange(index)}
                                  className="checkbox-input"
                                />
                                <span className="checkbox-checkmark"></span>
                              </label>
                            </td>
                            <td>
                              <button
                                className="price-button"
                                onClick={() => {
                                  setModalTargetInfo({ type: "custom", index });
                                  setModalValue(product.price || "");
                                  setShowModal(true);
                                }}
                              >
                                {product.price ? `₦${Number(product.price).toLocaleString()}` : "Set Price"}
                              </button>
                            </td>
                            <td>
                              <ProductImageManager
                                productKey={getImageKey('custom', index, product)}
                                currentImageUrl={product.image ?? null}
                                onImageSelect={(key, file) => setPendingImages(p => ({ ...p, [key]: file }))}
                                onImageRemove={(key) => setPendingImages(p => {
                                  const { [key]: _, ...rest } = p;
                                  return rest;
                                })}
                              />
                            </td>
                            <td>
                              <button
                                onClick={() => handleRemoveCustomProduct(index)}
                                className="remove-button"
                              >
                                X
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Custom Product Input Form */}
              <div className="custom-product-inputs">
                <input
                  ref={customNameInputRef}
                  className="custom-name-input"
                  placeholder="Input your custom listing"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomProduct()}
                />
                <div className="custom-card">
                  <button
                    className="dropdown-box"
                    onClick={() => setIsCategoryDropdownOpen(true)}
                  >
                    <span className={customProductCategory ? 'up-dropdown-text' : 'placeholder-text'}>
                      {customProductCategory || "Select Category"}
                    </span>
                    <span className="chevron-icon">▼</span>
                  </button>

                  {/* Category Modal */}
                  {isCategoryDropdownOpen && (
                    <div className="modal-overlay" onClick={() => setIsCategoryDropdownOpen(false)}>
                      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Select Category</h3>
                        <input
                          className="search-input"
                          placeholder="Search Categories..."
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                        />
                        <div className="dropdown-list">
                          {Object.keys(groupedProductSuggestions)
                            .filter((category) => category.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                            .map((category) => (
                              <button
                                key={category}
                                className={`dropdown-item ${customProductCategory === category ? 'selected' : ''}`}
                                onClick={() => {
                                  setCustomProductCategory(category);
                                  setCustomProductSubcategory("");
                                  setSubcategoryTouched(false);
                                  setSubcategoryResetTrigger((prev) => prev + 1);
                                  setIsCategoryDropdownOpen(false);
                                  setCategorySearchQuery("");
                                }}
                              >
                                {category}
                              </button>
                            ))}
                        </div>
                        <button 
                          className="modal-cancel-button"
                          onClick={() => {
                            setIsCategoryDropdownOpen(false);
                            setCategorySearchQuery("");
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    className={`dropdown-box ${!customProductCategory ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!customProductCategory) return;
                      setIsSubcategoryDropdownOpen(true);
                    }}
                    disabled={!customProductCategory}
                  >
                    <span className={customProductSubcategory ? 'dropdown-text' : 'placeholder-text'}>
                      {customProductSubcategory || "Select Subcategory"}
                    </span>
                    <span className="chevron-icon">▼</span>
                  </button>

                  {/* Subcategory Modal */}
                  {isSubcategoryDropdownOpen && (
                    <div className="modal-overlay" onClick={() => setIsSubcategoryDropdownOpen(false)}>
                      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Select Subcategory</h3>
                        <input
                          className="search-input"
                          placeholder="Search Subcategories..."
                          value={subcategorySearchQuery}
                          onChange={(e) => setSubcategorySearchQuery(e.target.value)}
                        />
                        <div className="dropdown-list">
                          {customProductCategory
                            ? Object.keys(groupedProductSuggestions[customProductCategory] || {})
                                .filter((subcategory) =>
                                  subcategory.toLowerCase().includes(subcategorySearchQuery.toLowerCase())
                                )
                                .map((subcategory) => (
                                  <button
                                    key={subcategory}
                                    className={`dropdown-item ${customProductSubcategory === subcategory ? 'selected' : ''}`}
                                    onClick={() => {
                                      setCustomProductSubcategory(subcategory);
                                      setSubcategoryTouched(true);
                                      setIsSubcategoryDropdownOpen(false);
                                      setSubcategorySearchQuery("");
                                    }}
                                  >
                                    {subcategory}
                                  </button>
                                ))
                            : null}
                        </div>
                        <button 
                          className="modal-cancel-button"
                          onClick={() => {
                            setIsSubcategoryDropdownOpen(false);
                            setSubcategorySearchQuery("");
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button className="add-button" onClick={handleAddCustomProduct}>
                  Add New Listing
                </button>
              </div>
            </div>

            {/* Product Suggestions Section */}
            <div className="suggestions-section">
              {Object.entries(groupedProductSuggestions).map(([category, subcategories]) => (
                <div key={category} className="category-container">
                  <div className="category-header">
                    <h2 className="up-category-title">{category}</h2>
                    <button onClick={() => toggleCategory(category)} className="category-toggle">
                      {expandedCategories[category] ? '▲' : '▼'}
                    </button>
                  </div>
                  {expandedCategories[category] && (
                    <div>
                      {sortedSubcategories[category]?.map((subcategory) => {
                        const products = subcategories[subcategory];
                        const dropdownKey = getDropdownKey(category, subcategory);
                        const dropdownData = dropdownState[dropdownKey] || {
                          isOpen: false,
                          searchQuery: "",
                          filteredItems: products.map((product) => ({
                            id: product.id,
                            name: product.name,
                          })),
                        };
                        const selectedValues = selectedProducts[category]?.[subcategory]?.map((p) => p.value).filter((id) => id !== undefined) || [];

                        return (
                          <div key={subcategory} className="subcategory-container">
                            <h4 className="up-subcategory-title">{subcategory}</h4>
                            <button
                              className="dropdown-box"
                              onClick={() => {
                                setDropdownState((prev) => ({
                                  ...prev,
                                  [dropdownKey]: { ...dropdownData, isOpen: true },
                                }));
                              }}
                            >
                              <span className={selectedValues.length > 0 ? 'dropdown-text' : 'placeholder-text'}>
                                {selectedValues.length > 0 ? `${selectedValues.length} listing(s) selected` : "Pick Products"}
                              </span>
                              <span className="chevron-icon">▼</span>
                            </button>

                            {/* Product Selection Modal */}
                            {dropdownData.isOpen && (
                              <div className="modal-overlay" onClick={() => {
                                setDropdownState((prev) => ({
                                  ...prev,
                                  [dropdownKey]: {
                                    ...dropdownData,
                                    isOpen: false,
                                    searchQuery: "",
                                    filteredItems: products.map((product) => ({
                                      id: product.id,
                                      name: product.name,
                                    })),
                                  },
                                }));
                              }}>
                                <div className="modal-content product-modal" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    className="search-input"
                                    placeholder="Search Products..."
                                    value={dropdownData.searchQuery}
                                    onChange={(e) => {
                                      // You need to define handleDropdownSearch if missing
                                      // For now assuming it's defined elsewhere or add it
                                      const query = e.target.value.toLowerCase();
                                      const filtered = products
                                        .filter(p => p.name.toLowerCase().includes(query))
                                        .map(p => ({ id: p.id, name: p.name }));
                                      setDropdownState(prev => ({
                                        ...prev,
                                        [dropdownKey]: { ...dropdownData, searchQuery: query, filteredItems: filtered }
                                      }));
                                    }}
                                  />
                                  <div className="product-list">
                                    {dropdownData.filteredItems.map((item) => {
                                      const isSelected = selectedValuesMap[`${category}_${subcategory}`]?.has(item.id);
                                      return (
                                        <ProductItem
                                          key={item.id}
                                          item={item}
                                          isSelected={isSelected}
                                          onSelect={() =>
                                            handleSelection(
                                              category,
                                              subcategory,
                                              item.id,
                                              isSelected,
                                              selectedValues,
                                              products,
                                              productsMap,
                                              selectedProducts
                                            )
                                          }
                                        />
                                      );
                                    })}
                                  </div>
                                  <button
                                    className="done-button"
                                    onClick={() => {
                                      setDropdownState((prev) => ({
                                        ...prev,
                                        [dropdownKey]: {
                                          ...dropdownData,
                                          isOpen: false,
                                          searchQuery: "",
                                          filteredItems: products.map((product) => ({
                                            id: product.id,
                                            name: product.name,
                                          })),
                                        },
                                      }));
                                    }}
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Selected Products Table */}
                            {selectedProducts[category]?.[subcategory]?.length > 0 && (
                              <div className="table-wrapper">
                                <table className="product-table">
                                  <thead>
                                    <tr>
                                      <th>Listing Name</th>
                                      <th>Available</th>
                                      <th>Price</th>
                                      <th>Img</th>
                                      <th>Delete</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedProducts[category][subcategory].map((product) => (
                                      <tr key={product.value}>
                                        <td>{product.label}</td>
                                        <td>
                                          <label className="checkbox-container">
                                            <input
                                              type="checkbox"
                                              checked={product.is_available}
                                              onChange={() => handleCheckboxChange(category, subcategory, product.value)}
                                              className="checkbox-input"
                                            />
                                            <span className="checkbox-checkmark"></span>
                                          </label>
                                        </td>
                                        <td>
                                          <button
                                            className="price-button"
                                            onClick={() => {
                                              setModalValue(product.price || "");
                                              setModalTargetInfo({ category, subcategory, productId: product.value });
                                              setShowModal(true);
                                            }}
                                          >
                                            {product.price ? `₦${Number(product.price).toLocaleString()}` : "Set Price"}
                                          </button>
                                        </td>
                                        <td>
                                          <ProductImageManager
                                            productKey={getImageKey('suggestion', product.value)}
                                            currentImageUrl={product.image ?? null}
                                            onImageSelect={(key, file) => setPendingImages(p => ({ ...p, [key]: file }))}
                                            onImageRemove={(key) => setPendingImages(p => {
                                              const { [key]: _, ...rest } = p;
                                              return rest;
                                            })}
                                          />
                                        </td>
                                        <td>
                                          <button
                                            className="remove-button"
                                            onClick={() => {
                                              setPendingDeleteInfo({ category, subcategory, productId: product.value });
                                              setShowDeleteModal(true);
                                            }}
                                          >
                                            X
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <button
              className={`submit-button ${isSubmitting ? 'disabled' : ''}`}
              onClick={handleSubmitProducts}
              disabled={isSubmitting}
            >
              {isSubmitting ? <div className="spinner small"></div> : <span>Update Products</span>}
            </button>

            {/* Price Edit Modal */}
            {showModal && (
              <div className="modal-overlay" onClick={() => {
                setShowModal(false);
                setModalTargetInfo(null);
                setModalValue("");
              }}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3 className="modal-title">Edit Listing Price</h3>
                  <p className="modal-text">Enter a new price:</p>
                  <input
                    className="price-input full-width"
                    value={modalValue ? modalValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setModalValue(raw);
                    }}
                    type="text"
                    placeholder="e.g. 1500"
                    autoFocus
                  />
                  <div className="modal-button-row">
                    <button
                      className="modal-confirm-button"
                      onClick={() => {
                        if (modalTargetInfo) {
                          if (modalTargetInfo.type === "custom") {
                            handleCustomProductPriceChange(modalTargetInfo.index, modalValue);
                          } else {
                            const { category, subcategory, productId } = modalTargetInfo;
                            handleProductPriceChange(category, subcategory, productId, modalValue);
                          }
                        }
                        setShowModal(false);
                        setModalTargetInfo(null);
                        setModalValue("");
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="modal-cancel-button"
                      onClick={() => {
                        setShowModal(false);
                        setModalTargetInfo(null);
                        setModalValue("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
              <div className="modal-overlay" onClick={() => {
                setShowDeleteModal(false);
                setPendingDeleteInfo(null);
              }}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3 className="modal-title">Confirm Delete</h3>
                  <p className="modal-text">Are you sure you want to remove this listing?</p>
                  <div className="modal-button-row">
                    <button
                      className="modal-confirm-button"
                      onClick={() => {
                        if (pendingDeleteInfo) {
                          const { category, subcategory, productId } = pendingDeleteInfo;
                          setSelectedProducts((prev) => {
                            const updatedCategory = { ...prev[category] };
                            updatedCategory[subcategory] = updatedCategory[subcategory].filter((p) => p.value !== productId);
                            return { ...prev, [category]: updatedCategory };
                          });
                          setShowDeleteModal(false);
                          setPendingDeleteInfo(null);
                        }
                      }}
                    >
                      Delete
                    </button>
                    <button
                      className="modal-cancel-button"
                      onClick={() => {
                        setShowDeleteModal(false);
                        setPendingDeleteInfo(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default UpdateShopProducts;