// GenerateReceipt.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import PageShell from "../../components/PageShell";
import SubscriptionRequiredModal from "../../components/RequiredSubscription";
import "./GenerateReceipt.css";

const GenerateReceipt = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const shopId = searchParams.get('shopId');
  const senderId = searchParams.get('senderId');
  
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", qty: "", price: "" });
  const [receipt, setReceipt] = useState({ pdfUrl: null, imageUrls: [], receipt_id: null });
  const [totalAmount, setTotalAmount] = useState(0);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [shopProducts, setShopProducts] = useState([]);
  const [nameLoading, setNameLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [receiptData, setReceiptData] = useState({ pdfUrl: null, imageUrls: [], receipt_id: null });
  const [editIndex, setEditIndex] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [customerId, setCustomerId] = useState(senderId || "");

  // Refs for focusing inputs
  const customerIdRef = useRef(null);
  const itemNameRef = useRef(null);
  const qtyRef = useRef(null);
  const priceRef = useRef(null);

  const isSubscribed = useMemo(() => {
    return subscriptionStatus === "standard" || subscriptionStatus === "premium";
  }, [subscriptionStatus]);

  // Load subscription from localStorage
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const cache = localStorage.getItem("subscription_cache");
        if (cache) {
          const parsed = JSON.parse(cache);
          setSubscriptionStatus(parsed.plan?.toLowerCase() || null);
        } else {
          setSubscriptionStatus(null);
        }
      } catch (error) {
        console.error("Failed to load subscription_cache:", error);
        setSubscriptionStatus(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    loadSubscription();
  }, []);

  // Control Modal Visibility
  useEffect(() => {
    if (!subscriptionLoading && !isSubscribed && items.length > 0) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [subscriptionLoading, isSubscribed, items.length]);

  // Fetch Shop Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`/shop/${shopId}/products/`);
        setShopProducts(response.data.shop_products || []);
      } catch (error) {
        console.error("Error fetching shop products:", error);
        alert("Failed to fetch shop products.");
      }
    };
    if (shopId) fetchProducts();
  }, [shopId]);

  // Fetch Customer Name on ID Change
  useEffect(() => {
    if (customerId.length === 8) {
      fetchCustomerName(customerId);
    } else if (customerId.length < 8) {
      setCustomerName("");
    }
  }, [customerId]);

  const fetchCustomerName = useCallback(async (id) => {
    setNameLoading(true);
    try {
      const response = await axios.get("/customer-fullname/", {
        params: { customer_id: id },
      });
      setCustomerName(response.data.full_name || "");
    } catch (error) {
      console.error("Error fetching customer name:", error);
      alert("Customer not found.");
      setCustomerName("");
    } finally {
      setNameLoading(false);
    }
  }, []);

  const calculateTotal = useCallback((itemsList) => {
    const total = itemsList.reduce((sum, item) => sum + Number(item.total || 0), 0);
    setTotalAmount(total);
  }, []);

  const removeItem = useCallback((index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    calculateTotal(updatedItems);
  }, [items, calculateTotal]);

  const editItem = useCallback((index) => {
    const itemToEdit = items[index];
    setNewItem({
      name: itemToEdit.name || "",
      qty: itemToEdit.qty.toString() || "",
      price: itemToEdit.price.toString() || "",
    });
    setEditIndex(index);
    setTimeout(() => itemNameRef.current?.focus(), 100);
  }, [items]);

  const addItem = useCallback(() => {
    if (!newItem.name || !newItem.qty || !newItem.price) {
      alert("Please fill all item fields.");
      return;
    }

    const qty = Number(newItem.qty);
    const price = Number(newItem.price);
    if (isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
      alert("Please enter valid positive quantity and price.");
      return;
    }

    const total = (qty * price).toFixed(2);
    const updatedItems = [...items];

    if (editIndex !== null) {
      updatedItems[editIndex] = { ...newItem, qty, price, total };
      setEditIndex(null);
    } else {
      updatedItems.push({ ...newItem, qty, price, total });
    }

    setItems(updatedItems);
    calculateTotal(updatedItems);
    setNewItem({ name: "", qty: "", price: "" });
  }, [newItem, items, editIndex, calculateTotal]);

  const handleSearch = useCallback((text) => {
    if (text.length > 0) {
      const filtered = shopProducts.filter((product) =>
        product.toLowerCase().startsWith(text.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [shopProducts]);

  const selectProduct = useCallback((product) => {
    setNewItem({ ...newItem, name: product });
    setFilteredProducts([]);
    setTimeout(() => qtyRef.current?.focus(), 100);
  }, [newItem]);

  const generateReceipt = useCallback(async () => {
    if (!customerName || items.length === 0 || !totalAmount) {
      alert("All fields are required!");
      return;
    }

    if (isGenerating || subscriptionLoading) return;

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("shop_id", shopId);
      formData.append("customer_name", customerName);
      formData.append("items", JSON.stringify({ items }));
      formData.append("total_amount", totalAmount.toString());
      formData.append("customer_id", customerId);

      const response = await axios.post("/generate-receipt/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { pdf_url, image_urls, receipt_id } = response.data;
      setReceiptData({
        pdfUrl: pdf_url ? `https://your-api-domain.com${pdf_url}` : null, // Replace getFullUrl
        imageUrls: image_urls?.map(url => `https://your-api-domain.com${url}`) || [],
        receipt_id,
      });
      alert(`Receipt ${receipt_id} generated successfully!`);
    } catch (error) {
      console.error("Error generating receipt:", error);
      alert("Could not generate receipt");
    } finally {
      setIsGenerating(false);
    }
  }, [customerName, items, totalAmount, shopId, customerId, isGenerating, subscriptionLoading]);

  const openReceipt = useCallback(async () => {
    if (receiptData.pdfUrl) {
      window.open(receiptData.pdfUrl, '_blank');
    }
  }, [receiptData.pdfUrl]);

  const filteredProductsMemo = useMemo(() => {
    if (newItem.name.length > 0) {
      return shopProducts.filter((product) =>
        product.toLowerCase().startsWith(newItem.name.toLowerCase())
      );
    }
    return [];
  }, [newItem.name, shopProducts]);

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const closeFullScreenImage = () => {
    setSelectedImage(null);
  };

  return (
    <PageShell title="Generate Receipt" showBackButton={true} onBack={() => navigate(-1)}>
      <div className="generate-receipt">
        {/* Input Form */}
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
              <input
                ref={itemNameRef}
                className="input item-name-input"
                placeholder="Item Name"
                value={newItem.name}
                onChange={(e) => {
                  setNewItem({ ...newItem, name: e.target.value });
                  handleSearch(e.target.value);
                }}
              />
              <input
                ref={qtyRef}
                className="input qty-input"
                placeholder="Qty"
                type="number"
                value={newItem.qty}
                onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
              />
              <input
                ref={priceRef}
                className="input price-input"
                placeholder="Price"
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
              />
            </div>

            {filteredProductsMemo.length > 0 && (
              <div className="suggestion-container">
                <div className="suggestions-list">
                  {filteredProductsMemo.map((product, index) => (
                    <button
                      key={index}
                      className="suggestion"
                      onClick={() => selectProduct(product)}
                    >
                      {product}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="add-button" onClick={addItem} disabled={!newItem.name || !newItem.qty || !newItem.price}>
              {editIndex !== null ? "Update Item" : "Add Item"}
            </button>
          </div>
        </div>

        {/* Items Table & Actions */}
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
                  <button 
                    className="action-button edit" 
                    onClick={() => editItem(index)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    className="action-button delete" 
                    onClick={() => removeItem(index)}
                    title="Delete"
                  >
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
            className={`generate-button ${(!isSubscribed || subscriptionLoading || isGenerating) ? 'disabled' : ''}`}
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
                {receiptData.imageUrls.map((url, index) => (
                  <button
                    key={index}
                    className="image-preview"
                    onClick={() => handleImageClick(url)}
                  >
                    <img src={url} alt={`Receipt ${index + 1}`} className="receipt-image" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {showModal && <SubscriptionRequiredModal visible={showModal} onClose={() => setShowModal(false)} />}

        {selectedImage && (
          <div className="full-screen-modal" onClick={closeFullScreenImage}>
            <button className="close-fullscreen" onClick={closeFullScreenImage}>
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
