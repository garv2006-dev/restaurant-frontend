import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { NotificationProvider } from './context/NotificationContext';
import { SocketProvider } from './contexts/SocketContext';

// Layout
import Layout from './components/layout/Layout';

// Notification Components
import NotificationDisplay from './components/notifications/NotificationDisplay';
import SoundPermissionToast from './components/notifications/SoundPermissionToast';
// import AudioStatusIndicator from './components/notifications/AudioStatusIndicator'; // Removed - alert not needed

// Services
import './services/RealTimeNotificationService'; // Initialize real-time notifications

// Styles
import './App.css';
import './styles/settings-button.css';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import MyBookings from './pages/MyBookings';
import MyReviews from './pages/MyReviews';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import OrderSuccess from './pages/OrderSuccess';
import AdminDashboard from './pages/admin/AdminDashboard';
import ReportsAnalytics from './components/admin/ReportsAnalytics';
import LoyaltyDashboard from './pages/LoyaltyDashboard';
import Dashboard from './pages/Dashboard';
import NotificationsPage from './pages/NotificationsPage';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import './styles/components.css';
import './styles/responsive.css';
import './styles/mobile-menu-fix.css';

import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';

function App() {
  // Load test utilities in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('./utils/testNotificationSound').catch(err => 
        console.warn('Failed to load test utilities:', err)
      );
    }
  }, []);
  // Placeholder components for routes
  const AdminTest = () => {
    const { user, isAuthenticated } = useAuth();
    return (
      <div className="container py-5">
        <h1>Admin Test</h1>
        <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
        <p>User: {user ? user.name : 'None'}</p>
        <p>Role: {user?.role || 'None'}</p>
      </div>
    );
  };
  return (
    <AccessibilityProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <Routes>
                {/* Admin routes - outside Layout */}
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                  <ProtectedRoute requiredRole="admin">
                    <ReportsAnalytics />
                  </ProtectedRoute>
                } />
                <Route path="/admin-test" element={<AdminTest />} />
                
                {/* Public routes - inside Layout */}
                <Route path="/*" element={
                  <Layout>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<Home />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password/:token" element={<ResetPassword />} />
                      <Route path="/booking" element={<Booking />} />
                      <Route path="/contact" element={<Contact />} />
                      
                      {/* Protected routes - require authentication */}
                      <Route path="/order-success" element={
                        <ProtectedRoute>
                          <OrderSuccess />
                        </ProtectedRoute>
                      } />
                      <Route path="/loyalty" element={
                        <ProtectedRoute>
                          <LoyaltyDashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/profile" element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } />
                      <Route path="/bookings" element={
                        <ProtectedRoute>
                          <MyBookings />
                        </ProtectedRoute>
                      } />
                      <Route path="/reviews" element={
                        <ProtectedRoute>
                          <MyReviews />
                        </ProtectedRoute>
                      } />
                      <Route path="/notifications" element={
                        <ProtectedRoute>
                          <NotificationsPage />
                        </ProtectedRoute>
                      } />
                    </Routes>
                  </Layout>
                } />
              </Routes>
              {/* Toast Notifications */}
              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                aria-live="polite"
              />
              
              {/* Enhanced Notification Display */}
              <NotificationDisplay 
                position="top-end" 
                maxNotifications={5} 
              />
              
              {/* Sound Permission Toast - Browser-style permission prompt */}
              <SoundPermissionToast 
                onPermissionGranted={() => console.log('✅ User granted sound permission')}
                onPermissionDenied={() => console.log('🔇 User denied sound permission')}
              />
              
              {/* Audio Status Indicator - Removed to hide alert message */}
              {/* <AudioStatusIndicator /> */}
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </AccessibilityProvider>
  );
}

export default App;