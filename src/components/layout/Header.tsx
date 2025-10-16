import { Bell, LogIn, Moon, Sun, User, UserPlus } from 'lucide-react';
import React from 'react';
import { Badge, Button, Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <Navbar expand="lg" className="navbar-custom shadow-sm" fixed="top">
      <Container>
        {/* Brand */}
        <Navbar.Brand as={Link} to="/" className="brand-name-main">
          <span className="text-gold">Velora</span> Retreat
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav">
          <span className="navbar-toggler-icon">
            <span className="hamburger-bar"></span>
          </span>
        </Navbar.Toggle>
        
        <Navbar.Collapse id="basic-navbar-nav">
          {/* Mobile Menu Header */}
          <div className="d-lg-none">
            <div className="mobile-menu-header">
              <div className="mobile-menu-close" onClick={() => {
                const toggler = document.querySelector('.navbar-toggler') as HTMLElement;
                if (toggler) toggler.click();
              }}>
                ✕
              </div>
              <div className="mobile-menu-logo">
                <Link to="/" className="brand-name">
                  VELORA
                </Link>
                <div className="brand-subtitle">
                  RETREAT
                </div>
                <div className="tagline-separator"></div>
                <div className="brand-tagline">
                  Where Elegance Meets
                  <br />
                  Culinary Excellence
                </div>
              </div>
            </div>
            <div className="mobile-menu-content">
          </div>
          </div>
          {/* Main Navigation */}
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" className={`nav-link ${isActive('/')}`}>
              <i className="fas fa-home"></i>
              Home
            </Nav.Link>
            <Nav.Link as={Link} to="/menu" className={`nav-link ${isActive('/menu')}`}>
              <i className="fas fa-utensils"></i>
              Menu
            </Nav.Link>
            <Nav.Link as={Link} to="/booking" className={`nav-link ${isActive('/booking')}`}>
              <i className="fas fa-calendar-alt"></i>
              Booking
            </Nav.Link>
            <Nav.Link as={Link} to="/contact" className={`nav-link ${isActive('/contact')}`}>
              <i className="fas fa-envelope"></i>
              Contact
            </Nav.Link>
            <Nav.Link as={Link} to="/booking" className={isActive('/booking')}>
              Booking
            </Nav.Link>
            <Nav.Link as={Link} to="/contact" className={isActive('/contact')}>
              Contact
            </Nav.Link>
          </Nav>

          {/* Right Side Navigation */}
          <Nav className="align-items-center nav-user-mobile">
            {/* Theme Toggle */}
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={toggleTheme}
              className="me-2 border-0 d-flex align-items-center"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </Button>

            {isAuthenticated && user ? (
              <>
                {/* Notifications (placeholder) */}
                <Nav.Link href="#notifications" className="position-relative me-2">
                  <Bell size={16} />
                  <Badge 
                    pill 
                    bg="danger" 
                    className="position-absolute top-0 start-100 translate-middle"
                    style={{ fontSize: '0.6rem' }}
                  >
                    2
                  </Badge>
                </Nav.Link>

                {/* User Dropdown */}
                <NavDropdown
                  title={
                    <span className="d-inline-flex align-items-center">
                      <User size={16} className="me-1" />
                      {user.name}
                      {user.loyaltyPoints > 0 && (
                        <Badge bg="warning" text="dark" className="ms-2">
                          {user.loyaltyPoints} pts
                        </Badge>
                      )}
                    </span>
                  }
                  id="user-dropdown"
                  align="end"
                >
                  <NavDropdown.Item as={Link} to="/dashboard">
                    Dashboard
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/profile">
                    Profile
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/bookings">
                    My Bookings
                  </NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/reviews">
                    My Reviews
                  </NavDropdown.Item>
                  
                  {/* Admin Links */}
                  {(user.role === 'admin' || user.role === 'staff') && (
                    <>
                      <NavDropdown.Divider />
                      <NavDropdown.Item as={Link} to="/admin">
                        Admin Panel
                      </NavDropdown.Item>
                      {user.role === 'admin' && (
                        <NavDropdown.Item as={Link} to="/admin/reports">
                          Reports
                        </NavDropdown.Item>
                      )}
                    </>
                  )}
                  
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <div className="d-flex gap-2">
                <Button 
                  as={Link as any} 
                  to="/login" 
                  variant="outline-primary" 
                  size="sm"
                  className="d-flex align-items-center"
                >
                  <LogIn size={16} className="me-1" />
                  Login
                </Button>
                <Button 
                  as={Link as any} 
                  to="/register" 
                  variant="primary" 
                  size="sm"
                  className="d-flex align-items-center"
                >
                  <UserPlus size={16} className="me-1" />
                  Register
                </Button>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;