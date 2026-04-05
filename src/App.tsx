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
import Shop from './tabs/ShopHomePage';
import MyShop from './tabs/MyShop';
import RequestTokenScreen from './pages/RequestTokenScreen';
import VerifyEmailScreen from './pages/VerifyEmailScreen';
import CreateShopScreen from './pages/shop/CreateShopScreen';
import WelcomeWorkingHours from './pages/shop/WelcomeWorkingHours';
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
import { FloatingCartOrb } from './components/carts/FloatingCartButton';
import { SellerFloatingOrb } from './components/carts/SellerFloatingOrb';


 import { CartProvider } from './contexts/CartContext';
import FeedbackScreen from './pages/shop/Feedback';
import Details from './pages/shop/Details';
import Conversation from './pages/shop/Conversation';
import StartConversation from './pages/shop/StartConversation';
import MessageList from './tabs/MessageList';
import FollowedShopStatus from './tabs/FollowedShopStatus';
import FullShopPosts from './pages/shop/FullShopPosts';
import AllCategories from './pages/shop/AllCategories';
import ChildCategories from './pages/shop/ChildCategoryList';
import SubcategoryList from './pages/shop/SubcategoryList';
import ShopStatus from './pages/shop/ShopStatus';
import WorkingHours from './pages/shop/WorkingHours';
import ShopProfile from './pages/shop/ShopProfile';
import ShopReceipts from './pages/shop/ShopReceipts';
import SalesActions from './pages/shop/SalesActions';
import GenerateReceipt from './pages/shop/GenerateReceipt';
import AllRecentlyVisited from './pages/shop/AllRecentlyVisited';
import FavoriteShops from './pages/shop/FavoriteShops';
import NewOrderEditor from './pages/carts/NewOrderEditor';
import BuyerPOEditor from './pages/carts/BuyerPOEditor';
import SellerPOEditor from './pages/carts/SellerPOEditor';
import SellerPODashboard from './pages/carts/SellerDashboard';
import BuyerPODashboard from './pages/carts/BuyerPODashboard';
import SellerPOCounter from './pages/carts/SellerPOCounter';
import BuyerCounterEditor from './pages/carts/BuyerCounterEditor';
import DeleteAccount from './pages/DeleteAccount';
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
          <Route path="/update-products" element={<UpdateShopProducts />} />
          <Route path="/shop-products" element={<ShopProduct />} />
          <Route path="/search-result" element={<SearchResults />} />
          <Route path="/shop-page/:shop_id" element={<ShopPage />} />
          <Route path="/admin-shop-page" element={<AdminShopPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/account" element={<Account />} />
          <Route path="/profile-edit" element={<EditProfileScreen />} />
          <Route path="/sales-action" element={<SalesActions />} />
          <Route path="/customer-receipts" element={<CustomerReceipts />} />
          <Route path="/shop-receipts" element={<ShopReceipts />} />
          <Route path="/generate-receipts" element={<GenerateReceipt />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/verification-status" element={<VerificationStatus />} />
          <Route path="/ID-verification" element={<IDVerification />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/feed-back" element={<FeedbackScreen />} />
          <Route path="/delete-account" element={<DeleteAccount />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/details" element={<Details />} />
          <Route path="/messages" element={<MessageList />} />
          <Route path="/conversation" element={<Conversation />} />
          <Route path="/start-conversation" element={<StartConversation />} />
          <Route path="/latest-updates" element={<FollowedShopStatus />} />
          <Route path="/more-posts" element={<FullShopPosts />} />
          <Route path="/all-categories" element={<AllCategories />} />
          <Route path="/child-category" element={<ChildCategories />} />
          <Route path="/sub-categories" element={<SubcategoryList />} />
          <Route path="/stories-updates" element={<ShopStatus />} />
          <Route path="/shop/welcome-work-hours" element={<WelcomeWorkingHours />} />
          <Route path="/work-hours" element={<WorkingHours />} />
          <Route path="/space-profile" element={<ShopProfile />} />
          <Route path="/recently-visited" element={<AllRecentlyVisited/>} />
          <Route path="/favorite-space" element={<FavoriteShops />} />
          <Route path="/cart/editor" element={<NewOrderEditor />} />
          <Route path="/cart/buyer-editor" element={<BuyerPOEditor />} />
          <Route path="/cart/buyer-dashboard" element={<BuyerPODashboard />} />
          <Route path="/cart/buyer-counter" element={<BuyerCounterEditor/>} />
          <Route path="/cart/seller-editor" element={<SellerPOEditor />} />
          <Route path="/cart/seller-dashboard" element={<SellerPODashboard />} />
          <Route path="/cart/seller-counter" element={<SellerPOCounter/>} />
          
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
          <SellerFloatingOrb />
          <FloatingCartOrb />
         </CartProvider> 
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;