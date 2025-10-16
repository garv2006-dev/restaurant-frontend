import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

// Context Providers
import { AccessibilityProvider } from './context/AccessibilityContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout
import Layout from './components/layout/Layout';

// Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import LoyaltyDashboard from './pages/LoyaltyDashboard';
import Menu from './pages/Menu';
import MyBookings from './pages/MyBookings';
import MyReviews from './pages/MyReviews';
import Profile from './pages/Profile';
import Register from './pages/Register';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import './styles/responsive.css';

import { useAuth } from './context/AuthContext';

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

function App() {
  return (
    <AccessibilityProvider>
      <ThemeProvider>
        <AuthProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/loyalty" element={<LoyaltyDashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/bookings" element={<MyBookings />} />
                <Route path="/reviews" element={<MyReviews />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin-test" element={<AdminTest />} />
                {/* Add more routes as needed */}
              </Routes>
            </Layout>
            
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
        </AuthProvider>
      </ThemeProvider>
    </AccessibilityProvider>
  );
}

export default App;