// ShopProfile.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from "react-router-dom";
import PageShell from "../../components/PageShell"; // adjust path if needed
import "../../css/shop/ShopProfile.css";

const API_BASE = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";

interface Category {
  id: number;
  name: string;
}

interface FormData {
  name: string;
  description: string;
  address: string;
  image: string | null; // preview URL
  parentCategory: number | null;
  childCategories: number[];
}

const ShopProfile = () => {
  const location = useLocation();
  const shopId = location.state?.shopId;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    address: "",
    image: null,
    parentCategory: null,
    childCategories: [],
  });

  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [childCategories, setChildCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [childSearch, setChildSearch] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem("sessionToken") || "";

  // Fetch shop data + categories
  useEffect(() => {
    if (!shopId || !token) {
      setError("Missing shop ID or token");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch shop profile
        const shopRes = await fetch(`${API_BASE}/shop/profile/${shopId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!shopRes.ok) throw new Error("Failed to load shop profile");
        const shop = await shopRes.json();

        const initialForm: FormData = {
          name: shop.name || "",
          description: shop.description || "",
          address: shop.address || "",
          image: shop.image || null,
          parentCategory: shop.parent_category_id || null,
          childCategories: shop.category_ids || [],
        };

        setFormData(initialForm);
        setOriginalData(initialForm);

        // 2. Load parent categories
        const parentRes = await fetch(`${API_BASE}/category/dropdown-options/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!parentRes.ok) throw new Error("Failed to load parents");
        const parentData = await parentRes.json();
        setParentCategories(
          parentData.categories
            ?.sort((a: Category, b: Category) => a.name.localeCompare(b.name)) || []
        );

        // 3. If parent exists → load children
        if (initialForm.parentCategory) {
          await loadChildren(initialForm.parentCategory);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [shopId, token]);

  const loadChildren = async (parentId: number) => {
    try {
      const form = new FormData();
      form.append("parent_id", parentId.toString());

      const res = await fetch(`${API_BASE}/category/subcategories/`, {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load subcategories");

      const data = await res.json();
      setChildCategories(
        data.subcategories
          ?.sort((a: Category, b: Category) => a.name.localeCompare(b.name)) || []
      );
    } catch (err) {
      console.error("Subcategories load failed:", err);
    }
  };

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null;
    setFormData(prev => ({ ...prev, parentCategory: id, childCategories: [] }));
    if (id) loadChildren(id);
  };

  const toggleChild = (id: number) => {
    setFormData(prev => ({
      ...prev,
      childCategories: prev.childCategories.includes(id)
        ? prev.childCategories.filter(cid => cid !== id)
        : [...prev.childCategories, id],
    }));
  };

  const pickImage = () => fileInputRef.current?.click();

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, image: url }));
    }
  };

  const hasChanges = originalData
    ? JSON.stringify(formData) !== JSON.stringify(originalData)
    : false;

  const handleSave = async () => {
    if (isSubmitting || !hasChanges || !shopId || !token) return;

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("shop_id", shopId);

      if (formData.name !== originalData!.name) fd.append("shop_name", formData.name);
      if (formData.description !== originalData!.description) fd.append("description", formData.description);
      if (formData.address !== originalData!.address) fd.append("address", formData.address);

      if (formData.parentCategory !== originalData!.parentCategory) {
        fd.append("category_id", formData.parentCategory?.toString() || "");
      }

      // Always send current child categories (backend should replace)
      formData.childCategories.forEach(id => fd.append("subcategory_ids", id.toString()));

      // Image - if changed and is preview URL, we need real File → for simplicity assume you store File separately if needed
      // Here we skip real file upload for demo (you can add File state)

      const res = await fetch(`${API_BASE}/shop/profile/${shopId}/`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Update failed");
      }

      setOriginalData({ ...formData });
      alert("Profile updated successfully!");
      window.history.back();
    } catch (err: any) {
      console.error(err);
      alert("Update failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredChildren = childCategories.filter(c =>
    c.name.toLowerCase().includes(childSearch.toLowerCase())
  );

  return (
    <PageShell
      title="Business Profile"
      isLoading={isLoading}
      error={error}
      onRetry={() => window.location.reload()}
      backPath={-1}
    >
      <div className="shpp-profile-container">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImage}
          style={{ display: "none" }}
        />

        {/* Image */}
        <div className="shpp-image-wrapper">
          <div className="shpp-image-preview" onClick={pickImage}>
            <img
              src={formData.image || "/placeholder-shop.png"}
              alt="Shop"
              className="shpp-profile-img"
            />
            <div className="shpp-upload-overlay">
              <span>Change Photo</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="shpp-form">
          <div className="shpp-field">
            <label>Business Name</label>
            <input
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="Enter business name"
              className="shpp-input"
            />
          </div>

          <div className="shpp-field">
            <label>Address</label>
            <input
              value={formData.address}
              onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
              placeholder="Enter full address"
              className="shpp-input"
            />
          </div>

          <div className="shpp-field">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe your business..."
              className="shpp-textarea"
              rows={4}
            />
          </div>

          <div className="shpp-field">
            <label>Parent Category</label>
            <select
              value={formData.parentCategory ?? ""}
              onChange={handleParentChange}
              className="shpp-select"
            >
              <option value="">Select parent category</option>
              {parentCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {formData.parentCategory && childCategories.length > 0 && (
            <div className="shpp-field">
              <label>Child Categories ({formData.childCategories.length} selected)</label>

              {/* Tags */}
              <div className="shpp-tags">
                {formData.childCategories.map(id => {
                  const cat = childCategories.find(c => c.id === id);
                  return cat ? (
                    <div key={id} className="shpp-tag">
                      {cat.name}
                      <button onClick={() => toggleChild(id)}>×</button>
                    </div>
                  ) : null;
                })}
              </div>

              {/* Trigger modal */}
              <button
                className="shpp-multi-trigger"
                onClick={() => setShowChildModal(true)}
              >
                {formData.childCategories.length === 0
                  ? "Select child categories"
                  : "Edit selection"}
              </button>
            </div>
          )}
        </div>

        {/* Save */}
        <button
          className={`shpp-save-btn ${!hasChanges || isSubmitting ? "disabled" : ""}`}
          onClick={handleSave}
          disabled={!hasChanges || isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Profile"}
        </button>

        {/* Child Categories Modal */}
        {showChildModal && (
          <div className="shpp-modal-overlay" onClick={() => setShowChildModal(false)}>
            <div className="shpp-modal" onClick={e => e.stopPropagation()}>
              <div className="shpp-modal-header">
                <h3>Select Child Categories</h3>
                <button onClick={() => setShowChildModal(false)}>×</button>
              </div>

              <input
                type="text"
                value={childSearch}
                onChange={e => setChildSearch(e.target.value)}
                placeholder="Search categories..."
                className="shpp-modal-search"
                autoFocus
              />

              <div className="shpp-modal-list">
                {filteredChildren.map(cat => (
                  <label
                    key={cat.id}
                    className={`shpp-modal-item ${formData.childCategories.includes(cat.id) ? "selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.childCategories.includes(cat.id)}
                      onChange={() => toggleChild(cat.id)}
                    />
                    <span>{cat.name}</span>
                  </label>
                ))}

                {filteredChildren.length === 0 && (
                  <p className="shpp-no-results">No categories found</p>
                )}
              </div>

              <button
                className="shpp-modal-done"
                onClick={() => setShowChildModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default ShopProfile;