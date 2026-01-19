import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  User,
  Home,
  Percent,
  CalendarPlus,
  BedDouble,
  Hash,
  CalendarCheck,
  Users,
  LayoutDashboard,
  FileText
} from 'lucide-react';
import '../../styles/admin-panel.css';
import api from '../../services/api';
import { Room } from '../../types';

// Import actual admin components
import RoomManagement from '../../components/admin/RoomManagement';
import RoomNumberManagement from '../../components/admin/RoomNumberManagement';
import BookingManagement from '../../components/admin/BookingManagement';
import CustomerManagement from '../../components/admin/CustomerManagement';
import ReportsAnalytics from '../../components/admin/ReportsAnalytics';
import DiscountManagement from './DiscountManagement';
import SystemSettings from '../../components/admin/SystemSettings';
import LiveDashboard from '../../components/admin/LiveDashboard';
import OfflineBookingModal from '../../components/admin/OfflineBookingModal';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Offline Booking Modal State
  const [showOfflineBooking, setShowOfflineBooking] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);


  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  const fetchRooms = async () => {
    try {

      const response = await api.get('/rooms');
      // Handle different response structures
      let roomsData = [];
      if (Array.isArray(response.data)) {
        roomsData = response.data;
      } else if (response.data && Array.isArray(response.data.rooms)) {
        roomsData = response.data.rooms;
      } else if (response.data && Array.isArray(response.data.data)) {
        roomsData = response.data.data;
      }
      setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {

    }
  };

  const handleOpenOfflineBooking = () => {
    fetchRooms();
    setShowOfflineBooking(true);
  };

  return (
    <div className="admin-container">
      {/* Sidebar - Fixed Position */}
      <aside className="admin-sidebar-wrapper">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <LayoutDashboard size={24} className="text-primary" />
            <span>Admin</span>
          </div>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={18} className="admin-nav-icon" />
            <span>Overview</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'rooms' ? 'active' : ''}`}
            onClick={() => setActiveTab('rooms')}
          >
            <BedDouble size={18} className="admin-nav-icon" />
            <span>Room Management</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'room-numbers' ? 'active' : ''}`}
            onClick={() => setActiveTab('room-numbers')}
          >
            <Hash size={18} className="admin-nav-icon" />
            <span>Room Numbers</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <CalendarCheck size={18} className="admin-nav-icon" />
            <span>Bookings</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={18} className="admin-nav-icon" />
            <span>Customers</span>
          </button>
          <button
            className={`admin-nav-item ${showOfflineBooking ? 'active' : ''}`}
            onClick={handleOpenOfflineBooking}
          >
            <CalendarPlus size={18} className="admin-nav-icon" />
            <span>Offline Booking</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'discounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('discounts')}
          >
            <Percent size={18} className="admin-nav-icon" />
            <span>Discounts</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText size={18} className="admin-nav-icon" />
            <span>Reports</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} className="admin-nav-icon" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="user-mini-profile">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || 'Admin'}</span>
              <span className="user-role">{user?.role || 'Administrator'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-start">
            <h1 className="page-title">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'rooms' && 'Room Management'}
              {activeTab === 'room-numbers' && 'Room Inventory'}
              {activeTab === 'bookings' && 'Booking Management'}
              {activeTab === 'customers' && 'Customer Database'}
              {activeTab === 'discounts' && 'Discount Management'}
              {activeTab === 'reports' && 'Reports & Analytics'}
              {activeTab === 'settings' && 'System Settings'}
            </h1>
            <div className="live-indicator">
              <span className="pulsing-dot"></span>
              <span>System Live</span>
            </div>
          </div>

          <div className="admin-header-actions">
            <button
              className="admin-btn admin-btn-ghost"
              onClick={handleBackToMain}
            >
              <Home size={18} />
              <span className="d-none d-md-inline">Main Site</span>
            </button>
            <Dropdown>
              <Dropdown.Toggle className="admin-btn admin-btn-ghost no-caret">
                <Settings size={18} />
              </Dropdown.Toggle>
              <Dropdown.Menu align="end" className="admin-dropdown-menu">
                <Dropdown.Item onClick={() => setActiveTab('settings')}>
                  Settings
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="admin-content-wrapper">
          <div className={`admin-content-fade-in key-${activeTab}`}>
            {activeTab === 'overview' && <LiveDashboard />}
            {activeTab === 'rooms' && <RoomManagement />}
            {activeTab === 'room-numbers' && <RoomNumberManagement />}
            {activeTab === 'bookings' && <BookingManagement />}
            {activeTab === 'customers' && <CustomerManagement />}
            {activeTab === 'discounts' && <DiscountManagement />}
            {activeTab === 'reports' && <ReportsAnalytics />}
            {activeTab === 'settings' && <SystemSettings />}
          </div>
        </div>
      </main>

      {/* Offline Booking Modal Overlay */}
      {showOfflineBooking && (
        <OfflineBookingModal
          show={showOfflineBooking}
          onHide={() => setShowOfflineBooking(false)}
          onSuccess={() => {
            setActiveTab('bookings');
          }}
          rooms={rooms}
        />
      )}
    </div>
  );
};

export default AdminDashboard;