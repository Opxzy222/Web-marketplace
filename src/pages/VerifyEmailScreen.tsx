import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { FaArrowLeft, FaSpinner } from "react-icons/fa6";
import "../css/VerifyEmailScreen.css";

const VerifyEmailScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const email = searchParams.get("email") || "";
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown for resend
  useEffect(() => {
    if (!resendDisabled) return;
    if (timer <= 0) {
      setResendDisabled(false);
      setTimer(30);
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendDisabled, timer]);

  const handleVerify = async () => {
    setError("");

    if (!/^\d{6}$/.test(code)) {
      setError("Please enter a valid 6-digit code");
      inputRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/verify-email/",
        { token: code }
      );

      if (response.status === 200) {
        navigate(`/signup?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        "Invalid or expired code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendDisabled(true);
    setTimer(30);

    try {
      await axios.post(
        "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/request-email-verification/",
        { email }
      );
    } catch (err: any) {
      setError("Failed to resend code. Please try again later.");
      setResendDisabled(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && !resendDisabled) {
      handleVerify();
    }
  };

  return (
    <div className="verify-screen">
      <motion.div
        className="verify-card"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <header className="verify-header">
          <button
            className="verify-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>
          <h1 className="verify-header-title">Verify Email</h1>
          <div className="verify-spacer" />
        </header>

        {/* Content */}
        <div className="verify-content">
          <h2 className="verify-title">Enter Verification Code</h2>
          <p className="verify-subtitle">
            We sent a 6-digit code to{" "}
            <span className="verify-email">{email || "your email"}</span>
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                className="verify-error"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Code Input */}
          <div className={`verify-input-group ${focused ? "focused" : ""} ${code ? "filled" : ""}`}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder=" "
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              className="verify-input"
              autoFocus
            />
            <label className="verify-label">Verification code</label>
          </div>

          {/* Verify Button */}
          <motion.button
            className={`verify-submit ${loading ? "loading" : ""}`}
            disabled={loading || resendDisabled}
            whileHover={loading ? {} : { scale: 1.03, boxShadow: "0 16px 40px var(--glow)" }}
            whileTap={loading ? {} : { scale: 0.97 }}
            onClick={handleVerify}
          >
            {loading ? (
              <div className="verify-spinner" />
            ) : (
              "Verify Code"
            )}
          </motion.button>

          {/* Resend */}
          <button
            className={`verify-resend ${resendDisabled ? "disabled" : ""}`}
            onClick={handleResend}
            disabled={resendDisabled}
          >
            {resendDisabled ? `Resend in ${timer}s` : "Resend Code"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyEmailScreen;