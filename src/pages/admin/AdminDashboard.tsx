import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Nav, Tab, Button, Dropdown } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User, BarChart, Home, Upload, Image, Gift, Percent } from 'lucide-react';

// Import actual admin components
import RoomManagement from '../../components/admin/RoomManagement';
import BookingManagement from '../../components/admin/BookingManagement';
import MenuManagement from '../../components/admin/MenuManagement';
import CustomerManagement from '../../components/admin/CustomerManagement';
import ReportsAnalytics from '../../components/admin/ReportsAnalytics';
import LoyaltyManagement from './LoyaltyManagement';
import DiscountManagement from './DiscountManagement';
import LiveDashboard from '../../components/admin/LiveDashboard';

const AdminDashboard: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
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
    <Container fluid className="py-4">
      {/* Admin Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="mb-1">Admin Dashboard</h1>
              <p className="text-muted mb-0">Welcome back, {user?.name || 'Admin'}! ({user?.role || 'admin'})</p>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                onClick={handleBackToMain}
                className="d-flex align-items-center"
              >
                <Home size={16} className="me-1" />
                Back to Main Site
              </Button>
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" className="d-flex align-items-center">
                  <User size={16} className="me-1" />
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
        </Col>
      </Row>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')}>
        <Row>
          <Col md={3}>
            <Nav variant="pills" className="flex-column">
              <Nav.Item>
                <Nav.Link eventKey="overview" className="d-flex align-items-center">
                  <BarChart size={16} className="me-2" />
                  Overview
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="rooms" className="d-flex align-items-center">
                  <Home size={16} className="me-2" />
                  Room Management
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="bookings" className="d-flex align-items-center">
                  <BarChart size={16} className="me-2" />
                  Booking Management
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="menu" className="d-flex align-items-center">
                  <Image size={16} className="me-2" />
                  Menu Management
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="customers" className="d-flex align-items-center">
                  <User size={16} className="me-2" />
                  Customer Management
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="loyalty" className="d-flex align-items-center">
                  <Gift size={16} className="me-2" />
                  Loyalty Program
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="discounts" className="d-flex align-items-center">
                  <Percent size={16} className="me-2" />
                  Discount Management
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="reports" className="d-flex align-items-center">
                  <BarChart size={16} className="me-2" />
                  Reports & Analytics
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>

          <Col md={9}>
            <Tab.Content>
              <Tab.Pane eventKey="overview">
                <LiveDashboard />
              </Tab.Pane>

              <Tab.Pane eventKey="rooms">
                <RoomManagement />
              </Tab.Pane>

              <Tab.Pane eventKey="bookings">
                <BookingManagement />
              </Tab.Pane>

              <Tab.Pane eventKey="menu">
                <MenuManagement />
              </Tab.Pane>

              <Tab.Pane eventKey="customers">
                <CustomerManagement />
              </Tab.Pane>

              <Tab.Pane eventKey="loyalty">
                <LoyaltyManagement />
              </Tab.Pane>

              <Tab.Pane eventKey="discounts">
                <DiscountManagement />
              </Tab.Pane>

              <Tab.Pane eventKey="reports">
                <ReportsAnalytics />
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Container>
  );
};

export default AdminDashboard;