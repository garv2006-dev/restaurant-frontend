import React from 'react';
import { Navbar, Nav, NavDropdown, Container, Button, Badge } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Sun, Moon, Bell, LogIn, UserPlus, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { totalQuantity } = useCart();

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
        <Navbar.Brand as={Link} to="/" className="fw-bold fs-4">
          <span className="text-primary">Luxury</span> Restaurant
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          {/* Main Navigation */}
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" className={isActive('/')}>
              Home
            </Nav.Link>
            {/* <Nav.Link as={Link} to="/rooms" className={isActive('/rooms')}>
              Rooms
            </Nav.Link> */}
            <Nav.Link as={Link} to="/menu" className={isActive('/menu')}>
              Menu
            </Nav.Link>
            <Nav.Link as={Link} to="/booking" className={isActive('/booking')}>
              Booking
            </Nav.Link>
            <Nav.Link as={Link} to="/contact" className={isActive('/contact')}>
              Contact
            </Nav.Link>
          </Nav>

          {/* Right Side Navigation */}
          <Nav className="align-items-center">

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
                      {/* {user.loyaltyPoints > 0 && (
                        <Badge bg="warning" text="dark" className="ms-2">
                          {user.loyaltyPoints} pts
                        </Badge>
                      )} */}
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