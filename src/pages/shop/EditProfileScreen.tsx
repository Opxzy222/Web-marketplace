// components/EditProfileScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  CheckCircle2, 
  Copy, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone 
} from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import PageShell from "../../components/PageShell";
import '../../css/shop/EditProfileScreen.css';

const CACHE_KEY = "EditProfile_Cache";

interface UserProfile {
  user_id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone_no?: string;
  image?: string;
}

const EditProfileScreen: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [phoneNo, setPhoneNo] = useState("");
  const [image, setImage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cached data and session token
  const loadCachedData = useCallback(async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: UserProfile = JSON.parse(cached);
        setUser(data);
        setPhoneNo(data.phone_no || "");
        setImage(data.image || "");
      }
    } catch (err) {
      console.error("Cache load error:", err);
    }

    const token = localStorage.getItem("sessionToken");
    setSessionId(token || null);
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  // Save to cache
  const saveToCache = useCallback((data: UserProfile) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Cache save error:", err);
    }
  }, []);

  // Fetch fresh profile
  const fetchProfile = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError("");

    try {
      const res = await axios.get(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/user/profile/`, {
        headers: { Authorization: sessionId },
      });

      const data = res.data;
      setUser(data);
      setPhoneNo(data.phone_no || "");
      setImage(data.image || "");
      saveToCache(data);
    } catch (err) {
      console.error("Profile fetch failed:", err);
      setError("Failed to load profile. Using cached data if available.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, saveToCache]);

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  useEffect(() => {
    if (sessionId) {
      fetchProfile();
    }
  }, [sessionId, fetchProfile]);

  const pickImage = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const copyToClipboard = () => {
    if (user?.user_id) {
      navigator.clipboard.writeText(user.user_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUpdate = async () => {
    if (!sessionId) {
      alert("Please log in to update your profile.");
      return;
    }

    const formData = new FormData();
    let hasChanges = false;

    if (phoneNo !== user?.phone_no) {
      formData.append("phone_no", phoneNo);
      hasChanges = true;
    }

    if (image && image !== user?.image) {
      const blob = await fetch(image).then(r => r.blob());
      formData.append("image", blob, "profile.jpg");
      hasChanges = true;
    }

    if (!hasChanges) {
      alert("No changes to save.");
      return;
    }

    try {
      const res = await axios.post(
        `https://retail-alvinia-goza-f6a0e4f7.koyeb.app/user/profile/`,
        formData,
        {
          headers: {
            Authorization: sessionId,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.status === 200) {
        const updated = { ...user, phone_no: phoneNo, image: res.data.image } as UserProfile;
        setUser(updated);
        saveToCache(updated);
        alert("Profile updated successfully!");
      }
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update profile.");
    }
  };

  return (
    <PageShell
      title="Edit Profile"
      isLoading={loading}
      error={error}
      onRetry={fetchProfile}
      backPath={-1}
    >
      <div className="edp-profile-page">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <main className="edp-profile-content">
          {user && (
            <motion.div 
              className="edp-profile-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Profile Picture */}
              <div className="edp-image-section">
                <h2 className="edp-section-title">Profile Picture</h2>
                <div className="edp-image-container">
                  <img
                    src={image || user.image || "https://via.placeholder.com/150"}
                    alt="Profile"
                    className="edp-profile-image"
                  />
                  <motion.button
                    className="edp-upload-button"
                    onClick={pickImage}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Camera size={24} />
                  </motion.button>
                </div>
                <p className="edp-upload-hint">Tap to change photo</p>
              </div>

              {/* Customer ID */}
              <div className="edp-profile-id-section">
                <p className="edp-profile-id">
                  Customer ID: <strong>{user.user_id}</strong>
                </p>
                <motion.button
                  className="edp-copy-button"
                  onClick={copyToClipboard}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {copied ? <CheckCircle2 size={24} color="#10b981" /> : <Copy size={24} />}
                </motion.button>
              </div>

              {/* Info Grid */}
              <div className="edp-info-grid">
                <div className="edp-info-item">
                  <User size={20} />
                  <div>
                    <label>First Name</label>
                    <p>{user.firstname}</p>
                  </div>
                </div>

                <div className="edp-info-item">
                  <User size={20} />
                  <div>
                    <label>Last Name</label>
                    <p>{user.lastname}</p>
                  </div>
                </div>

                <div className="edp-info-item">
                  <Mail size={20} />
                  <div>
                    <label>Email</label>
                    <p>{user.email}</p>
                  </div>
                </div>

                <div className="edp-info-item">
                  <Phone size={20} />
                  <div>
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={phoneNo}
                      onChange={(e) => setPhoneNo(e.target.value)}
                      placeholder="Enter phone number"
                      className="edp-phone-input"
                    />
                  </div>
                </div>
              </div>

              {/* Update Button */}
              <motion.button
                className="edp-update-button"
                onClick={handleUpdate}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                disabled={loading}
              >
                Update Profile
              </motion.button>
            </motion.div>
          )}
        </main>
      </div>
    </PageShell>
  );
};

export default EditProfileScreen;