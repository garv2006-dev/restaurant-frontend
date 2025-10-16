import React, { useState } from 'react';
import { Button, Col, Container, Form, Nav, Row } from 'react-bootstrap';
import { FaClock, FaEnvelope, FaFacebook, FaInstagram, FaLinkedin, FaMapMarkerAlt, FaPhone, FaTwitter } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { newsletterAPI } from '../../services/api';

// Create a wrapper component for FontAwesome icons to ensure React 19 compatibility
const IconWrapper = ({ icon: Icon, className, ...props }: { icon: any; className?: string }) => {
  return <Icon className={className} {...props} />;
};

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setSubscribing(true);
    try {
      const response = await newsletterAPI.subscribe(email);
      if (response.success) {
        toast.success('Successfully subscribed to newsletter!');
        setEmail('');
      } else {
        toast.error(response.message || 'Subscription failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Subscription failed');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-dark text-light py-5 mt-5">
      <Container>
        <Row>
          {/* Restaurant Info */}
          <Col md={3} className="mb-4">
            <h5 className="text-gold fw-bold mb-3">Luxury Restaurant</h5>
            <p className="footer-link">
              Experience the finest dining and accommodation with our luxury rooms and world-class service.
            </p>
            
            {/* Social Media Links */}
            <div className="d-flex gap-3 mt-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <IconWrapper icon={FaFacebook} className="social-icon" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <IconWrapper icon={FaTwitter} className="social-icon" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <IconWrapper icon={FaInstagram} className="social-icon" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <IconWrapper icon={FaLinkedin} className="social-icon" />
              </a>
            </div>
          </Col>

          {/* Quick Links */}
          <Col md={2} className="mb-4">
            <h6 className="text-gold text-uppercase mb-3 fw-bold">Quick Links</h6>
            <Nav className="flex-column">
              <Nav.Link as={Link} to="/" className="footer-link p-0 mb-2">
                Home
              </Nav.Link>
              <Nav.Link as={Link} to="/rooms" className="footer-link p-0 mb-2">
                Rooms
              </Nav.Link>
              <Nav.Link as={Link} to="/menu" className="footer-link p-0 mb-2">
                Menu
              </Nav.Link>
              <Nav.Link as={Link} to="/booking" className="footer-link p-0 mb-2">
                Booking
              </Nav.Link>
              <Nav.Link as={Link} to="/contact" className="footer-link p-0 mb-2">
                Contact
              </Nav.Link>
              <Nav.Link as={Link} to="/gallery" className="footer-link p-0 mb-2">
                Gallery
              </Nav.Link>
            </Nav>
          </Col>

          {/* Services */}
          <Col md={2} className="mb-4">
            <h6 className="text-gold text-uppercase mb-3 fw-bold">Services</h6>
            <Nav className="flex-column">
              <Nav.Link href="#" className="footer-link p-0 mb-2">
                Room Service
              </Nav.Link>
              <Nav.Link href="#" className="footer-link p-0 mb-2">
                Laundry
              </Nav.Link>
              <Nav.Link href="#" className="footer-link p-0 mb-2 ">
                Airport Pickup
              </Nav.Link>
              <Nav.Link href="#" className="footer-link p-0 mb-2">
                Event Hosting
              </Nav.Link>
              <Nav.Link href="#" className="footer-link p-0 mb-2">
                Spa & Wellness
              </Nav.Link>
              <Nav.Link href="#" className="footer-link p-0 mb-2">
                Business Center
              </Nav.Link>
            </Nav>
          </Col>

          {/* Contact Info */}
          <Col md={2} className="mb-4">
            <h6 className="text-gold text-uppercase mb-3 fw-bold">Contact Info</h6>
            <div className="text-light opacity-75 small">
              <div className="mb-2">
                <IconWrapper icon={FaMapMarkerAlt} className="me-2" />
                123 Luxury Street<br />
                <span className="ms-3">City, State 12345</span>
              </div>
              <div className="mb-2">
                <IconWrapper icon={FaPhone} className="me-2" />
                +1 (555) 123-4567
              </div>
              <div className="mb-2">
                <IconWrapper icon={FaEnvelope} className="me-2" />
                info@luxuryrestaurant.com
              </div>
              <div className="mb-2">
                <IconWrapper icon={FaClock} className="me-2" />
                Open 24/7
              </div>
            </div>
          </Col>

          {/* Newsletter */}
          <Col md={3} className="mb-4">
            <h6 className="text-gold text-uppercase mb-3 fw-bold">Newsletter</h6>
            <p className="text-light opacity-75 small mb-3">
              Subscribe to get special offers and updates.
            </p>
            <Form onSubmit={handleNewsletterSubscribe}>
              <Form.Group className="mb-2">
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  size="sm"
                />
              </Form.Group>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={subscribing}
                className="w-100"
              >
                {subscribing ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </Form>
          </Col>
        </Row>

        <hr className="my-4" />

        {/* Bottom Footer */}
        <Row className="align-items-center">
          <Col md={6}>
            <p className="footer-link small mb-0">
              &copy; {new Date().getFullYear()} Luxury Restaurant. All rights reserved.
            </p>
          </Col>
          <Col md={6}>
            <Nav className="justify-content-md-end">
              <Nav.Link as={Link} to="/privacy" className="footer-link small p-1">
                Privacy Policy
              </Nav.Link>
              <Nav.Link as={Link} to="/terms" className="footer-link small p-1">
                Terms & Conditions
              </Nav.Link>
              <Nav.Link as={Link} to="/faq" className="footer-link small p-1">
                FAQ
              </Nav.Link>
              <Nav.Link as={Link} to="/help" className="footer-link small p-1">
                Help
              </Nav.Link>
            </Nav>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;