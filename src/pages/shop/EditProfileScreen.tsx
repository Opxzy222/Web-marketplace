// components/EditProfileScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Camera, 
  CheckCircle2, 
  Copy, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
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
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [phoneNo, setPhoneNo] = useState("");
  const [image, setImage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cached data and session ID
  const loadCachedData = useCallback(async () => {
    try {
      const cachedUser = localStorage.getItem(CACHE_KEY);
      if (cachedUser) {
        const data = JSON.parse(cachedUser);
        setUser(data);
        setPhoneNo(data.phone_no || "");
        setImage(data.image || "");
        console.log("Loaded cached profile data:", data);
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }

    try {
      const sessionIdString = localStorage.getItem("sessionToken");
      setSessionId(sessionIdString);
      console.log("Fetched session token:", sessionIdString);
      if (!sessionIdString) {
        navigate("/login");
      }
    } catch (error) {
      console.error("Error fetching session token:", error);
      setError("Failed to load session");
    }
  }, [navigate]);

  // Save to cache
  const saveToCache = useCallback(async (data: UserProfile) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      console.log("Cached profile data saved:", data);
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  }, []);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!sessionId) {
      console.log("No sessionId, skipping fetchProfile");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/user/profile/`, {
        headers: { Authorization: sessionId },
      });
      const data = response.data;
      setUser(data);
      setPhoneNo(data.phone_no || "");
      setImage(data.image || "");
      saveToCache(data);
      console.log("Fetched profile:", data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setError("Failed to fetch profile. Using cached data if available.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, saveToCache]);

  // 1. Load cache & session once
useEffect(() => {
  loadCachedData();
}, []);   // still empty – only once

// 2. Fetch fresh data when we have sessionId
useEffect(() => {
  if (sessionId) {
    fetchProfile();
  }
}, [sessionId, fetchProfile]);

  const pickImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, []);

  const copyToClipboard = useCallback(() => {
    if (user?.user_id) {
      navigator.clipboard.writeText(user.user_id);
      setCopied(true);
      
      setTimeout(() => setCopied(false), 2000);
    }
  }, [user?.user_id]);

  const handleUpdate = useCallback(async () => {
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
      alert("No changes made to update.");
      return;
    }

    try {
      const response = await axios.post(`https://retail-alvinia-goza-f6a0e4f7.koyeb.app/user/profile/`, formData, {
        headers: {
          Authorization: sessionId,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200) {
        const updatedData = { ...user, phone_no: phoneNo, image: response.data.image } as UserProfile;
        setUser(updatedData);
        saveToCache(updatedData);
        alert("Profile updated successfully!");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("An error occurred while updating the profile.");
    }
  }, [sessionId, phoneNo, image, user, saveToCache]);

  if (loading && !user) {
    return (
      <div className="loading-container">
        <div className="loader">
          <div className="spinner"></div>
        </div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="edit-profile-page">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      <header className="header">
        <motion.button
          className="back-button"
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={28} />
        </motion.button>
        <h1 className="header-title">Edit Profile</h1>
        <div className="header-spacer" />
      </header>

      <main className="profile-content">
        {error && !user && (
          <motion.div 
            className="error-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {user && (
          <motion.div 
            className="profile-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="image-section">
              <h2 className="section-title">Profile Picture</h2>
              <div className="image-container">
                <img 
                  src={image || user.image || "https://via.placeholder.com/150"} 
                  alt="Profile"
                  className="profile-image"
                />
                <motion.button
                  className="upload-button"
                  onClick={pickImage}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Camera size={24} />
                </motion.button>
              </div>
              <p className="upload-hint">Tap to upload new image</p>
            </div>

            <div className="profile-id-section">
              <p className="profile-id">
                Customer ID: <strong>{user.user_id}</strong>
              </p>
              <motion.button
                className="copy-button"
                onClick={copyToClipboard}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {copied ? <CheckCircle2 size={24} /> : <Copy size={24} />}
              </motion.button>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <User size={20} />
                <div>
                  <label>First Name</label>
                  <p>{user.firstname}</p>
                </div>
              </div>

              <div className="info-item">
                <User size={20} />
                <div>
                  <label>Last Name</label>
                  <p>{user.lastname}</p>
                </div>
              </div>

              <div className="info-item">
                <Mail size={20} />
                <div>
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
              </div>

              <div className="info-item">
                <Phone size={20} />
                <div>
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNo}
                    onChange={(e) => setPhoneNo(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>

            <motion.button
              className="update-button"
              onClick={handleUpdate}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Update Profile
            </motion.button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default EditProfileScreen;
