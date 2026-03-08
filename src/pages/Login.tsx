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
  const [socialError] = useState<string | null>(null);

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

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true
    });

    if (!validateForm()) return;

    const success = await login(credentials);
    if (success) {
      // AuthContext handles the redirect based on user role
      // Admin users go to /admin/dashboard, regular users go to /dashboard
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

                {socialError && (
                  <Alert variant="danger" className="mb-3">
                    {socialError}
                  </Alert>
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
                    <Form.Label className="fw-semibold">Email Address</Form.Label>
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
                      className="py-2"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Password Field */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Password</Form.Label>
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
                        className="py-2"
                      />
                      <Button
                        variant="link"
                        size="sm"
                        className="position-absolute end-0 top-50 translate-middle-y border-0 text-muted"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ transform: 'translateY(-50%) translateX(-10px)' }}
                      >
                        {showPassword ? <IconWrapper icon={FaEyeSlash} /> : <IconWrapper icon={FaEye} />}
                      </Button>
                    </div>
                    <Form.Control.Feedback type="invalid" className={touched.password && errors.password ? 'd-block' : ''}>
                      {errors.password}
                    </Form.Control.Feedback>
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