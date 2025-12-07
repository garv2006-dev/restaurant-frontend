import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Create a wrapper component for FontAwesome icons to ensure React 19 compatibility
const IconWrapper = ({ icon: Icon, className, size, ...props }: { icon: any; className?: string; size?: number }) => {
  return <Icon className={className} size={size} {...props} />;
};

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const success = await forgotPassword(email);
      if (success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (success) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                      <IconWrapper icon={FaEnvelope} className="text-success" size={24} />
                    </div>
                  </div>
                  <h3 className="text-success mb-2">Reset Email Sent!</h3>
                  <p className="text-muted">
                    We've sent a password reset link to your email address. 
                    Please check your inbox and follow the instructions to reset your password.
                  </p>
                </div>

                <div className="d-grid">
                  <Button
                    variant="outline-primary"
                    size="lg"
                    onClick={handleBackToLogin}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <IconWrapper icon={FaArrowLeft} className="me-2" />
                    Back to Login
                  </Button>
                </div>

                <Alert variant="info" className="mt-3 small">
                  <strong>Note:</strong> If you don't receive the email within a few minutes, 
                  please check your spam folder.
                </Alert>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <div className="mb-3">
                  <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                    <IconWrapper icon={FaEnvelope} className="text-primary" size={24} />
                  </div>
                </div>
                <h2 className="text-primary mb-2">Forgot Password</h2>
                <p className="text-muted">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-3">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-4">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </Form.Group>
                
                <div className="d-grid mb-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading}
                    className="d-flex align-items-center justify-content-center"
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" message="" />
                    ) : (
                      <>
                        <IconWrapper icon={FaEnvelope} className="me-2" />
                        Send Reset Email
                      </>
                    )}
                  </Button>
                </div>
              </Form>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleBackToLogin}
                  disabled={loading}
                  className="text-decoration-none"
                >
                  <IconWrapper icon={FaArrowLeft} className="me-1" />
                  Back to Login
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPassword;
