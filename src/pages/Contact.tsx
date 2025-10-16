import { Clock, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import React, { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState<Partial<ContactForm>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof ContactForm]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ContactForm> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Contact form submitted:', formData);
      
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: <MapPin size={24} className="text-primary" />,
      title: 'Address',
      details: [
        '123 Luxury Street',
        'Premium District',
        'Mumbai, Maharashtra 400001',
        'India'
      ]
    },
    {
      icon: <Phone size={24} className="text-primary" />,
      title: 'Phone',
      details: [
        '+91 (22) 1234-5678',
        '+91 (22) 8765-4321',
        'Toll Free: 1800-123-456'
      ]
    },
    {
      icon: <Mail size={24} className="text-primary" />,
      title: 'Email',
      details: [
        'info@luxuryrestaurant.com',
        'bookings@luxuryrestaurant.com',
        'support@luxuryrestaurant.com'
      ]
    },
    {
      icon: <Clock size={24} className="text-primary" />,
      title: 'Working Hours',
      details: [
        'Monday - Friday: 9:00 AM - 11:00 PM',
        'Saturday - Sunday: 8:00 AM - 12:00 AM',
        'Reception: 24/7 Available'
      ]
    }
  ];

  const subjects = [
    'General Inquiry',
    'Room Booking',
    'Event Planning',
    'Catering Services',
    'Complaint',
    'Feedback',
    'Career Opportunities',
    'Other'
  ];

  return (
    <Container className="py-5">
      {/* Header */}
      <Row className="mb-5">
        <Col>
          <div className="text-center">
            <h1 className="display-4 mb-3">Get In Touch</h1>
            <p className="lead text-muted">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
          </div>
        </Col>
      </Row>

      <Row>
        {/* Contact Information */}
        <Col lg={4} className="mb-5">
          <h3 className="mb-4">Contact Information</h3>
          
          {contactInfo.map((info, index) => (
            <Card key={index} className="mb-3 border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex align-items-start">
                  <div className="me-3">
                    {info.icon}
                  </div>
                  <div>
                    <h6 className="mb-2">{info.title}</h6>
                    {info.details.map((detail, idx) => (
                      <p key={idx} className="text-muted small mb-1">{detail}</p>
                    ))}
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}

          {/* Social Media */}
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h6 className="mb-3">Follow Us</h6>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" size="sm" className="rounded-circle">
                  F
                </Button>
                <Button variant="outline-info" size="sm" className="rounded-circle">
                  T
                </Button>
                <Button variant="outline-danger" size="sm" className="rounded-circle">
                  I
                </Button>
                <Button variant="outline-primary" size="sm" className="rounded-circle">
                  L
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Contact Form */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-4">
              <h4 className="mb-0 d-flex align-items-center">
                <MessageSquare size={20} className="me-2 text-primary" />
                Send us a Message
              </h4>
            </Card.Header>
            <Card.Body className="p-4">
              {success && (
                <Alert variant="success" className="mb-4">
                  <strong>Thank you!</strong> Your message has been sent successfully. We'll get back to you within 24 hours.
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Full Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        isInvalid={!!errors.name}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Email Address *</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email address"
                        isInvalid={!!errors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Phone Number *</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                        isInvalid={!!errors.phone}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.phone}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6} className="mb-3">
                    <Form.Group>
                      <Form.Label>Subject *</Form.Label>
                      <Form.Select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        isInvalid={!!errors.subject}
                      >
                        <option value="">Choose a subject</option>
                        {subjects.map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">
                        {errors.subject}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-4">
                  <Form.Label>Message *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please describe your inquiry in detail..."
                    isInvalid={!!errors.message}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.message}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Minimum 10 characters required
                  </Form.Text>
                </Form.Group>

                <div className="d-grid">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="lg"
                    disabled={loading}
                    className="d-flex align-items-center justify-content-center"
                  >
                    {loading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} className="me-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Map Section */}
      <Row className="mt-5">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-4">
              <h4 className="mb-0 d-flex align-items-center">
                <MapPin size={20} className="me-2 text-primary" />
                Find Us
              </h4>
            </Card.Header>
            <Card.Body className="p-0">
              <div 
                className="bg-light d-flex align-items-center justify-content-center text-muted"
                style={{ height: '300px' }}
              >
                <div className="text-center">
                  <MapPin size={48} className="mb-3" />
                  <h5>Interactive Map</h5>
                  <p className="mb-0">Google Maps integration would be implemented here</p>
                  <small className="text-muted">123 Luxury Street, Premium District, Mumbai</small>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* FAQ Section */}
      <Row className="mt-5">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-4">
              <h4 className="mb-0">Frequently Asked Questions</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h6>What are your check-in/check-out times?</h6>
                  <p className="text-muted small mb-3">Check-in: 3:00 PM | Check-out: 12:00 PM</p>
                  
                  <h6>Do you provide airport transportation?</h6>
                  <p className="text-muted small mb-3">Yes, we provide complimentary airport shuttle service for our guests.</p>
                </Col>
                <Col md={6}>
                  <h6>Is parking available?</h6>
                  <p className="text-muted small mb-3">Yes, we offer free parking for all our guests.</p>
                  
                  <h6>Do you allow pets?</h6>
                  <p className="text-muted small mb-3">We are pet-friendly! Additional charges may apply.</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Contact;