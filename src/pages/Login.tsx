import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaSignInAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { LoginCredentials } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import SocialLogin from '../components/auth/SocialLogin';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../config/firebase';

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
  const [socialError, setSocialError] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const { login, loading, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const defaultPath = user?.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      const from = (location.state as any)?.from?.pathname || defaultPath;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location, user]);

  // Check for password reset code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const mode = urlParams.get('mode');
    const oobCode = urlParams.get('oobCode');
    
    if (mode === 'resetPassword' && oobCode) {
      setIsResetMode(true);
      setResetCode(oobCode);
    }
  }, [location.search]);

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

    const success = await login(credentials);
    if (success) {
      // AuthContext handles the redirect based on user role
      // Admin users go to /admin/dashboard, regular users go to /dashboard
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetCode) {
      setResetError('Invalid reset code');
      return;
    }
    
    if (!newPassword || !confirmPassword) {
      setResetError('Please enter both password fields');
      return;
    }
    
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }
    
    try {
      // Verify the reset code
      const email = await verifyPasswordResetCode(auth, resetCode);
      
      // Confirm the password reset
      await confirmPasswordReset(auth, resetCode, newPassword);
      
      setResetSuccess(true);
      setResetError(null);
      
      // After 3 seconds, switch back to login mode
      setTimeout(() => {
        setIsResetMode(false);
        setResetCode(null);
        setNewPassword('');
        setConfirmPassword('');
        setResetSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      setResetError(error.message || 'Failed to reset password');
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5} xl={4}>
          <Card className="shadow-sm border-0">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="text-primary mb-2">
                  {isResetMode ? 'Reset Password' : 'Welcome Back'}
                </h2>
                <p className="text-muted">
                  {isResetMode ? 'Enter your new password below' : 'Sign in to your account'}
                </p>
              </div>

              {resetSuccess && (
                <Alert variant="success" className="mb-3">
                  Password reset successful! Redirecting to login...
                </Alert>
              )}

              {resetError && (
                <Alert variant="danger" className="mb-3">
                  {resetError}
                </Alert>
              )}

              {!isResetMode ? (
                <>
                  {/* Social Login */}
                  {socialError && (
                    <Alert variant="danger" className="mb-3">
                      {socialError}
                    </Alert>
                  )}
                  <SocialLogin 
                    onSuccess={(user, token) => {
                      setSocialError(null);
                      // The AuthContext will handle the redirect
                    }}
                    onError={(message) => {
                      setSocialError(message);
                    }}
                    loading={loading}
                    setLoading={(loading) => {
                      // You can add loading state handling here if needed
                    }}
                  />

                  <div className="position-relative mb-4">
                    <hr />
                    <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">
                      OR
                    </span>
                  </div>

                  <Form onSubmit={handleSubmit}>
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
                </>
              ) : (
                /* Password Reset Form */
                <Form onSubmit={handlePasswordReset}>
                  <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      autoComplete="new-password"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Confirm New Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      autoComplete="new-password"
                    />
                  </Form.Group>
                  
                  <div className="d-grid mb-3">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={resetSuccess}
                      className="d-flex align-items-center justify-content-center"
                    >
                      {resetSuccess ? (
                        <LoadingSpinner size="sm" message="" />
                      ) : (
                        <>
                          <IconWrapper icon={FaEyeSlash} className="me-2" />
                          Reset Password
                        </>
                      )}
                    </Button>
                  </div>
                </Form>
              )}

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