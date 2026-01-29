import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/dark-mode-buttons.css';

// Create a wrapper component for FontAwesome icons to ensure React 19 compatibility
const IconWrapper = ({ icon: Icon, className, size, ...props }: { icon: any; className?: string; size?: number }) => {
  return <Icon className={className} size={size} {...props} />;
};

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (value: string) => {
    if (!value) return 'Please enter your email address';
    if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email address';
    return null;
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validateEmail(email));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (touched) {
      setError(validateEmail(val));
    }
  };

  const handleFocus = () => {
    setTouched(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched(true);
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const success = await forgotPassword(email);
      if (success) {
        // Navigate to verify code page
        navigate('/verify-code', { state: { email } });
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
      <div className="min-vh-100" style={{ backgroundColor: 'var(--bs-body-bg)' }}>
        <Container className="py-5">
          <Row className="justify-content-center align-items-center min-vh-100">
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
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--bs-body-bg)' }}>
      <Container className="py-5">
        <Row className="justify-content-center align-items-center min-vh-100">
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
                      onChange={handleChange}
                      onBlur={handleBlur}
                      onFocus={handleFocus}
                      placeholder="Enter your email"
                      required
                      isInvalid={touched && !!error}
                      disabled={loading}
                      autoComplete="email"
                    />
                    <Form.Control.Feedback type="invalid">
                      {error}
                    </Form.Control.Feedback>
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
    </div>
  );
};

export default ForgotPassword;
