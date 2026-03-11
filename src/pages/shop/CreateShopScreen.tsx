import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Select from 'react-select';
import axios from "axios";
import '../../css/shop/CreateShop.css';

export default function CreateShopScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [geoLocation, setGeoLocation] = useState({ lat: "", lng: "" });
  const [address, setAddress] = useState("");
  const [showAddressField, setShowAddressField] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [geoError, setGeoError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGeoFields, setShowGeoFields] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [childLocations, setChildLocations] = useState([]);
  const [selectedChildLocation, setSelectedChildLocation] = useState(null);
  const [grandChildLocations, setGrandChildLocations] = useState([]);
  const [selectedGrandChildLocation, setSelectedGrandChildLocation] = useState(null);
  const [locationDetected, setLocationDetected] = useState(false);

  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const addressInputRef = useRef(null);

  // Session ID
  const getSessionId = useCallback(() => {
    try {
      const sessionIdString = localStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
    } catch (err) {
      console.error("Error fetching session ID:", err);
    }
  }, []);

  useEffect(() => {
    getSessionId();
  }, [getSessionId]);

  // Fetch categories & top-level locations
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/category/dropdown-options/");
        const data = res.data.categories.map(cat => ({
          value: cat.id,
          label: cat.name,
        }));
        const sorted = data.sort((a, b) => a.label.localeCompare(b.label));
        setCategories(sorted);
        setFilteredCategories(sorted);
      } catch (err) {
        console.error("Categories fetch error:", err);
      }
    };

    const fetchTopLocations = async () => {
      try {
        const res = await axios.post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/states/");
        const sorted = res.data.locations
          .map(loc => ({ value: loc.id, label: loc.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setLocations(sorted);
      } catch (err) {
        console.error("Locations fetch error:", err);
      }
    };

    fetchCategories();
    fetchTopLocations();
  }, []);

  useEffect(() => {
    setFilteredCategories(
      categories.filter(cat =>
        cat.label.toLowerCase().includes(categorySearch.toLowerCase())
      )
    );
  }, [categorySearch, categories]);

  // Location cascade handlers
  const handleLocationChange = useCallback(async (option) => {
    const val = option?.value || null;
    setSelectedLocation(val);
    setSelectedChildLocation(null);
    setChildLocations([]);
    setSelectedGrandChildLocation(null);
    setGrandChildLocations([]);

    if (val) {
      try {
        const formData = new FormData();
        formData.append("parent_id", val);
        const res = await axios.post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/children/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const sorted = res.data.locations
          .map(l => ({ value: l.id, label: l.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setChildLocations(sorted);
      } catch (err) {
        console.error("Child locations error:", err);
      }
    }
  }, []);

  const handleChildLocationChange = useCallback(async (option) => {
    const val = option?.value || null;
    setSelectedChildLocation(val);
    setSelectedGrandChildLocation(null);
    setGrandChildLocations([]);

    if (val) {
      try {
        const formData = new FormData();
        formData.append("parent_id", val);
        const res = await axios.post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/location/children/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const sorted = res.data.locations
          .map(l => ({ value: l.id, label: l.name }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setGrandChildLocations(sorted);
      } catch (err) {
        console.error("Grandchild locations error:", err);
      }
    }
  }, []);

  const handleGrandChildLocationChange = useCallback((option) => {
    setSelectedGrandChildLocation(option?.value || null);
  }, []);

  // Geolocation handler
  const handlePinLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported.");
      return;
    }
    if (isDetectingLocation) return;

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeoLocation({ lat: latitude.toString(), lng: longitude.toString() });
        setShowGeoFields(true);
        setLocationDetected(true);
        setGeoError("");

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setAddress(data.display_name || "Address detected");
        } catch {
          setAddress("Enter address manually");
        }

        setShowAddressField(true);
        document.getElementById("address")?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
      (err) => {
        setGeoError(err.code === 3 ? "Location timed out." : "Location error.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    setIsDetectingLocation(false);
  }, [isDetectingLocation]);

  // Form validation
  const handleValidation = useCallback(() => {
    const errors = {};
    if (!name.trim()) errors.name = "Business name is required.";
    if (!description.trim()) errors.description = "Description is required.";
    if (!address.trim()) errors.address = "Address is required.";
    if (!geoLocation.lat || !geoLocation.lng) errors.geoLocation = "Please detect location.";
    if (!selectedLocation) errors.location = "State is required.";
    if (!selectedChildLocation) errors.childLocation = "LGA is required.";
    if (!selectedGrandChildLocation) errors.grandChildLocation = "Specific location is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, description, address, geoLocation, selectedLocation, selectedChildLocation, selectedGrandChildLocation]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!handleValidation() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("shop_name", name);
      formData.append("description", description);
      formData.append("geo_location", `POINT(${geoLocation.lng} ${geoLocation.lat})`);
      formData.append("address", address);
      formData.append("lga", selectedChildLocation);
      formData.append("location", selectedGrandChildLocation);
      selectedSubcategories.forEach(id => formData.append("subcategories[]", id));

      const res = await axios.post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/create-shop/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: sessionId,
        },
      });

      alert("Business space created successfully!");
      navigate(`/shop/welcome-work-hours/shopId=${res.data.shop_id}`);
    } catch (err) {
      console.error("Create error:", err);
      alert("Failed to create business space.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, description, geoLocation, address, selectedChildLocation, selectedGrandChildLocation, selectedSubcategories, sessionId, handleValidation, navigate]);

  // Category selection → fetch subcategories
  const handleCategoryChange = useCallback(async (category) => {
    setSelectedCategory(category.value);
    setSelectedCategoryName(category.label);
    setModalVisible(false);
    setCategorySearch("");
    setSelectedSubcategories([]);

    try {
      const formData = new FormData();
      formData.append("parent_id", category.value);
      const res = await axios.post("https://retail-alvinia-goza-f6a0e4f7.koyeb.app/category/subcategories/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const sorted = res.data.subcategories
        .map(sub => ({ value: sub.id, label: sub.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      setSubcategories(sorted);
      document.getElementById("subcategories")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      console.error("Subcategories error:", err);
      setSubcategories([]);
    }
  }, []);

  // ── react-select styles – glassmorphism + portal fix ────────────────────────
  const selectCustomStyles = {
    control: (base, { isFocused }) => ({
      ...base,
      background: 'var(--field-bg)',
      borderColor: isFocused ? 'var(--accent)' : 'var(--border-base)',
      borderWidth: '1.5px',
      borderRadius: 'var(--radius-md)',
      boxShadow: isFocused ? '0 0 0 4px var(--accent-glow)' : 'none',
      minHeight: '56px',
      padding: '2px 8px',
      transition: 'all 0.3s ease',
      '&:hover': { borderColor: 'var(--accent)' }
    }),
    menuPortal: base => ({
      ...base,
      zIndex: 9999, // very high value – appears on top of everything
    }),
    menu: base => ({
      ...base,
      background: 'var(--card-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--border-base)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-hover)',
      marginTop: 8,
      overflow: 'hidden',
    }),
    menuList: base => ({
      ...base,
      padding: '8px',
      maxHeight: '360px',
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected
        ? 'var(--accent)'
        : isFocused
        ? 'var(--accent-glow)'
        : 'transparent',
      color: isSelected ? 'white' : 'var(--text-primary)',
      borderRadius: '8px',
      padding: '12px 16px',
      cursor: 'pointer',
      transition: 'all 0.18s ease',
    }),
    multiValue: base => ({
      ...base,
      backgroundColor: 'rgba(37,99,235,0.12)',
      borderRadius: '999px',
      padding: '3px 8px',
    }),
    multiValueLabel: base => ({
      ...base,
      color: 'var(--accent)',
      fontWeight: 500,
    }),
    multiValueRemove: base => ({
      ...base,
      color: 'var(--accent)',
      ':hover': {
        backgroundColor: 'rgba(37,99,235,0.25)',
        color: 'white',
      }
    })
  };

  return (
    <div className="create-shop-screen">

      <header className="header-container">
        <div className="header-inner">
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>
          <h1 className="header-title">Create Business Space</h1>
          <div style={{ width: '80px' }} />
        </div>
      </header>

      <main className="form-main" ref={scrollRef}>
        {/* Business Name */}
        <section className="form-section">
          <div className={`input-group ${name ? 'filled' : ''}`}>
            <input
              id="name-input"
              className="form-input"
              placeholder=" "
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <label htmlFor="name-input" className="floating-label">Business Name</label>
          </div>
          {formErrors.name && <div className="error-text">{formErrors.name}</div>}
        </section>

        {/* Description */}
        <section className="form-section">
          <div className={`input-group ${description ? 'filled' : ''}`}>
            <textarea
              id="desc-input"
              className="form-input textarea"
              placeholder=" "
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
            />
            <label htmlFor="desc-input" className="floating-label">Description</label>
          </div>
          {formErrors.description && <div className="error-text">{formErrors.description}</div>}
        </section>

        {/* Category */}
        <section className="form-section">
          <div className="input-group">
            <button
              className="dropdown-trigger"
              onClick={() => setModalVisible(true)}
            >
              <span>{selectedCategoryName || "Select Category"}</span>
              <svg className="dropdown-icon" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </button>
            
          </div>
        </section>

        {/* Subcategories */}
        {selectedCategory && subcategories.length > 0 && (
          <section id="subcategories" className="form-section">
            <div className="input-group">
              <Select
                isMulti
                options={subcategories}
                value={subcategories.filter(opt => selectedSubcategories.includes(opt.value))}
                onChange={opts => setSelectedSubcategories(opts ? opts.map(o => o.value) : [])}
                placeholder="Select subcategories..."
                className="premium-select"
                classNamePrefix="react-select"
                styles={selectCustomStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                isSearchable
                closeMenuOnSelect={false}
              />
            </div>
          </section>
        )}

        {/* State */}
<section className="form-section">
  <div className="input-group">
    <Select
      options={locations}
      value={locations.find(l => l.value === selectedLocation) || null}
      onChange={handleLocationChange}
       placeholder=""   
      className="premium-select"
      classNamePrefix="react-select"
      styles={selectCustomStyles}
      menuPortalTarget={document.body}
      menuPosition="fixed"
    />
    <label className="floating-label">
      {selectedLocation 
        ? locations.find(l => l.value === selectedLocation)?.label || "State"
        : "State"}
    </label>
  </div>
  {formErrors.location && <div className="error-text">{formErrors.location}</div>}
</section>

{/* LGA */}
{selectedLocation && childLocations.length > 0 && (
  <section className="form-section">
    <div className="input-group">
      <Select
        options={childLocations}
        value={childLocations.find(l => l.value === selectedChildLocation) || null}
        onChange={handleChildLocationChange}
        placeholder=""   
        className="premium-select"
        classNamePrefix="react-select"
        styles={selectCustomStyles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
      <label className="floating-label">
        {selectedChildLocation 
          ? childLocations.find(l => l.value === selectedChildLocation)?.label || "LGA"
          : "Local Government Area"}
      </label>
    </div>
    {formErrors.childLocation && <div className="error-text">{formErrors.childLocation}</div>}
  </section>
)}

{/* Specific Location */}
{selectedChildLocation && grandChildLocations.length > 0 && (
  <section className="form-section">
    <div className="input-group">
      <Select
        options={grandChildLocations}
        value={grandChildLocations.find(l => l.value === selectedGrandChildLocation) || null}
        onChange={opt => setSelectedGrandChildLocation(opt?.value || null)}
        placeholder=""   
        className="premium-select"
        classNamePrefix="react-select"
        styles={selectCustomStyles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
      <label className="floating-label">
        {selectedGrandChildLocation 
          ? grandChildLocations.find(l => l.value === selectedGrandChildLocation)?.label || "Location"
          : "Specific Location"}
      </label>
    </div>
    {formErrors.grandChildLocation && <div className="error-text">{formErrors.grandChildLocation}</div>}
  </section>
)}

        {/* Address */}
        {showAddressField && (
          <section id="address" className="form-section">
            <div className={`input-group ${address ? 'filled' : ''}`}>
              <textarea
                ref={addressInputRef}
                id="address-input"
                className="form-input textarea"
                placeholder=" "
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={3}
              />
              <label htmlFor="address-input" className="floating-label">Address</label>
            </div>
            {formErrors.address && <div className="error-text">{formErrors.address}</div>}
          </section>
        )}

        {/* Geo Detection */}
        <section className="form-section">
          {showGeoFields && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '1.4rem' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Latitude</div>
                <div className="geo-readonly">{geoLocation.lat || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Longitude</div>
                <div className="geo-readonly">{geoLocation.lng || "—"}</div>
              </div>
            </div>
          )}

          {!locationDetected && (
            <button
              className={`detect-btn ${isDetectingLocation ? 'loading' : ''}`}
              onClick={handlePinLocation}
              disabled={isDetectingLocation}
            >
              {isDetectingLocation ? 'Detecting location...' : '📍 Detect My Location'}
            </button>
          )}

          <div className="helper-text">
            Stand outside your business for accurate positioning
          </div>

          {(geoError || formErrors.geoLocation) && (
            <div className="error-text">{geoError || formErrors.geoLocation}</div>
          )}
        </section>

        {/* Submit */}
        <section className="form-section" style={{ padding: '1.2rem' }}>
          <button
            className={`submit-btn ${isSubmitting ? 'loading' : ''}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Business Space"}
          </button>
        </section>
      </main>

      {/* Category Modal */}
      {modalVisible && (
        <div className="modal-backdrop" onClick={() => setModalVisible(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <button className="modal-back" onClick={() => setModalVisible(false)}>
                ← Back
              </button>
              <h2 className="modal-title">Select Category</h2>
            </div>

            <input
              className="modal-search"
              placeholder="Search categories..."
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              autoFocus
            />

            <div className="category-scroll">
              {filteredCategories.length > 0 ? (
                filteredCategories.map(cat => (
                  <button
                    key={cat.value}
                    className="category-option"
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat.label}
                  </button>
                ))
              ) : (
                <div className="no-results">No categories found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}