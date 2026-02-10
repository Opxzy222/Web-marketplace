import React, { useCallback, useEffect, useState, useRef, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import YouTube from "react-youtube";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import type { Variants } from "framer-motion";   // ← add this line
import { FaMapMarkerAlt, FaStore, FaSearch, FaShoppingBag, FaStoreAlt, FaPlayCircle, FaTimes } from "react-icons/fa";
import '../css/shop/Home.css';
import ThemeToggle from '../components/ThemeToggle';

// ────────────────────────────────────────────────
// Removed unused SPACING and COLORS
// Enhanced with better variants for animations
// Improved structure with more sub-components
// Added better responsiveness and accessibility
// Optimized state management and effects
// ────────────────────────────────────────────────

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
};

// Define animation variants for reuse
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
  hover: { scale: 1.02, boxShadow: "0 20px 40px var(--shadow-color)", transition: { duration: 0.3 } },
  tap: { scale: 0.98 },
};

const buttonVariants: Variants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.98 },
};

const FeatureCard = memo(({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => {
  return (
    <motion.div
      className="feature-card"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      whileHover="hover"
      whileTap="tap"
      viewport={{ once: true }}
      role="article"
      aria-labelledby={`${title}-title`}
    >
      <div className="feature-icon-container">
        <Icon size={28} color="var(--white)" aria-hidden="true" />
      </div>
      <h3 id={`${title}-title`}>{title}</h3>
      <p>{description}</p>
    </motion.div>
  );
});

const RoleCard = memo(
  ({
    title,
    subtitle,
    icon: Icon,
    accentColorVar,
    onPress,
  }: {
    title: string;
    subtitle: string;
    icon: any;
    accentColorVar: string;
    onPress: () => void;
  }) => {
    return (
      <motion.div
        className="role-card"
        variants={cardVariants}
        initial="hidden"
        whileInView="visible"
        whileHover="hover"
        whileTap="tap"
        viewport={{ once: true }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onPress()}
        onClick={onPress}
        aria-label={`Learn more about ${title}`}
      >
        <div className="glass-layer" />
        <div
          className="accent-bar"
          style={{
            background: `linear-gradient(90deg, var(${accentColorVar}), color-mix(in srgb, var(${accentColorVar}) 80%, transparent))`,
          }}
        />
        <div className="card-content">
          <div className="icon-container">
            <div
              className="icon-circle"
              style={{
                background: `linear-gradient(135deg, var(${accentColorVar}), color-mix(in srgb, var(${accentColorVar}) 90%, transparent))`,
              }}
            >
              <Icon size={48} color="var(--white)" aria-hidden="true" />
            </div>
          </div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
          <div className="cta-container">
            <motion.button
              className="cta-button"
              style={{
                background: `linear-gradient(135deg, var(${accentColorVar}), color-mix(in srgb, var(${accentColorVar}) 80%, transparent))`,
              }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              aria-label={`Watch tutorials for ${title}`}
            >
              <FaPlayCircle size={22} />
              <span>Watch Tutorials</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  },
);

const TutorialVideoItem = memo(({ title, videoId, onPlay }: { title: string; videoId: string; onPlay: (id: string) => void }) => (
  <motion.div
    className="tutorial-item"
    variants={cardVariants}
    whileHover="hover"
    whileTap="tap"
    onClick={() => onPlay(videoId)}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onPlay(videoId)}
    aria-label={`Play tutorial: ${title}`}
  >
    <div className="tutorial-thumb">
      <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt={title} loading="lazy" />
      <div className="tutorial-play-overlay">
        <FaPlayCircle size={48} color="var(--youtube-red)" />
      </div>
    </div>
    <h4>{title}</h4>
  </motion.div>
));

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalVideos, setModalVideos] = useState<any[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const buyerTutorials = [
    { title: "How to find sellers", videoId: "dQw4w9WgXcQ" },
    { title: "How To Engage Business Space", videoId: "dQw4w9WgXcQ" },
    { title: "Place & Track Orders", videoId: "dQw4w9WgXcQ" },
  ].filter((v) => v.videoId);

  const sellerTutorials = [
    { title: "Set Up Your Space", videoId: "Bj8cHbYaASc" },
    { title: "Manage Your Space", videoId: "Bj8cHbYaASc" },
    { title: "Manage Orders & Messages", videoId: "Bj8cHbYaASc" },
  ].filter((v) => v.videoId);

  const features = [
    { icon: FaMapMarkerAlt, title: "Nearby Businesses", description: "Discover local shops." },
    { icon: FaStore, title: "Trusted Listings", description: "Verified businesses." },
    { icon: FaSearch, title: "Easy Discovery", description: "Browse with ease." },
  ];

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    setSessionToken(token);
    setIsLoading(false);
  }, []);

  const openTutorials = useCallback((title: string, videos: any[]) => {
    setModalTitle(title);
    setModalVideos(videos);
    setModalVisible(true);
  }, []);

  const handlePlayVideo = useCallback((videoId: string) => {
    setCurrentVideoId(videoId);
    setIsVideoLoading(true);
    setVideoVisible(true);
    setModalVisible(false);
  }, []);

  const handleCloseVideo = useCallback(() => {
    setVideoVisible(false);
    setCurrentVideoId(null);
    setIsVideoLoading(false);
  }, []);

  const handleExplorePress = useCallback(() => {
    navigate(sessionToken ? "/shop" : "/login");
  }, [navigate, sessionToken]);

  const handleGetStarted = useCallback(() => {
    navigate(sessionToken ? "/shop" : "/request-token");
  }, [navigate, sessionToken]);

  const youtubeOptions = {
    width: "100%",
    height: isMobile ? "250" : "400",
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="homepage">
      <header className="header">
        <div className="header-brand">
          <img src="src//assets/images/icon1.png" alt="Gogo Logo" className="header-logo" loading="lazy" />
          <h1 className="">Gogo Digital Market</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="scroll-content">
        {/* Hero Section - Enhanced with parallax-like animation */}
        <section className="hero-section">
          <motion.div
            className="hero-image-container"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <img src="/src/assets/images/homestart.jpg" alt="Discover local businesses" className="hero-image" loading="lazy" />
            <div className="hero-gradient-overlay" />
          </motion.div>
          <motion.div
            className="hero-overlay"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="text-container">
              <h1>Discover Local Businesses</h1>
              <p>Buy or sell — connect with your community</p>
            </div>
            <motion.div
              className="hero-button-container"
              animate={{
                scale: [1, 1.03, 1],
                transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <motion.button
                className="hero-button"
                onClick={handleExplorePress}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                aria-label="Start Exploring"
              >
                <span>Start Exploring</span>
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* How to Use Section - Improved grid layout */}
        <section className="how-to-use-section">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2>How to Use Gogo</h2>
            <p>Get started in seconds</p>
          </motion.div>

          <div className="role-cards-row">
            <RoleCard
              title="I'm a Buyer"
              subtitle="Shop from local sellers"
              icon={FaShoppingBag}
              accentColorVar="--buyer-accent"
              onPress={() => openTutorials("How to Buy on Gogo", buyerTutorials)}
            />
            <RoleCard
              title="I'm a Seller"
              subtitle="Grow your business locally"
              icon={FaStoreAlt}
              accentColorVar="--seller-accent"
              onPress={() => openTutorials("How to Sell on Gogo", sellerTutorials)}
            />
          </div>
        </section>

        {/* Why Choose Section - Added horizontal scroll for mobile */}
        <section className="why-choose-section">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Why Choose Gogo?
          </motion.h2>

          <div className={`carousel-container ${isMobile ? 'horizontal-scroll' : ''}`}>
            <div className="features-grid">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <FeatureCard {...feature} />
                </motion.div>
              ))}
            </div>
          </div>

          {isMobile && (
            <motion.div
              className="swipe-cue"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <span>Swipe to explore</span>
            </motion.div>
          )}
        </section>

        {/* Footer - Enhanced animations */}
        <footer className="footer-section">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2>Join the Gogo Community</h2>
            <p>Connect locally. Buy & sell with trust.</p>
            <motion.button
              className="footer-button"
              onClick={handleGetStarted}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              aria-label="Get Started"
            >
              <span>Get Started</span>
            </motion.button>
          </motion.div>
        </footer>
      </main>

      {/* Tutorial Modal - Improved accessibility and animations */}
      <AnimatePresence>
        {modalVisible && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalVisible(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="modal-header">
                <h3 id="modal-title">{modalTitle}</h3>
                <button onClick={() => setModalVisible(false)} className="modal-close" aria-label="Close modal">
                  <FaTimes size={28} />
                </button>
              </div>
              <div className="tutorial-grid">
                {modalVideos.map((video, index) => (
                  <motion.div
                    key={video.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <TutorialVideoItem {...video} onPlay={handlePlayVideo} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Modal - Added loading skeleton and better handling */}
      <AnimatePresence>
        {videoVisible && currentVideoId && (
          <motion.div
            className="video-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseVideo}
            role="dialog"
            aria-modal="true"
            aria-label="Video player"
          >
            {isVideoLoading && (
              <div className="video-loading-container">
                <motion.div
                  className="loading-spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p>Loading video...</p>
              </div>
            )}
            <YouTube
              videoId={currentVideoId}
              opts={youtubeOptions}
              onReady={() => setIsVideoLoading(false)}
              onEnd={handleCloseVideo}
              onError={handleCloseVideo}
              containerClassName="youtube-container"
            />
            <motion.button
              className="video-close-button"
              onClick={handleCloseVideo}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              aria-label="Close video"
            >
              <FaTimes size={32} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(Homepage);