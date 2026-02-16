// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect } from 'react';

// ────────────────────────────────────────────────
// Only import pages that actually exist right now
// ────────────────────────────────────────────────
import Home from './pages/Home';                    // ← Landing page – first screen users see
import SignIn from './pages/Login';
import SignUp from './pages/Signup';
import Shop from './pages/shop/ShopHomePage';
import MyShop from './pages/shop/MyShop';
import RequestTokenScreen from './pages/RequestTokenScreen';
import VerifyEmailScreen from './pages/VerifyEmailScreen';
import CreateShopScreen from './pages/shop/CreateShopScreen';
//import WelcomeWorkingHours from './pages/shop/WelcomeWorkingHours';
import UpdateShopProducts from './pages/shop/UpdateProducts';
import ShopProduct from './pages/shop/ShopProduct';
import SearchResults from './pages/shop/SearchResults';
import ShopPage from './pages/shop/ShopPage';
import AdminShopPage from './pages/shop/AdminShopPage';
import EditProfileScreen from './pages/shop/EditProfileScreen';
import Account from './tabs/Account';
import Profile from './tabs/Profile';
import CustomerReceipts from './pages/shop/CustomerReceipts';
import Subscription from './pages/shop/Subscription';
import VerificationStatus from './pages/VerificationStatus';
import IDVerification from './pages/IDVerification';
import NotificationSettings from './pages/shop/NotificationSettings';
import Feedback from './pages/shop/Feedback';
import ChangePassword from './pages/ChangePassword';


import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import BottomTabBar from './components/BottomTabBar';


 import { CartProvider } from './contexts/CartContext';
import FeedbackScreen from './pages/shop/Feedback';
import Details from './pages/shop/Details';
import Conversation from './pages/shop/Conversation';
// import { AdProvider } from './contexts/AdContext';
// import { AppResetProvider } from './contexts/AppResetContext';


function AppContent() {
  const location = useLocation();

useEffect(() => {
  const handleScroll = () => {
    const header = document.querySelector('.gl-header');
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

  // ────────────────────────────────────────────────
  // Hide bottom tab on landing page + all auth-related full-screen pages
  // ────────────────────────────────────────────────
  const hideBottomTabPaths = [
    '/',                    // landing / home page
    '/login',
    '/signup',
    '/request-token',
    '/Verify-email',
  ];

  const showBottomTab = !hideBottomTabPaths.includes(location.pathname);

  // Add bottom padding when tab bar is visible (adjust values to match your design)
  const mainPaddingClass = showBottomTab ? 'pb-20 md:pb-24' : '';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Fixed toggle – top-right on mobile/desktop */}
      {/* <ThemeToggle />   ← uncomment when you want it always visible */}

      <main className={`flex-1 ${mainPaddingClass}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/*" element={<Shop />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/request-token" element={<RequestTokenScreen />} />
          <Route path="/Verify-email" element={<VerifyEmailScreen />} />
          <Route path="/my-space" element={<MyShop />} />
          <Route path="/create-space" element={<CreateShopScreen />} />
          {/* <Route path="/shop/welcome-work-hours" element={<WelcomeWorkingHours />} /> */}
          <Route path="/update-products" element={<UpdateShopProducts />} />
          <Route path="/shop-products" element={<ShopProduct />} />
          <Route path="/search-result" element={<SearchResults />} />
          <Route path="/shop-page/:shopId" element={<ShopPage />} />
          <Route path="/admin-shop-page" element={<AdminShopPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/account" element={<Account />} />
          <Route path="/profile-edit" element={<EditProfileScreen />} />
          <Route path="/customer-receipts" element={<CustomerReceipts />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/verification-status" element={<VerificationStatus />} />
          <Route path="/ID-verification" element={<IDVerification />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/feed-back" element={<FeedbackScreen />} />
          <Route path="/delete-account" element={<NotificationSettings />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/details" element={<Details />} />
          <Route path="/conversation" element={<Conversation />} />
          
        </Routes>
      </main>

      {/* Bottom tab only appears when showBottomTab is true */}
      {showBottomTab && <BottomTabBar />}

      {/* Toast notifications – always available */}
      <ToastContainer
        position="top-center"
        autoClose={7000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored" // better visibility in both modes
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        {/* Providers are commented out until you create the context files */}
         <CartProvider> 
        {/*   <AppResetProvider> */}
        {/*     <AdProvider> */}
              <AppContent />
        {/*     </AdProvider> */}
        {/*   </AppResetProvider> */}
         </CartProvider> 
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;