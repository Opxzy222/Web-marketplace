import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaSpinner, FaCheck, FaLock, FaCamera } from "react-icons/fa6";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/IDVerification.css";

const API_BASE_URL = "https://retail-alvinia-goza-f6a0e4f7.koyeb.app";

interface StartWidgetResponse {
  success: boolean;
  url: string;
  reference: string;
}

const IDVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const webViewRef = useRef<HTMLIFrameElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [webViewUrl, setWebViewUrl] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"success" | "failure" | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Pulse animation
  const pulse = React.useRef(1);
  const pulseAnimation = React.useCallback(() => {
    if (webViewLoading || isPending) {
      pulse.current = 1.15;
      setTimeout(() => {
        pulse.current = 1;
        requestAnimationFrame(pulseAnimation);
      }, 1200);
    }
  }, [webViewLoading, isPending]);

  useEffect(() => {
    // Get session token from localStorage
    const token = localStorage.getItem("sessionToken");
    setSessionToken(token);

    // Check pending verification
    const pending = localStorage.getItem("pending_qoreid_verification");
    if (pending === "true") {
      localStorage.removeItem("pending_qoreid_verification");
    }
  }, []);

  const startVerification = useCallback(async () => {
    if (!sessionToken) {
      alert("Session expired. Please login again.");
      navigate("/login");
      return;
    }

    try {
      // Show loading toast
      const toast = document.getElementById("verification-toast");
      if (toast) {
        (toast as HTMLElement).innerHTML = "Starting verification...";
        toast.classList.add("show");
      }

      const response = await axios.post<StartWidgetResponse>(
        `${API_BASE_URL}/api/qoreid/start-widget/`,
        {},
        {
          headers: { Authorization: sessionToken },
        }
      );

      if (!response.data.success || !response.data.url || !response.data.reference) {
        throw new Error("Invalid response from server");
      }

      const secureUrl = response.data.url.replace("http://", "https://");
      setWebViewUrl(secureUrl);
      setReference(response.data.reference);
      setWebViewVisible(true);
      setWebViewLoading(true);
      setIsPending(false);
      setVerificationStatus(null);

      // Hide toast
      setTimeout(() => {
        const toast = document.getElementById("verification-toast");
        if (toast) toast.classList.remove("show");
      }, 2000);
    } catch (error) {
      console.error("Verification start error:", error);
      const toast = document.getElementById("verification-toast");
      if (toast) {
        (toast as HTMLElement).innerHTML = "Connection error. Check internet.";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
      }
    }
  }, [sessionToken, navigate]);

  const setPendingImmediately = async () => {
    setIsPending(true);
    localStorage.setItem("pending_qoreid_verification", "true");
    
    const toast = document.getElementById("verification-toast");
    if (toast) {
      (toast as HTMLElement).innerHTML = "Verification submitted! Processing...";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 4000);
    }
    
    setWebViewVisible(false);
    setWebViewLoading(false);
  };

  const notifyBackendStatus = async (status: "pending" | "verified" | "failed") => {
    try {
      if (!sessionToken) return;
      await axios.post(
        `${API_BASE_URL}/api/qoreid/update-status/`,
        { verification_status: status },
        { headers: { Authorization: sessionToken } }
      );
    } catch (err) {
      console.error("Failed to notify backend:", err);
    }
  };

  // WebView message handler (postMessage simulation)
  const handleIframeMessage = useCallback((event: MessageEvent) => {
    const raw = event.data;
    console.log("QoreID Raw Message:", raw);

    let data;
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return;
    }

    if (!data.event) return;

    switch (data.event) {
      case "qoreid:verificationSubmitted":
        const payload = data.detail || {};
        const statusState = (payload.status?.state || "").toLowerCase();
        const statusStatus = (payload.status?.status || "").toLowerCase();

        const isInstantSuccess = 
          statusState === "complete" || 
          statusStatus === "verified" || 
          statusStatus === "successful";

        if (isInstantSuccess) {
          const toast = document.getElementById("verification-toast");
          if (toast) {
            (toast as HTMLElement).innerHTML = "Verified instantly!";
            toast.classList.add("show");
            setTimeout(() => toast.classList.remove("show"), 2000);
          }
          setVerificationStatus("success");
          notifyBackendStatus("verified");
        } else {
          setPendingImmediately();
          notifyBackendStatus("pending");
        }
        break;

      case "qoreid:verificationError":
        const errMsg = data.detail?.data?.message || data.detail?.message || "Verification failed.";
        const toast = document.getElementById("verification-toast");
        if (toast) {
          (toast as HTMLElement).innerHTML = errMsg;
          toast.classList.add("show");
          setTimeout(() => toast.classList.remove("show"), 4000);
        }
        setWebViewVisible(false);
        setWebViewLoading(false);
        break;

      case "qoreid:verificationClosed":
        const toastClose = document.getElementById("verification-toast");
        if (toastClose) {
          (toastClose as HTMLElement).innerHTML = isPending 
            ? "Still processing your verification" 
            : "You can try again";
          toastClose.classList.add("show");
          setTimeout(() => toastClose.classList.remove("show"), 3000);
        }
        setWebViewVisible(false);
        break;
    }
  }, [isPending, sessionToken, notifyBackendStatus, setPendingImmediately]);

  useEffect(() => {
    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, [handleIframeMessage]);

  const onIframeLoad = () => {
    setWebViewLoading(false);
  };

  const onIframeError = () => {
    const toast = document.getElementById("verification-toast");
    if (toast) {
      (toast as HTMLElement).innerHTML = "Failed to load. Check connection.";
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3000);
    }
    setWebViewVisible(false);
  };

  // PENDING SCREEN
  if (isPending) {
    return (
      <motion.div className="verification-container pending">
        <div className="header-pending">
          <motion.button 
            className="back-btn-pending"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowLeft />
          </motion.button>
          <h1 className="header-title-pending">Verification Pending</h1>
          <div className="header-spacer" />
        </div>

        <div className="card-pending">
          <motion.div 
            className="pulse-ring-pending"
            animate={{ 
              scale: [1, 1.15, 1],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ 
              duration: 1.2, 
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          <FaSpinner className="spinner-pending" />
          <h2 className="title-pending">We're Verifying Your Identity</h2>
          <p className="subtitle-pending">
            Matching your details with official records. This usually takes a few minutes.
          </p>
          <p className="info-pending">
            You'll receive a notification once complete.<br />
            No need to keep the app open.
          </p>
          <motion.button
            className="action-button-pending"
            onClick={() => navigate("/home")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="gradient-button-pending">
              Back to Home
            </div>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // SUCCESS SCREEN
  if (verificationStatus === "success") {
    return (
      <motion.div className="verification-container success">
        <div className="header-success">
          <div className="header-spacer" />
          <h1 className="header-title-success">Verification Successful</h1>
          <div className="header-spacer" />
        </div>

        <div className="card-success">
          <motion.div 
            className="checkmark-circle"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <FaCheck />
          </motion.div>

          <motion.h2 
            className="success-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Identity Verified!
          </motion.h2>
          
          <motion.p 
            className="success-msg"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            We're securely matching your details with official records.
            <br /><br />
            This usually takes a few minutes.
          </motion.p>

          <motion.button
            className="action-button-success"
            onClick={() => navigate("/VerificationStatus")}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="gradient-button-success">
              <span>Continue to App</span>
              <FaArrowRight />
            </div>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // MAIN SCREEN
  return (
    <motion.div className="verification-container main">
      <div className="header-main">
        <motion.button 
          className="back-btn-main"
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaArrowLeft />
        </motion.button>
        <h1 className="header-title-main">Identity Verification</h1>
        <div className="header-spacer" />
      </div>

      {!webViewVisible ? (
        <div className="main-card">
          <motion.div 
            className="security-icon"
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <FaLock />
          </motion.div>
          
          <motion.h2 
            className="main-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Secure Identity Verification
          </motion.h2>
          
          <motion.p 
            className="main-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Verify your identity using QoreID
          </motion.p>

          <motion.button
            className="start-button"
            onClick={startVerification}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="gradient-button-main">
              <span>Start Verification</span>
              <FaArrowRight />
            </div>
          </motion.button>

          <motion.p 
            className="main-info"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            Takes few minutes • Uses front camera • Good lighting required
          </motion.p>
        </div>
      ) : (
        <div className="webview-container">
          {webViewLoading && (
            <motion.div 
              className="advanced-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="overlay-card">
                <motion.div 
                  className="pulse-ring-overlay"
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{ 
                    duration: 1.2, 
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
                <FaSpinner className="overlay-spinner" />
                <h3 className="overlay-title">Launching Secure Camera</h3>
                <p className="overlay-subtitle">
                  Please hold your phone in portrait mode<br />
                  and allow camera access when prompted
                </p>
              </div>
            </motion.div>
          )}
          
          <iframe
            ref={webViewRef}
            src={webViewUrl}
            className="secure-iframe"
            onLoad={onIframeLoad}
            onError={onIframeError}
            allow="camera; microphone; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            title="QoreID Verification"
          />
        </div>
      )}

      {/* Toast Notification */}
      <div id="verification-toast" className="verification-toast" />
    </motion.div>
  );
};

export default IDVerification;
