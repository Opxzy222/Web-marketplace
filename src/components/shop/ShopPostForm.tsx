// ShopPostForm.jsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Image as ImageIcon,
  Video,
  Upload,
  Loader2,
  AlertCircle,
  Lock
} from 'lucide-react';
import axios from 'axios';
import '../../css/component/shop/ShopPostForm.css';

const ShopPostForm = ({ shopId, onPostCreated }) => {
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const textInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const renderCountRef = useRef(0);
  const progressAnimRef = useRef(0);

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

  // Render debug
  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`ShopPostForm rendered (count: ${renderCountRef.current})`);
  });

  const pickMedia = useCallback(async () => {
    console.log("Picking media");
    const input = fileInputRef.current;
    if (input) {
      input.click();
    }
  }, []);

  // Handle file selection
  const handleFiles = useCallback((files) => {
    if (!files?.length) return;

    const newMediaPromises = Array.from(files).map(async (file) => {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      
      if (!isImage && !isVideo) {
        alert(`File "${file.name}" is not a valid image or video.`);
        return null;
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        alert(`File "${file.name}" is too large (max 100MB).`);
        return null;
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: `${file.name}_${Date.now()}_${Math.random()}`,
            file,
            name: file.name,
            type: isVideo ? "video" : "image",
            preview: e.target.result,
            valid: true,
          });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newMediaPromises).then((newMedia) => {
      const validMedia = newMedia.filter(Boolean);
      if (validMedia.length < files.length && files.length < 5) {
        if (confirm("Only some files were valid. Add more?")) {
          pickMedia();
        }
      }
      setMedia(prev => [...prev, ...validMedia]);
    });
  }, [pickMedia]);

  const removeMedia = useCallback((id) => {
    setMedia(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!['standard', 'premium'].includes(subscriptionStatus || '')) {
      setShowSubscriptionModal(true);
      return;
    }

    if (!description.trim()) {
      alert("Please add a description to your post.");
      textInputRef.current?.focus();
      return;
    }

    if (media.length === 0) {
      alert("Please add at least one media file.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("shop_id", shopId);
    formData.append("description", description);

    for (const item of media) {
      if (item.valid && item.file) {
        formData.append("files", item.file);
      }
    }

    try {
      const response = await axios.post(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/shops/${shopId}/posts/create/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = (progressEvent.loaded / progressEvent.total) * 100;
              setUploadProgress(Math.min(progress, 100));
              progressAnimRef.current = progress / 100;
            }
          }
        }
      );

      alert("Post created successfully!");
      onPostCreated?.(response.data);
      setDescription("");
      setMedia([]);
    } catch (error) {
      let errorMessage = "Failed to submit post.";
      if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timed out.";
      } else if (error.response) {
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  }, [description, media, shopId, subscriptionStatus, onPostCreated]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const renderMediaItem = useCallback((item) => (
    <motion.div 
      className={`media-preview-wrapper ${item.type}`}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      {item.valid ? (
        <>
          <img 
            src={item.preview} 
            alt={item.name}
            className="media-preview"
          />
          {item.type === "video" && (
            <div className="play-overlay">
              <Video size={32} />
            </div>
          )}
        </>
      ) : (
        <div className="media-placeholder">
          <ImageIcon size={40} />
          <span>No preview</span>
        </div>
      )}
      <button 
        className="remove-media-btn"
        onClick={() => removeMedia(item.id)}
        aria-label="Remove media"
      >
        <X size={24} />
      </button>
    </motion.div>
  ), [removeMedia]);

  if (subscriptionLoading) {
    return (
      <div className="loader-container">
        <Loader2 className="spinner" size={48} />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="shop-post-form">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden-file-input"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="form-scroll">
        <h1 className="form-title">Create a Post</h1>
        
        <p className="form-subtitle">Select Media (Images or Videos)</p>
        
        <motion.button
          className="option-card"
          onClick={pickMedia}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={24} />
          <span>Add Images or Videos</span>
        </motion.button>

        <div className="media-grid">
          <AnimatePresence>
            {media.map(renderMediaItem)}
          </AnimatePresence>
        </div>

        <textarea
          ref={textInputRef}
          className={`description-input ${isFocused ? 'focused' : ''}`}
          placeholder="Enter post description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {loading && (
          <div className="progress-container">
            <div className="progress-bar-bg">
              <motion.div 
                className="progress-bar"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="progress-text">{Math.round(uploadProgress)}%</span>
          </div>
        )}

        <motion.button
          className={`submit-btn ${loading ? 'disabled' : ''}`}
          onClick={handleSubmit}
          disabled={loading}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
        >
          {loading ? (
            <>
              <Loader2 className="loading-icon" size={24} />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={24} />
              <span>Post</span>
            </>
          )}
        </motion.button>
      </div>

      {showSubscriptionModal && (
        <div className="subscription-modal-overlay">
          <div className="subscription-modal">
            <button 
              className="modal-close" 
              onClick={() => setShowSubscriptionModal(false)}
            >
              <X size={32} />
            </button>
            <Lock size={64} className="modal-icon" />
            <h2>Subscription Required</h2>
            <p>Upgrade to Standard or Premium to create posts.</p>
            <button className="upgrade-btn">Upgrade Now</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPostForm;
