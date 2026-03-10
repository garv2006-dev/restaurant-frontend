import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaSignInAlt } from 'react-icons/fa';

import { useAuth } from '../context/AuthContext';
import { LoginCredentials } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { GoogleLoginButton } from '../components/common/GoogleLoginButton';
import '../styles/dark-mode-buttons.css';

// Create a wrapper component for FontAwesome icons to ensure React 19 compatibility
const IconWrapper = ({ icon: Icon, className, ...props }: { icon: any; className?: string }) => {
  return <Icon className={className} {...props} />;
};

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { login, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const defaultPath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      const fromState = (location.state as any)?.from;
      const from = fromState
        ? (fromState.pathname + (fromState.search || ''))
        : defaultPath;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location, user]);

  const validateField = (name: string, value: string) => {
    let error: string | undefined;

    switch (name) {
      case 'email':
        if (!value) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email address';
        break;
      case 'password':
        if (!value) error = 'Password is required';
        else if (value.length < 6) error = 'Password must be at least 6 characters';
        break;
    }
    return error;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    const emailError = validateField('email', credentials.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validateField('password', credentials.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: false }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));

    // Only validate if already touched to avoid aggressive errors while typing
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true
    });

    if (!validateForm()) return;

    try {
      const success = await login(credentials);
      if (!success) {
        // The error is likely already toasted by AuthContext, 
        // but we'll set a generic one here for the inline box.
        setServerError('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--bs-body-bg)' }}>
      <Container className="py-5">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0 rounded-3">
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <h2 className="text-primary mb-2 fw-bold">Welcome Back</h2>
                  <p className="text-muted">Sign in to your account</p>
                </div>

                {serverError && (
                  <div className="animate-fade-in" style={{
                    backgroundColor: '#fff5f5',
                    border: '1px solid #feb2b2',
                    borderLeft: '4px solid #f56565',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#c53030',
                    fontSize: '14px',
                    position: 'relative'
                  }}>
                    {/* Icon removed */}
                    <span style={{ fontWeight: 500 }}>{serverError}</span>
                    <button
                      onClick={() => setServerError(null)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#c53030',
                        opacity: 0.6,
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="mb-3">
                  <GoogleLoginButton />
                </div>

                <div className="position-relative mb-4">
                  <hr />
                  <span className="position-absolute top-50 start-50 translate-middle px-3 text-muted small" style={{ backgroundColor: 'var(--bs-body-bg)' }}>
                    OR
                  </span>
                </div>

                <Form onSubmit={handleSubmit}>
                  {/* Email Field */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold" style={{ fontSize: '14px', color: '#1a202c' }}>Email Address</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="email"
                        name="email"
                        value={credentials.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onFocus={handleFocus}
                        placeholder="Enter your email"
                        isInvalid={touched.email && !!errors.email}
                        autoComplete="email"
                        className="py-2.5 px-3"
                        style={{
                          borderRadius: '8px',
                          border: touched.email && errors.email ? '1px solid #f56565' : '1px solid #e2e8f0',
                          backgroundColor: '#fff'
                        }}
                      />
                      {/* Triangle icon removed */}
                    </div>
                    {touched.email && errors.email && (
                      <div className="text-danger mt-1" style={{ fontSize: '12px', fontWeight: 500 }}>
                        {errors.email}
                      </div>
                    )}
                  </Form.Group>

                  {/* Password Field */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold" style={{ fontSize: '14px', color: '#1a202c' }}>Password</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={credentials.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onFocus={handleFocus}
                        placeholder="Enter your password"
                        isInvalid={touched.password && !!errors.password}
                        autoComplete="current-password"
                        className="py-2.5 px-3"
                        style={{
                          borderRadius: '8px',
                          border: touched.password && errors.password ? '1px solid #f56565' : '1px solid #e2e8f0',
                          backgroundColor: '#fff'
                        }}
                      />
                      <div className="position-absolute end-0 top-50 translate-middle-y d-flex align-items-center" style={{ paddingRight: '12px' }}>
                        {/* Triangle icon removed */}
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 border-0 text-muted"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ boxShadow: 'none' }}
                        >
                          {showPassword ? <IconWrapper icon={FaEyeSlash} /> : <IconWrapper icon={FaEye} />}
                        </Button>
                      </div>
                    </div>
                    {touched.password && errors.password && (
                      <div className="text-danger mt-1" style={{ fontSize: '12px', fontWeight: 500 }}>
                        {errors.password}
                      </div>
                    )}
                  </Form.Group>

                  {/* Remember Me & Forgot Password */}
                  <Row className="mb-4">
                    <Col>
                      <Form.Check
                        type="checkbox"
                        id="remember-me"
                        label="Remember me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                    </Col>
                    <Col className="text-end">
                      <Link to="/forgot-password" className="text-decoration-none">
                        Forgot Password?
                      </Link>
                    </Col>
                  </Row>

                  {/* Submit Button */}
                  <div className="d-grid">
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
                          <IconWrapper icon={FaSignInAlt} className="me-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </div>
                </Form>

                <hr className="my-4" />

                {/* Sign Up Link */}
                <div className="text-center">
                  <span className="text-muted">Don't have an account? </span>
                  <Link to="/register" className="text-decoration-none fw-semibold text-primary">
                    Create Account
                  </Link>
                </div>

                {/* Email Verification Alert */}
                <Alert variant="info" className="mt-3 small">
                  <strong>Note:</strong> Please verify your email address after registration to access all features.
                </Alert>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;