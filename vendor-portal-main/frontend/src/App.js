import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import ProductAnalyticsDemo from './pages/public/ProductAnalyticsDemo';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ApplicationStatusPage from './pages/auth/ApplicationStatusPage';
import ForgotPasswordPage from './pages/auth/forgetpassword';
import ResetPasswordPage from './pages/auth/resetpassword';
import TrackApplication from './pages/auth/TrackApplication';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import VendorApplications from './pages/admin/VendorApplications';
import ManufacturerApplications from './pages/admin/ManufacturerApplications';
import ManageAdmins from './pages/admin/ManageAdmins';

// Vendor Pages
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorProfile from './pages/vendor/VendorProfile';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorShipping from './pages/vendor/VendorShipping';
// import VendorReturns from './pages/vendor/VendorReturns';
const VendorReturns = lazy(() => import('./pages/vendor/VendorReturns'));

// Manufacturer Pages
import ManufacturerDashboard from './pages/manufacturer/ManufacturerDashboard';
import ManufacturerProfile from './pages/manufacturer/ManufacturerProfile';
import BrowseProducts from './pages/manufacturer/BrowseProducts';
import Quotations from './pages/manufacturer/Quotations';
import PurchaseOrders from './pages/manufacturer/PurchaseOrders';
import OrderTracking from './pages/manufacturer/OrderTracking';
const ManufacturerReturns = lazy(() => import('./pages/manufacturer/ManufacturerReturns'));
import RaiseDispute from './pages/manufacturer/RaiseDispute';
import ApplicationTracking from './pages/common/ApplicationTracking';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-surface-50 text-brand-500 font-medium">Loading Page...</div>}>
          <Routes>
            {/* ---- Public ---- */}
            <Route path="/" element={<HomePage />} />
            <Route path="/product-analytics" element={<ProductAnalyticsDemo />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register/:role" element={<RegisterPage />} />
            <Route path="/application-status" element={<ApplicationStatusPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/track-application" element={<TrackApplication />} />

            {/* ---- Admin Dashboard (protected) ---- */}
            <Route
              path="/admin"
              element={
                <PrivateRoute requiredRole="admin">
                  <DashboardLayout role="admin" />
                </PrivateRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="vendor-apps" element={<VendorApplications />} />
              <Route path="manufacturer-apps" element={<ManufacturerApplications />} />
              <Route path="manage-admins" element={<ManageAdmins />} />
            </Route>

            {/* ---- Vendor Dashboard (protected) ---- */}
            <Route
              path="/vendor"
              element={
                <PrivateRoute requiredRole="vendor">
                  <DashboardLayout role="vendor" />
                </PrivateRoute>
              }
            >
              <Route index element={<VendorDashboard />} />
              <Route path="profile" element={<VendorProfile />} />
              <Route path="products" element={<VendorProducts />} />
              <Route path="orders" element={<VendorOrders />} />
              <Route path="shipping" element={<VendorShipping />} />
              <Route path="returns" element={<VendorReturns />} />
              <Route path="applications" element={<ApplicationTracking />} />
            </Route>

            {/* ---- Manufacturer Dashboard (protected) ---- */}
            <Route
              path="/manufacturer"
              element={
                <PrivateRoute requiredRole="manufacturer">
                  <DashboardLayout role="manufacturer" />
                </PrivateRoute>
              }
            >
              <Route index element={<ManufacturerDashboard />} />
              <Route path="profile" element={<ManufacturerProfile />} />
              <Route path="browse" element={<BrowseProducts />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="orders" element={<PurchaseOrders />} />
              <Route path="tracking" element={<OrderTracking />} />
              <Route path="returns" element={<ManufacturerReturns />} />
              <Route path="applications" element={<ApplicationTracking />} />
              <Route path="raise-dispute" element={<RaiseDispute />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
