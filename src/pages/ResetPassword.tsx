import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { FaLock, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Create a wrapper component for FontAwesome icons to ensure React 19 compatibility
const IconWrapper = ({ icon: Icon, className, size, ...props }: { icon: any; className?: string; size?: number }) => {
  return <Icon className={className} size={size} {...props} />;
};

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Partial<ResetPasswordFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('Invalid reset link. No token provided.');
    }
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ResetPasswordFormData> = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof ResetPasswordFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setTokenError('Invalid reset link');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      const success = await resetPassword(token, formData.password);
      if (success) {
        setSuccess(true);
      }
    } catch (error: any) {
      setTokenError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  if (tokenError) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0 rounded-3">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                      <IconWrapper icon={FaLock} className="text-danger" size={24} />
                    </div>
                  </div>
                  <h3 className="text-danger mb-2">Invalid Reset Link</h3>
                  <p className="text-muted">{tokenError}</p>
                </div>

                <Alert variant="warning" className="mb-3">
                  <strong>What to do next:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Go back to the login page</li>
                    <li>Click "Forgot Password?" again</li>
                    <li>Enter your email to receive a new reset link</li>
                  </ul>
                </Alert>

                <div className="d-grid">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleBackToLogin}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <IconWrapper icon={FaArrowLeft} className="me-2" />
                    Back to Login
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (success) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0 rounded-3">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                      <IconWrapper icon={FaCheckCircle} className="text-success" size={24} />
                    </div>
                  </div>
                  <h3 className="text-success mb-2">Password Reset Successful!</h3>
                  <p className="text-muted">
                    Your password has been successfully reset. You can now log in with your new password.
                  </p>
                </div>

                <div className="d-grid">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleBackToLogin}
                    className="d-flex align-items-center justify-content-center py-3"
                  >
                    <IconWrapper icon={FaLock} className="me-2" />
                    Go to Login
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0 rounded-3">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px' }}>
                      <IconWrapper icon={FaLock} className="text-primary" size={24} />
                    </div>
                  </div>
                  <h2 className="text-primary mb-2 fw-bold">Reset Password</h2>
                  <p className="text-muted">Enter your new password below</p>
                </div>

                <Form onSubmit={handleSubmit}>
                  {/* New Password Field */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">New Password</Form.Label>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your new password"
                      isInvalid={!!errors.password}
                      autoComplete="new-password"
                      className="py-2"
                      disabled={loading}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                    <Form.Text className="d-block mt-1 small text-muted">
                      Must be at least 6 characters with uppercase, lowercase, and numbers
                    </Form.Text>
                  </Form.Group>

                  {/* Confirm Password Field */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Confirm Password</Form.Label>
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      isInvalid={!!errors.confirmPassword}
                      autoComplete="new-password"
                      className="py-2"
                      disabled={loading}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Show Password Checkboxes */}
                  <div className="mb-4">
                    <Form.Check
                      type="checkbox"
                      id="show-password"
                      label="Show password"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="small"
                    />
                    <Form.Check
                      type="checkbox"
                      id="show-confirm-password"
                      label="Show confirm password"
                      checked={showConfirmPassword}
                      onChange={(e) => setShowConfirmPassword(e.target.checked)}
                      className="small"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="d-grid mb-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={loading}
                      className="d-flex align-items-center justify-content-center py-3 fw-semibold"
                    >
                      {loading ? (
                        <LoadingSpinner size="sm" message="" />
                      ) : (
                        <>
                          <IconWrapper icon={FaLock} className="me-2" />
                          Reset Password
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

                <Alert variant="info" className="mt-3 small mb-0">
                  <strong>Security Tip:</strong> Never share your password with anyone. We will never ask for it via email.
                </Alert>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ResetPassword;
