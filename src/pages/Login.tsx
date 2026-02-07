import React, { useState, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaEye, FaEyeSlash, FaExclamationTriangle, FaArrowRight } from "react-icons/fa";
import axios from "axios";
import '../css/Login.css';

// Replace with your actual backend login endpoint
const API_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app/login/"; // ← CHANGE THIS

// Define expected response shape from your backend
interface LoginResponse {
  message: string;
  user_id?: number;
  session_id?: string;
  user_name?: string;
  userId?: string;
  userVerified?: boolean;
  phoneVerified?: boolean;
  plan?: string;
  is_active?: boolean;
  start_date?: string;
  end_date?: string;
  error?: string;
}

const AppResetContext = React.createContext<{ resetAppState: () => void } | null>(null);

async function login(email: string, password: string): Promise<{ id: number; name: string }> {
  const formData = new URLSearchParams();
  formData.append("email", email);
  formData.append("password", password);

  const response = await axios.post(API_URL, formData.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  });

  const data = response.data as LoginResponse;

  if (data.message === "login successful") {
    const {
      user_id,
      session_id,
      user_name,
      userId,
      userVerified,
      phoneVerified,
      plan,
      is_active,
      start_date,
      end_date,
    } = data;

    // Save all important session/user data to localStorage
    localStorage.setItem("sessionToken", session_id || "");
    localStorage.setItem("user_id", user_id?.toString() || "");
    localStorage.setItem("userId", userId || "");
    localStorage.setItem("user_name", user_name || "");
    localStorage.setItem("email", email);
    localStorage.setItem("user_verified", JSON.stringify(userVerified ?? false));
    localStorage.setItem("phone_verified", JSON.stringify(phoneVerified ?? false));

    // Store subscription info if available
    if (plan) {
      localStorage.setItem("subscription_cache", JSON.stringify({
        plan,
        is_active: is_active ?? false,
        start_date: start_date || "",
        end_date: end_date || "",
      }));
    }

    // Basic user session object
    const userSession = { id: user_id || 0, name: user_name || "" };
    localStorage.setItem("userSession", JSON.stringify(userSession));

    return userSession;
  }

  throw new Error(data.error || "Login failed");
}

const SignIn: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const navigate = useNavigate();
  const appReset = useContext(AppResetContext);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = await login(email, password);

      // Optional: reset any global app state if needed
      appReset?.resetAppState?.();

      // Navigate to home or dashboard after successful login
      navigate("/");

    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.error ||
        err.message ||
        "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [email, password, navigate, appReset]);

  return (
    <div className="login-screen">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header / Branding */}
        <div className="login__header">
          <img
            src="/assets/images/icon1.png"
            alt="App Logo"
            className="login__logo"
            loading="lazy"
          />
          <h1 className="login__title">Welcome Back</h1>
          <p className="login__subtitle">
            Sign in to explore and support local businesses near you
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="login__error"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <FaExclamationTriangle size={18} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Field */}
        <div
          className={`login__input-group ${focused === 'email' ? 'focused' : ''} ${email ? 'filled' : ''}`}
        >
          <input
            type="email"
            id="login-email"
            placeholder=" "
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setError("");
            }}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            className="login__input"
            autoComplete="email"
            autoFocus
            required
          />
          <label htmlFor="login-email" className="login__label">
            Email address
          </label>
        </div>

        {/* Password Field */}
        <div
          className={`login__input-group ${focused === 'password' ? 'focused' : ''} ${password ? 'filled' : ''}`}
        >
          <input
            type={showPassword ? "text" : "password"}
            id="login-password"
            placeholder=" "
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setError("");
            }}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            className="login__input"
            autoComplete="current-password"
            required
          />
          <label htmlFor="login-password" className="login__label">
            Password
          </label>

          <button
            type="button"
            className="login__visibility-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
          </button>
        </div>

        {/* Submit Button */}
        <motion.button
          className={`login__submit ${loading ? 'loading' : ''}`}
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.03, boxShadow: "0 16px 40px var(--glow)" }}
          whileTap={loading ? {} : { scale: 0.97 }}
          onClick={handleSignIn}
        >
          {loading ? (
            <div className="login__spinner" />
          ) : (
            <>
              Sign In <FaArrowRight size={16} />
            </>
          )}
        </motion.button>

        {/* Secondary Actions */}
        <div className="login__actions">
          <button
            className="login__link login__link--register"
            onClick={() => navigate("/request-token")}
          >
            Create new account
          </button>
          <button
            className="login__link login__link--forgot"
            onClick={() => navigate("/ForgotPassword")}
          >
            Forgot password?
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default SignIn;
export { AppResetContext };