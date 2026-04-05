// DeleteAccount.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import "../css/DeleteAccount.css";
import axios from "axios";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    // TODO: Replace with your actual API logic (same as React Native)
    // Example:
    const email = localStorage.getItem('email'); // or however you store email
    if (!password) {
      alert("Password is required.");
      return;
    }

    setLoading(true);
    try {
       await axios.post('https://retail-alvinia-goza-f6a0e4f7.koyeb.app/delete-user/', { email, password });
      
      // On success:
      localStorage.clear(); // or your storage method
      alert("Account deactivation requested. It will be permanently deleted in 7 days.");
      navigate("/login");
    } catch (error) {
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell 
      title="Delete Account" 
      showBackButton={true}
      onBack={() => navigate("/profile")}   // Adjust path if needed
    >
      <div className="delete-account-container">
        <div className="warning-card">
          <div className="warning-icon">⚠️</div>
          <h2 className="warning-title">This action is irreversible</h2>
          <p className="warning-text">
            This will deactivate your account immediately and permanently delete it after 7 days. 
            You will not be able to recover your data once deleted.
          </p>
        </div>

        <div className="form-container">
          <div className="input-group">
                      {/*<label className="input-label">Confirm Password</label> */}
            <input
              type="password"
              className="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
            />
          </div>

          <button
            className="delete-button"
            onClick={handleDelete}
            disabled={loading || !password}
          >
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              "Permanently Delete Account"
            )}
          </button>

          <p className="safety-note">
            We take your privacy seriously. This process cannot be undone.
          </p>
        </div>
      </div>
    </PageShell>
  );
};

export default DeleteAccount;