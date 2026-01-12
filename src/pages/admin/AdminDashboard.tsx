import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User, BarChart, Home, Percent } from 'lucide-react';
import '../../styles/admin-panel.css';

// Import actual admin components
import RoomManagement from '../../components/admin/RoomManagement';
import BookingManagement from '../../components/admin/BookingManagement';
import CustomerManagement from '../../components/admin/CustomerManagement';
import ReportsAnalytics from '../../components/admin/ReportsAnalytics';
import DiscountManagement from './DiscountManagement';
import LiveDashboard from '../../components/admin/LiveDashboard';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  return (
    <div className="admin-panel">
      {/* Admin Header */}
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-header-title">
            <h1>Admin Dashboard</h1>
            <p className="admin-header-subtitle">Welcome back, {user?.name || 'Admin'}! ({user?.role || 'admin'})</p>
          </div>
          <div className="admin-header-actions">
            <button
              className="admin-btn admin-btn-outline"
              onClick={handleBackToMain}
            >
              <Home size={16} />
              Back to Main Site
            </button>
            <Dropdown>
              <Dropdown.Toggle className="admin-btn admin-btn-outline">
                <User size={16} />
                Account
              </Dropdown.Toggle>
              <Dropdown.Menu align="end">
                <Dropdown.Item href="#/settings">
                  <Settings size={16} className="me-2" />
                  Settings
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  <LogOut size={16} className="me-2" />
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </div>

      <div className="container-fluid px-8">
        <div className="row">
          <div className="col-md-3">
            <div className="admin-sidebar">
              <nav className="admin-nav">
                <button
                  className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  <BarChart size={16} className="admin-nav-icon" />
                  Overview
                </button>
                <button
                  className={`admin-nav-item ${activeTab === 'rooms' ? 'active' : ''}`}
                  onClick={() => setActiveTab('rooms')}
                >
                  <Home size={16} className="admin-nav-icon" />
                  Room Management
                </button>
                <button
                  className={`admin-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bookings')}
                >
                  <BarChart size={16} className="admin-nav-icon" />
                  Booking Management
                </button>
                <button
                  className={`admin-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('customers')}
                >
                  <User size={16} className="admin-nav-icon" />
                  Customer Management
                </button>
                <button
                  className={`admin-nav-item ${activeTab === 'discounts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('discounts')}
                >
                  <Percent size={16} className="admin-nav-icon" />
                  Discount Management
                </button>
                <button
                  className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reports')}
                >
                  <BarChart size={16} className="admin-nav-icon" />
                  Reports & Analytics
                </button>
              </nav>
            </div>
          </div>

          <div className="col-md-9">
            <div className="admin-content">
              {activeTab === 'overview' && <LiveDashboard />}
              {activeTab === 'rooms' && <RoomManagement />}
              {activeTab === 'bookings' && <BookingManagement />}
              {activeTab === 'customers' && <CustomerManagement />}
              {activeTab === 'discounts' && <DiscountManagement />}
              {activeTab === 'reports' && <ReportsAnalytics />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;