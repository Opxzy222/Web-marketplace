// GenerateReceipt.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import PageShell from "../../components/PageShell";
import SubscriptionRequiredModal from "../../components/RequiredSubscription";
import "../../css/shop/GenerateReceipt.css";

const GenerateReceipt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const shopId = location.state?.shopId;
  const senderId = location.state?.senderId;

  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", qty: "", price: "" });
  const [receiptData, setReceiptData] = useState({
    pdfUrl: null,
    imageUrls: [],
    receipt_id: null,
  });
  const [totalAmount, setTotalAmount] = useState(0);
  const [shopProducts, setShopProducts] = useState([]);
  const [nameLoading, setNameLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [customerId, setCustomerId] = useState(senderId || "");

  // Controls visibility of the suggestion dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Refs
  const customerIdRef = useRef(null);
  const itemNameRef = useRef(null);
  const qtyRef = useRef(null);
  const priceRef = useRef(null);
  const suggestionContainerRef = useRef(null);

  const isSubscribed = useMemo(
    () => subscriptionStatus === "standard" || subscriptionStatus === "premium",
    [subscriptionStatus]
  );

  // Load subscription
  useEffect(() => {
    const load = async () => {
      try {
        const cache = localStorage.getItem("subscription_cache");
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
        }
      } catch (err) {
        console.error("Failed to read subscription cache", err);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!subscriptionLoading && !isSubscribed && items.length > 0) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [subscriptionLoading, isSubscribed, items.length]);

  // Fetch products
  useEffect(() => {
    if (!shopId) return;
    const fetch = async () => {
      try {
        const res = await axios.get(
          `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shop/${shopId}/products/`
        );
        setShopProducts(res.data.shop_products || []);
      } catch (err) {
        console.error("Failed to load products", err);
      }
    };
    fetch();
  }, [shopId]);

  // Customer name lookup
  useEffect(() => {
    if (customerId.length !== 8) {
      setCustomerName("");
      return;
    }

    const fetch = async () => {
      setNameLoading(true);
      try {
        const res = await axios.get(
          "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/customer-fullname/",
          { params: { customer_id: customerId } }
        );
        setCustomerName(res.data.full_name || "");
      } catch {
        setCustomerName("");
      } finally {
        setNameLoading(false);
      }
    };
    fetch();
  }, [customerId]);

  const calculateTotal = useCallback((list) => {
    const sum = list.reduce((acc, item) => acc + Number(item.total || 0), 0);
    setTotalAmount(sum);
  }, []);

  const removeItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    calculateTotal(updated);
  };

  const editItem = useCallback((index) => {
    const item = items[index];
    setNewItem({
      name: item.name || "",
      qty: String(item.qty || ""),
      price: String(item.price || ""),
    });
    setEditIndex(index);
    setShowSuggestions(false);
    setTimeout(() => itemNameRef.current?.focus(), 80);
  }, [items]);

  const addItem = useCallback(() => {
    const trimmed = newItem.name.trim();
    if (!trimmed || !newItem.qty || !newItem.price) return;

    const qty = Number(newItem.qty);
    const price = Number(newItem.price);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) return;

    const total = (qty * price).toFixed(2);
    const updated = [...items];

    if (editIndex !== null) {
      updated[editIndex] = { ...newItem, name: trimmed, qty, price, total };
      setEditIndex(null);
    } else {
      updated.push({ ...newItem, name: trimmed, qty, price, total });
    }

    setItems(updated);
    calculateTotal(updated);
    setNewItem({ name: "", qty: "", price: "" });
    setShowSuggestions(false);

    setTimeout(() => itemNameRef.current?.focus(), 80);
  }, [newItem, items, editIndex, calculateTotal]);

  const selectProduct = useCallback((product) => {
    // Clear suggestions FIRST
    setShowSuggestions(false);
    setNewItem((prev) => ({ ...prev, name: product }));

    // Focus quantity field after a tiny delay (UI update)
    setTimeout(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select?.();
    }, 10);
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionContainerRef.current &&
        !suggestionContainerRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Compute filtered products
  const filteredProductsMemo = useMemo(() => {
    const term = newItem.name.trim().toLowerCase();
    if (term.length === 0 || !showSuggestions) return [];

    return shopProducts.filter((p) =>
      p.toLowerCase().startsWith(term)
    );
  }, [newItem.name, shopProducts, showSuggestions]);

  const generateReceipt = useCallback(async () => {
    if (!customerName.trim() || items.length === 0 || totalAmount <= 0) {
      alert("Please fill customer name and add at least one item.");
      return;
    }

    if (isGenerating || subscriptionLoading || !isSubscribed) return;

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("shop_id", shopId);
      formData.append("customer_name", customerName.trim());
      formData.append("items", JSON.stringify({ items }));
      formData.append("total_amount", totalAmount.toString());
      formData.append("customer_id", customerId);

      const res = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/generate-receipt/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const { pdf_url, image_urls, receipt_id } = res.data;
      setReceiptData({
        pdfUrl: pdf_url ? `https://your-api-domain.com${pdf_url}` : null,
        imageUrls: image_urls?.map((u) => `https://your-api-domain.com${u}`) || [],
        receipt_id,
      });
      alert(`Receipt ${receipt_id} generated successfully!`);
    } catch (err) {
      console.error("Generate receipt failed", err);
      alert("Failed to generate receipt");
    } finally {
      setIsGenerating(false);
    }
  }, [customerName, items, totalAmount, shopId, customerId, isGenerating, subscriptionLoading, isSubscribed]);

  const openReceipt = () => {
    if (receiptData.pdfUrl) window.open(receiptData.pdfUrl, "_blank");
  };

  return (
    <PageShell title="Generate Receipt" showBackButton={true} onBack={() => navigate(-1)}>
      <div className="generate-receipt">
        <div className="input-card">
          <div className="input-section">
            <div className="input-field">
              <input
                ref={customerIdRef}
                className="input customer-id-input"
                placeholder="Customer ID"
                value={customerId}
                type="number"
                maxLength={8}
                onChange={(e) => setCustomerId(e.target.value.slice(0, 8))}
              />
              {nameLoading && <div className="spinner small" />}
            </div>

            <input
              className="input disabled-input"
              placeholder="Customer Name"
              value={customerName}
              readOnly
            />

            <div className="item-input-row">
              <div className="name-suggestion-wrapper" ref={suggestionContainerRef}>
                <input
                  ref={itemNameRef}
                  className="input item-name-input"
                  placeholder="Item Name"
                  value={newItem.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewItem((prev) => ({ ...prev, name: value }));
                    // Show suggestions only when user is typing
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                />

                {filteredProductsMemo.length > 0 && (
                  <div className="suggestion-container">
                    <div className="suggestions-list">
                      {filteredProductsMemo.map((product, i) => (
                        <button
                          key={i}
                          className="suggestion"
                          onClick={() => selectProduct(product)}
                          type="button"
                        >
                          {product}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={qtyRef}
                className="input qty-input"
                placeholder="Qty"
                type="number"
                min="1"
                value={newItem.qty}
                onChange={(e) => setNewItem((prev) => ({ ...prev, qty: e.target.value }))}
              />

              <input
                ref={priceRef}
                className="input price-input"
                placeholder="Price"
                type="number"
                min="0.01"
                step="0.01"
                value={newItem.price}
                onChange={(e) => setNewItem((prev) => ({ ...prev, price: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
            </div>

            <button
              className="add-button"
              onClick={addItem}
              disabled={!newItem.name.trim() || !newItem.qty || !newItem.price}
            >
              {editIndex !== null ? "Update Item" : "Add Item"}
            </button>
          </div>
        </div>

        <div className="content-card">
          <div className="table-container">
            <div className="table-header">
              <span className="table-header-text item">Item</span>
              <span className="table-header-text qty">Qty</span>
              <span className="table-header-text price">Price</span>
              <span className="table-header-text total">Total</span>
              <span className="table-header-text actions">Actions</span>
            </div>

            <div className="table-body">
              {items.map((item, index) => (
                <div key={index} className="table-row">
                  <span className="table-cell item">{item.name}</span>
                  <span className="table-cell qty">{item.qty}</span>
                  <span className="table-cell price">₦{item.price}</span>
                  <span className="table-cell total">₦{Number(item.total).toLocaleString()}</span>
                  <button className="action-button edit" onClick={() => editItem(index)} title="Edit">
                    ✏️
                  </button>
                  <button className="action-button delete" onClick={() => removeItem(index)} title="Delete">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="total-container">
            <span className="total-text">
              Total: ₦{Number(totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            className={`generate-button ${!isSubscribed || subscriptionLoading || isGenerating ? "disabled" : ""}`}
            onClick={generateReceipt}
            disabled={isGenerating || subscriptionLoading || !isSubscribed}
          >
            {isGenerating ? (
              <>
                <div className="spinner small" />
                <span>Generating...</span>
              </>
            ) : subscriptionLoading ? (
              "Checking Plan..."
            ) : (
              "Generate Receipt"
            )}
          </button>

          {receiptData.pdfUrl && (
            <button className="secondary-button" onClick={openReceipt}>
              View Receipt PDF
            </button>
          )}

          {receiptData.imageUrls?.length > 0 && (
            <div className="image-container">
              <h4 className="image-label">Receipt Images</h4>
              <div className="images-preview">
                {receiptData.imageUrls.map((url, i) => (
                  <button key={i} className="image-preview" onClick={() => setSelectedImage(url)}>
                    <img src={url} alt={`Receipt ${i + 1}`} className="receipt-image" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {showModal && <SubscriptionRequiredModal visible={showModal} onClose={() => setShowModal(false)} />}

        {selectedImage && (
          <div className="full-screen-modal" onClick={() => setSelectedImage(null)}>
            <button className="close-fullscreen" onClick={() => setSelectedImage(null)}>
              ✕
            </button>
            <img src={selectedImage} alt="Full screen receipt" className="full-screen-image" />
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default GenerateReceipt;