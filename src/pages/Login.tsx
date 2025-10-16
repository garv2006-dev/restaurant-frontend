import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaSignInAlt, FaGoogle, FaFacebook } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { LoginCredentials } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';

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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [userType, setUserType] = useState<'admin' | 'user'>('user');
  
  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!credentials.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!credentials.password) {
      newErrors.password = 'Password is required';
    } else if (credentials.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof LoginCredentials]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const success = await login(credentials, userType);
    if (success) {
      // AuthContext handles the redirect based on userType
      // Admin users go to /admin/dashboard, regular users go to /dashboard
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="text-primary mb-2">Welcome Back</h2>
                <p className="text-muted">Sign in to your account</p>
              </div>

              {/* Social Login Buttons */}
              <div className="d-grid gap-2 mb-4">
                <Button variant="outline-danger" size="sm">
                  <IconWrapper icon={FaGoogle} className="me-2" />
                  Continue with Google
                </Button>
                <Button variant="outline-primary" size="sm">
                  <IconWrapper icon={FaFacebook} className="me-2" />
                  Continue with Facebook
                </Button>
              </div>

              <div className="position-relative mb-4">
                <hr />
                <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">
                  OR
                </span>
              </div>

              <Form onSubmit={handleSubmit}>
                {/* User Type Selection */}
                <Form.Group className="mb-3">
                  <Form.Label>Login As</Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Check
                      type="radio"
                      id="user-login"
                      name="userType"
                      label="Customer"
                      value="user"
                      checked={userType === 'user'}
                      onChange={() => setUserType('user')}
                    />
                    <Form.Check
                      type="radio"
                      id="admin-login"
                      name="userType"
                      label="Administrator"
                      value="admin"
                      checked={userType === 'admin'}
                      onChange={() => setUserType('admin')}
                    />
                  </div>
                </Form.Group>

                {/* Email Field */}
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={credentials.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    isInvalid={!!errors.email}
                    autoComplete="email"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                {/* Password Field */}
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={credentials.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      isInvalid={!!errors.password}
                      autoComplete="current-password"
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
                  <Form.Control.Feedback type="invalid">
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
                    className="d-flex align-items-center justify-content-center"
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
                <Link to="/register" className="text-decoration-none">
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
  );
};

export default Login;