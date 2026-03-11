import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import PageShell from "../components/PageShell";
import { FaEye, FaEyeSlash, FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaArrowRight } from "react-icons/fa";
import "../css/Signup.css";

const API_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/complete-registration/";

const SignUp: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const email = searchParams.get("email") || "";

  // Load session token
  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    setSessionId(token);
  }, []);

  // Password validation
  const validatePassword = useCallback((pwd: string) => ({
    length: pwd.length >= 8,
    capital: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
  }), []);

  const checks = validatePassword(password);

  const clearError = () => setError("");

  const handleSignUp = useCallback(async () => {
    if (loading) return;

    if (!firstName.trim() || !lastName.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!checks.length || !checks.capital || !checks.number) {
      setError("Password must meet all requirements");
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("firstname", firstName.trim());
    formData.append("lastname", lastName.trim());
    formData.append("password", password);

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(sessionId && { Authorization: sessionId }),
        },
      });

      if (response.status === 201) {
        navigate("/login");
      } else {
        setError(response.data.message || "Sign-up failed");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, firstName, lastName, password, confirmPassword, loading, navigate, sessionId, checks]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleSignUp();
    }
  };

  return (
    <PageShell 
              title="Sign in" 
              showBackButton={true}
              onBack={() => navigate('/(tabs)/myshop')}
            >
    <div className="signup-screen">
      <motion.div
        className="signup-card"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >

        <AnimatePresence>
          {error && (
            <motion.div
              className="signup__error"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <FaExclamationTriangle />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* First Name */}
        <div className={`signup__input-group ${focused === 'firstName' ? 'focused' : ''} ${firstName ? 'filled' : ''}`}>
          <input
            type="text"
            id="firstName"
            placeholder=" "
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); clearError(); }}
            onFocus={() => setFocused('firstName')}
            onBlur={() => setFocused(null)}
            className="signup__input"
            autoCapitalize="words"
          />
          <label htmlFor="firstName" className="signup__label">First name</label>
        </div>

        {/* Last Name */}
        <div className={`signup__input-group ${focused === 'lastName' ? 'focused' : ''} ${lastName ? 'filled' : ''}`}>
          <input
            type="text"
            id="lastName"
            placeholder=" "
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); clearError(); }}
            onFocus={() => setFocused('lastName')}
            onBlur={() => setFocused(null)}
            className="signup__input"
            autoCapitalize="words"
          />
          <label htmlFor="lastName" className="signup__label">Last name</label>
        </div>

        {/* Password */}
        <div className={`signup__input-group ${focused === 'password' ? 'focused' : ''} ${password ? 'filled' : ''}`}>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            placeholder=" "
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            onKeyDown={handleKeyDown}
            className="signup__input"
          />
          <label htmlFor="password" className="signup__label">Password</label>
          <button
            type="button"
            className="signup__visibility-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className={`signup__input-group ${focused === 'confirm' ? 'focused' : ''} ${confirmPassword ? 'filled' : ''}`}>
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            placeholder=" "
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
            onFocus={() => setFocused('confirm')}
            onBlur={() => setFocused(null)}
            onKeyDown={handleKeyDown}
            className="signup__input"
          />
          <label htmlFor="confirmPassword" className="signup__label">Confirm password</label>
          <button
            type="button"
            className="signup__visibility-toggle"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Password Strength */}
        <div className="signup__checks">
          {[
            { label: "At least 8 characters", valid: checks.length },
            { label: "One capital letter", valid: checks.capital },
            { label: "One number", valid: checks.number },
          ].map((item, i) => (
            <div key={i} className="signup__check-item">
              {item.valid ? <FaCheckCircle className="valid" /> : <FaTimesCircle className="invalid" />}
              <span className={item.valid ? "valid" : "invalid"}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <motion.button
          className={`signup__submit ${loading ? "loading" : ""}`}
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.03, boxShadow: "0 16px 40px var(--glow)" }}
          whileTap={loading ? {} : { scale: 0.97 }}
          onClick={handleSignUp}
        >
          {loading ? (
            <div className="signup__spinner" />
          ) : (
            <>Create Account <FaArrowRight size={16} /></>
          )}
        </motion.button>

        {/* Sign In Link */}
        <button
          className="signup__cta"
          onClick={() => navigate("/login")}
        >
          Already have an account? <span>Sign in</span>
        </button>
      </motion.div>
    </div>
    </PageShell>
  );
};

export default SignUp;