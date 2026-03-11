import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { FaArrowLeft, FaSpinner, FaEnvelope } from "react-icons/fa6";
import PageShell from "../components/PageShell";
import "../css/RequestTokenScreen.css";

export default function RequestTokenScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!resendDisabled) return;
    if (countdown <= 0) {
      setResendDisabled(false);
      setCountdown(30);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendDisabled, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/request-email-verification/",
        { email },
        { headers: { "Content-Type": "application/json" } }
      );

      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      setResendDisabled(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell 
              title="Request Token" 
              showBackButton={true}
              onBack={() => navigate('/(tabs)/myshop')}
            >
    <div className="auth-screen">
      
      <main className="auth-main">
        <motion.div
          className="auth-card"
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="card-icon-wrapper">
            <div className="card-icon">
              <FaEnvelope />
            </div>
          </div>

          <h2 className="card-title">Confirm your email</h2>
          <p className="card-subtitle">
            Enter your email to receive a secure 6-digit verification code
          </p>

          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={`input-wrapper ${focused ? "focused" : ""} ${email ? "filled" : ""}`}>
              <input
                ref={inputRef}
                type="email"
                id="email"
                placeholder=" "
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="email-input peer"
                autoComplete="email"
                autoFocus
                required
              />
              <label htmlFor="email" className="input-label">Email address</label>
              <div className="input-focus-line" />
            </div>

            <motion.button
              type="submit"
              className={`submit-button ${loading || resendDisabled ? "disabled" : ""}`}
              disabled={loading || resendDisabled}
              whileHover={{ scale: 1.03, boxShadow: "0 12px 32px var(--accent-glow)" }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? (
                <div className="loading-content">
                  <FaSpinner className="spinner" />
                  <span>Sending…</span>
                </div>
              ) : resendDisabled ? (
                <span>Resend in {countdown}s</span>
              ) : (
                <span>Send Code</span>
              )}
            </motion.button>
          </form>

          <button
            type="button"
            className="already-have-link"
            onClick={() => navigate("/verify-email")}
          >
            Already have a code? <span className="highlight">Verify now</span>
          </button>
        </motion.div>
      </main>
    </div>
    </PageShell>
  );
}