import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";

// 🎨 Layouts
import Navbar from "./components/Navbar";
import DashboardLayout from "./components/DashboardLayout";

// 📄 Public Pages
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import GetQuote from "./pages/GetQuote";
import Tracking from "./pages/Tracking";

// 🔐 Auth Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import AdminLogin from "./pages/AdminLogin";
import ResetPassword from "./pages/ResetPassword";

// 👤 Customer Dashboard Pages
import Dashboard from "./pages/Dashboard";
import BookShipment from "./pages/BookShipment";
import MyShipments from "./pages/MyShipments";
import Invoices from "./pages/Invoices";
import Documents from "./pages/Documents";
import Notifications from "./pages/Notifications";
import Support from "./pages/Support";
import Profile from "./pages/Profile";

// 💰 Wallets & Payments
import WalletsAndPayments from "./pages/WalletsAndPayments";

// 📒 Address Book
import AddressBook from "./pages/AddressBook";

// 📦 Returns & Reports
import Returns from "./pages/Returns";
import ReportsAnalytics from "./pages/ReportsAnalytics";

// 🛠️ Shipping Tools
import RateCalculator from "./pages/RateCalculator";
import PincodeChecker from "./pages/PincodeChecker";
import BulkUpload from "./pages/BulkUpload";
import VolumetricCalculator from "./pages/VolumetricCalculator";

// 🚚 NEW: Pickup Scheduler Module
import PickupScheduler from "./pages/PickupScheduler";
import PickupHistory from "./pages/PickupHistory";

// 🛡️ Admin
import Admin from "./pages/Admin";

// 🔒 Components
import ProtectedRoute from "./components/ProtectedRoute";

// ✅ Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* 🌍 PUBLIC ROUTES - No authentication required */}
          <Route path="/" element={<><Navbar /><Home /></>} />
          <Route path="/about" element={<><Navbar /><AboutUs /></>} />
          <Route path="/services" element={<><Navbar /><Services /></>} />
          <Route path="/contact" element={<><Navbar /><Contact /></>} />
          <Route path="/get-quote" element={<><Navbar /><GetQuote /></>} />
          
          {/* 📦 Public Tracking & Tools */}
          <Route path="/tracking" element={<><Navbar /><Tracking /></>} />
          <Route path="/tracking/:trackingId" element={<><Navbar /><Tracking /></>} />
          <Route path="/rate-calculator" element={<><Navbar /><RateCalculator /></>} />
          <Route path="/pincode-checker" element={<><Navbar /><PincodeChecker /></>} />
          <Route path="/bulk-upload" element={<><Navbar /><BulkUpload /></>} />
          <Route path="/volumetric-calculator" element={<><Navbar /><VolumetricCalculator /></>} />

          {/* 🔐 AUTH ROUTES - Public access */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* 👤 CUSTOMER DASHBOARD ROUTES - Protected + DashboardLayout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/book-shipment" element={
            <ProtectedRoute>
              <DashboardLayout>
                <BookShipment />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/my-shipments" element={
            <ProtectedRoute>
              <DashboardLayout>
                <MyShipments />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/invoices" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Invoices />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* 💰 WALLETS & PAYMENTS */}
          <Route path="/wallets-payments" element={
            <ProtectedRoute>
              <DashboardLayout>
                <WalletsAndPayments />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          {/* 📒 ADDRESS BOOK */}
          <Route path="/address-book" element={
            <ProtectedRoute>
              <DashboardLayout>
                <AddressBook />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* 📦 RETURNS */}
          <Route path="/returns" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Returns />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* 📊 REPORTS & ANALYTICS */}
          <Route path="/reports" element={
            <ProtectedRoute>
              <DashboardLayout>
                <ReportsAnalytics />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/documents" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Documents />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/notifications" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Notifications />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/support" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Support />
              </DashboardLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* 🚚 PICKUP SCHEDULER - NEW ENTERPRISE FEATURES */}
          <Route path="/pickup-scheduler" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PickupScheduler />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/pickup-history" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PickupHistory />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/pickup-scheduler/edit/:id" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PickupScheduler />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/pickup-scheduler/details/:id" element={
            <ProtectedRoute>
              <DashboardLayout>
                <PickupHistory />
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* 🔄 Legacy Redirects */}
          <Route path="/booking" element={<Navigate to="/book-shipment" replace />} />
          <Route path="/create-shipment" element={<Navigate to="/book-shipment" replace />} />
          <Route path="/create" element={<Navigate to="/book-shipment" replace />} />
          <Route path="/wallet" element={<Navigate to="/wallets-payments" replace />} />
          <Route path="/payments" element={<Navigate to="/wallets-payments" replace />} />

          {/* 🛡️ ADMIN ROUTES - Standalone (No DashboardLayout) */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute adminOnly={true}>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* ❌ 404 Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}