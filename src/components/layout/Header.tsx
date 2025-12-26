import React, { useState, useEffect } from 'react';
import { Navbar, Nav, NavDropdown, Container, Button, Badge } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Sun, Moon, Bell, LogIn, UserPlus, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useNotifications } from '../../context/NotificationContext';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { totalQuantity } = useCart();
  const { unreadCount } = useNotifications();
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    // Prevent/allow body scroll based on menu state
    document.body.style.overflow = newExpanded ? 'hidden' : '';
  };

  const handleNavLinkClick = () => {
    // Just close the menu, let Link handle navigation naturally
    setExpanded(false);
    // Re-enable body scroll
    document.body.style.overflow = '';
  };

  const handleDesktopNavClick = () => {
    // Just close menu if it's somehow open on desktop
    setExpanded(false);
    document.body.style.overflow = '';
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  // Cleanup body scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <Navbar 
        expand="lg" 
        className="navbar-custom shadow-sm" 
        expanded={expanded}
        onToggle={handleToggle}
        fixed="top"
      >
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold" onClick={() => handleNavLinkClick()}>
            <span className="text-primary">Luxury</span> Restaurant
          </Navbar.Brand>

          <div className="navbar-icons">
            {/* Mobile notification icon */}
            <div className="d-lg-none mobile-notification-wrapper">
              {isAuthenticated && user && (
                <Nav.Link 
                  as={Link}
                  to="/notifications" 
                  className="mobile-notification-bell"
                  onClick={() => handleNavLinkClick()}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <Badge 
                      pill 
                      bg="danger" 
                      className="position-absolute top-0 start-100 translate-middle mobile-notification-badge"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Nav.Link>
              )}
            </div>

            <Navbar.Toggle aria-controls="basic-navbar-nav">
              <span className="navbar-toggler-icon">
                <span></span>
              </span>
            </Navbar.Toggle>
          </div>
          
          <Navbar.Collapse id="basic-navbar-nav">
            {/* Mobile menu header */}
            <div className="navbar-header d-lg-none">
              <span 
                className="navbar-brand clickable-brand"
                onClick={() => {
                  navigate('/');
                  setExpanded(false);
                  document.body.style.overflow = '';
                }}
                style={{ cursor: 'pointer' }}
              >
                Luxury Restaurant
              </span>
              <button 
                className="navbar-close"
                onClick={handleToggle}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            
            {/* Main Navigation */}
            <Nav className="me-auto">
              <Nav.Link 
                as={Link} 
                to="/" 
                className={`fw-medium ${isActive('/') ? 'active' : ''}`}
                onClick={() => handleNavLinkClick()}
              >
                Home
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/menu" 
                className={`fw-medium ${isActive('/menu') ? 'active' : ''}`}
                onClick={() => handleNavLinkClick()}
              >
                Menu
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/booking" 
                className={`fw-medium ${isActive('/booking') ? 'active' : ''}`}
                onClick={() => handleNavLinkClick()}
              >
                Booking
              </Nav.Link>
              <Nav.Link 
                as={Link} 
                to="/contact" 
                className={`fw-medium ${isActive('/contact') ? 'active' : ''}`}
                onClick={() => handleNavLinkClick()}
              >
                Contact
              </Nav.Link>
            </Nav>

            {/* Mobile Action Buttons */}
            <div className="navbar-actions d-lg-none">
              {/* Theme Toggle */}
              <Button
                variant="outline-secondary"
                onClick={toggleTheme}
                className="w-100 d-flex align-items-center justify-content-center"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon size={16} className="me-2" /> : <Sun size={16} className="me-2" />}
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </Button>

              {/* Cart */}
              <Button
                as={Link as any}
                to="/cart"
                variant="outline-primary"
                className="w-100 d-flex align-items-center justify-content-center position-relative"
                onClick={() => handleNavLinkClick()}
              >
                <ShoppingCart size={16} className="me-2" />
                Cart
                {totalQuantity > 0 && (
                  <Badge
                    pill
                    bg="danger"
                    className="position-absolute top-0 start-100 translate-middle"
                    style={{ fontSize: '0.6rem' }}
                  >
                    {totalQuantity}
                  </Badge>
                )}
              </Button>

              {isAuthenticated && user ? (
                <>
                  {/* User Dropdown */}
                  <NavDropdown
                    title={
                      <span className="d-inline-flex align-items-center">
                        <User size={16} className="me-2" />
                        {user.name}
                      </span>
                    }
                    id="user-dropdown"
                    className="w-100"
                  >
                    <NavDropdown.Item as={Link} to="/dashboard" onClick={() => handleNavLinkClick()}>
                      Dashboard
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/profile" onClick={() => handleNavLinkClick()}>
                      Profile
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/bookings" onClick={() => handleNavLinkClick()}>
                      My Bookings
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/reviews" onClick={() => handleNavLinkClick()}>
                      My Reviews
                    </NavDropdown.Item>
                    
                    {/* Admin Links */}
                    {(user.role === 'admin' || user.role === 'staff') && (
                      <>
                        <NavDropdown.Divider />
                        <NavDropdown.Item as={Link} to="/admin" onClick={() => handleNavLinkClick()}>
                          Admin Panel
                        </NavDropdown.Item>
                        {user.role === 'admin' && (
                          <NavDropdown.Item as={Link} to="/admin/reports" onClick={() => handleNavLinkClick()}>
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
                <>
                  <Button 
                    as={Link as any} 
                    to="/login" 
                    variant="outline-primary" 
                    className="w-100 d-flex align-items-center justify-content-center"
                    onClick={() => handleNavLinkClick()}
                  >
                    <LogIn size={16} className="me-2" />
                    Login
                  </Button>
                  <Button 
                    as={Link as any} 
                    to="/register" 
                    variant="primary" 
                    className="w-100 d-flex align-items-center justify-content-center"
                    onClick={() => handleNavLinkClick()}
                  >
                    <UserPlus size={16} className="me-2" />
                    Register
                  </Button>
                </>
              )}
            </div>

            {/* Desktop Navigation - Hidden on Mobile */}
            <Nav className="align-items-center d-none d-lg-flex">
              {/* Theme Toggle */}
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={toggleTheme}
                className="me-2 border-0"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </Button>

              {/* Cart */}
              <Button
                as={Link as any}
                to="/cart"
                variant="outline-primary"
                size="sm"
                className="me-2 d-flex align-items-center position-relative"
                onClick={handleDesktopNavClick}
              >
                <ShoppingCart size={16} className="me-1" />
                Cart
                {totalQuantity > 0 && (
                  <Badge
                    pill
                    bg="danger"
                    className="position-absolute top-0 start-100 translate-middle"
                    style={{ fontSize: '0.6rem' }}
                  >
                    {totalQuantity}
                  </Badge>
                )}
              </Button>

              {isAuthenticated && user ? (
                <>
                  {/* Notifications */}
                  <Nav.Link 
                    as={Link}
                    to="/notifications" 
                    className="position-relative me-2"
                    onClick={handleDesktopNavClick}
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <Badge 
                        pill 
                        bg="danger" 
                        className="position-absolute top-0 start-100 translate-middle"
                        style={{ fontSize: '0.6rem' }}
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Nav.Link>

                  {/* User Dropdown */}
                  <NavDropdown
                    title={
                      <span className="d-inline-flex align-items-center fw-medium">
                        <User size={16} className="me-1" />
                        {user.name}
                      </span>
                    }
                    id="user-dropdown"
                    align="end"
                  >
                    <NavDropdown.Item as={Link} to="/dashboard" onClick={() => handleNavLinkClick()}>
                      Dashboard
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/profile" onClick={() => handleNavLinkClick()}>
                      Profile
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/bookings" onClick={() => handleNavLinkClick()}>
                      My Bookings
                    </NavDropdown.Item>
                    <NavDropdown.Item as={Link} to="/reviews" onClick={() => handleNavLinkClick()}>
                      My Reviews
                    </NavDropdown.Item>
                    
                    {/* Admin Links */}
                    {(user.role === 'admin' || user.role === 'staff') && (
                      <>
                        <NavDropdown.Divider />
                        <NavDropdown.Item as={Link} to="/admin" onClick={() => handleNavLinkClick()}>
                          Admin Panel
                        </NavDropdown.Item>
                        {user.role === 'admin' && (
                          <NavDropdown.Item as={Link} to="/admin/reports" onClick={() => handleNavLinkClick()}>
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
                    className="d-flex align-items-center fw-medium"
                    onClick={() => handleNavLinkClick()}
                  >
                    <LogIn size={16} className="me-1" />
                    Login
                  </Button>
                  <Button 
                    as={Link as any} 
                    to="/register" 
                    variant="primary" 
                    size="sm"
                    className="d-flex align-items-center fw-medium"
                    onClick={() => handleNavLinkClick()}
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
      
      {/* Mobile overlay */}
      <div 
        className={`navbar-overlay ${expanded ? 'show' : ''}`}
        onClick={handleToggle}
        aria-label="Close menu overlay"
        style={{ pointerEvents: expanded ? 'auto' : 'none' }}
      />
    </>
  );
};

export default Header;
