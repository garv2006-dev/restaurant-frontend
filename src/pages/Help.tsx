import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaPhone, FaEnvelope, FaClock, FaMapMarkerAlt, FaHeadset, FaBook, FaTools, FaQuestionCircle } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

// Icon wrapper component
const IconWrapper = ({ icon: Icon, className, size }: { icon: any; className?: string; size?: number }) => (
  <Icon className={className} size={size} />
);

const Help: React.FC = () => {
  const { theme } = useTheme();
  const helpCategories = [
    {
      icon: <IconWrapper icon={FaBook} className="text-gold" size={24} />,
      title: "User Guides",
      description: "Step-by-step guides for booking, check-in, and using our services",
      items: [
        "How to make a reservation",
        "Online check-in process",
        "Room service ordering",
        "Spa booking guide"
      ]
    },
    {
      icon: <IconWrapper icon={FaTools} className="text-gold" size={24} />,
      title: "Technical Support",
      description: "Get help with website issues, app problems, and online services",
      items: [
        "Website troubleshooting",
        "Mobile app support",
        "Payment issues",
        "Account management"
      ]
    },
    {
      icon: <IconWrapper icon={FaQuestionCircle} className="text-gold" size={24} />,
      title: "Common Issues",
      description: "Quick solutions to frequently encountered problems",
      items: [
        "Booking modifications",
        "Cancellation requests",
        "Refund inquiries",
        "Lost and found"
      ]
    }
  ];

  const contactMethods = [
    {
      icon: <IconWrapper icon={FaPhone} className="text-gold" size={20} />,
      title: "Phone Support",
      info: "+1 (555) 123-4567",
      description: "Available 24/7 for immediate assistance",
      action: "Call Now"
    },
    {
      icon: <IconWrapper icon={FaEnvelope} className="text-gold" size={20} />,
      title: "Email Support",
      info: "support@luxuryhotel.com",
      description: "Response within 24 hours",
      action: "Send Email"
    },
    {
      icon: <IconWrapper icon={FaHeadset} className="text-gold" size={20} />,
      title: "Live Chat",
      info: "Available on our website",
      description: "Instant help during business hours",
      action: "Start Chat"
    }
  ];

  const quickLinks = [
    { title: "Booking Guide", href: "/booking" },
    { title: "Cancellation Policy", href: "/terms" },
    { title: "FAQ", href: "/faq" },
    { title: "Contact Us", href: "/contact" },
    { title: "Privacy Policy", href: "/privacy" },
    { title: "Terms & Conditions", href: "/terms" }
  ];

  return (
    <>
      
      <Container className="py-5">
        <div className="max-content mx-auto">
          <h1 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-4`}>Help & Support</h1>
          
          <p className={theme === 'dark' ? 'text-light' : 'text-dark'} mb-5>
            We're here to help you make the most of your stay at Luxury Hotel. Find answers, get support, and contact our team whenever you need assistance.
          </p>

          {/* Help Categories */}
          <Row className="mb-5">
            {helpCategories.map((category, index) => (
              <Col md={4} key={index} className="mb-4">
                <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : 'bg-white text-dark border-light'}`}>
                  <Card.Body className="p-4">
                    <div className="mb-3">{category.icon}</div>
                    <h4 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>{category.title}</h4>
                    <p className={`${theme === 'dark' ? 'text-light opacity-75' : 'text-dark opacity-75'} mb-3`}>{category.description}</p>
                    <ul className="list-unstyled">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="mb-2">
                          <small className={`${theme === 'dark' ? 'text-light opacity-75' : 'text-dark opacity-75'}`}>• {item}</small>
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Contact Methods */}
          <section className="mb-5">
            <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-4`}>Contact Our Support Team</h2>
            <Row>
              {contactMethods.map((method, index) => (
                <Col md={4} key={index} className="mb-4">
                  <Card className={`h-100 ${theme === 'dark' ? 'bg-dark text-light border-secondary' : 'bg-white text-dark border-light'}`}>
                    <Card.Body className="p-4 text-center">
                      <div className="mb-3">{method.icon}</div>
                      <h4 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-2`}>{method.title}</h4>
                      <p className={theme === 'dark' ? 'text-light mb-2 fw-semibold' : 'text-dark mb-2 fw-semibold'}>{method.info}</p>
                      <p className={theme === 'dark' ? 'text-light opacity-75 small mb-3' : 'text-dark opacity-75 small mb-3'}>{method.description}</p>
                      <Button 
                        variant="outline-light" 
                        size="sm"
                        className="w-100"
                        href={method.title === "Phone Support" ? `tel:+15551234567` : 
                             method.title === "Email Support" ? `mailto:support@luxuryhotel.com` : 
                             "#"}
                      >
                        {method.action}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>

          {/* Office Hours */}
          <section className="mb-5">
            <Card className="bg-dark text-light border-secondary">
              <Card.Body className="p-4">
                <Row>
                  <Col md={6}>
                    <h4 className="text-gold mb-3">
                      <IconWrapper icon={FaClock} className="me-2" />
                      Support Hours
                    </h4>
                    <div className="text-light">
                      <p className="mb-2"><strong>Phone Support:</strong> 24/7</p>
                      <p className="mb-2"><strong>Live Chat:</strong> Mon-Fri 8AM-8PM EST</p>
                      <p className="mb-2"><strong>Email Support:</strong> Response within 24 hours</p>
                      <p className="mb-0"><strong>Front Desk:</strong> 24/7</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <h4 className="text-gold mb-3">
                      <IconWrapper icon={FaMapMarkerAlt} className="me-2" />
                      Visit Us
                    </h4>
                    <div className="text-light">
                      <p className="mb-2">123 Luxury Street</p>
                      <p className="mb-2">City, State 12345</p>
                      <p className="mb-0">Front Desk: +1 (555) 123-4567</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </section>

          {/* Quick Links */}
          <section>
            <h3 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-4`}>Quick Links</h3>
            <Row>
              <Col md={6}>
                <div className="d-flex flex-wrap gap-2">
                  {quickLinks.map((link, index) => (
                    <Button
                      key={index}
                      variant="outline-secondary"
                      size="sm"
                      href={link.href}
                      className="text-light"
                    >
                      {link.title}
                    </Button>
                  ))}
                </div>
              </Col>
            </Row>
          </section>

          {/* Emergency Contact */}
          <section className="mt-5">
            <Card className="bg-danger bg-opacity-10 border-danger">
              <Card.Body className="p-4">
                <h4 className={`${theme === 'dark' ? 'text-danger' : 'text-danger'} mb-3`}>Emergency Assistance</h4>
                <p className={theme === 'dark' ? 'text-light' : 'text-dark'} mb-3>
                  For urgent matters during your stay, please contact our front desk immediately:
                </p>
                <div className="d-flex align-items-center gap-3">
                  <IconWrapper icon={FaPhone} className="text-danger" size={20} />
                  <span className={theme === 'dark' ? 'text-light fw-bold fs-5' : 'text-dark fw-bold fs-5'}>+1 (555) 123-4567</span>
                  <span className={theme === 'dark' ? 'text-light opacity-75' : 'text-dark opacity-75'}>(Available 24/7)</span>
                </div>
              </Card.Body>
            </Card>
          </section>
        </div>
      </Container>

      <style>{`
        .max-content {
          max-width: 1000px;
        }
        
        .text-light {
          color: #e9ecef !important;
        }
        
        .text-dark {
          color: #212529 !important;
        }
        
        .text-gold {
          color: #f39c12 !important;
        }
        
        .text-primary {
          color: #0d6efd !important;
        }
      `}</style>
    </>
  );
};

export default Help;
