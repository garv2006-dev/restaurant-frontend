import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Phone, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RegisterData } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/dark-mode-buttons.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterData & { confirmPassword: string; terms: string }>>({});

  const { register, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterData & { confirmPassword: string; terms: string }> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 128) {
      newErrors.password = 'Password must be less than 128 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms validation
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    // Normalize phone like backend expects (digits or +digits, no spaces/dashes)
    if (name === 'phone') {
      value = value.replace(/\s|-/g, '');
    }

    if (name === 'password') {
      // Prevent leading/trailing spaces from accidentally failing validation
      value = value.replace(/^\s+|\s+$/g, '');
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Live field validation to clear/set specific errors promptly
    setErrors(prev => {
      const updated = { ...prev };

      if (name === 'name') {
        const n = value.trim();
        updated.name = !n
          ? 'Full name is required'
          : n.length < 2
            ? 'Name must be at least 2 characters'
            : n.length > 50
              ? 'Name must be less than 50 characters'
              : undefined;
      }

      if (name === 'email') {
        updated.email = !value
          ? 'Email is required'
          : /\S+@\S+\.\S+/.test(value)
            ? undefined
            : 'Please enter a valid email address';
      }

      if (name === 'phone') {
        const phoneOk = /^\+?[1-9]\d{0,15}$/.test(value);
        updated.phone = !value ? 'Phone number is required' : phoneOk ? undefined : 'Please enter a valid phone number';
      }

      if (name === 'password') {
        const pwd = value;
        let msg: string | undefined = undefined;
        if (!pwd) msg = 'Password is required';
        else if (pwd.length < 6) msg = 'Password must be at least 6 characters';
        else if (pwd.length > 128) msg = 'Password must be less than 128 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)) msg = 'Password must contain uppercase, lowercase, and number';
        updated.password = msg;

        // If confirm already filled, revalidate match
        if (confirmPassword) {
          updated.confirmPassword = confirmPassword === pwd ? undefined : 'Passwords do not match';
        }
      }

      return updated;
    });
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);

    // Live validation for match with current password
    setErrors(prev => ({
      ...prev,
      confirmPassword: !val
        ? 'Please confirm your password'
        : val === formData.password
          ? undefined
          : 'Passwords do not match',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const success = await register(formData);
    if (success) {
      navigate('/dashboard');
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string; width: number } => {
    if (password.length === 0) return { strength: '', color: '', width: 0 };

    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z\d]/.test(password)) score += 1;

    const meetsRequired = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);

    if (score <= 2) return { strength: 'Weak', color: 'danger', width: 33 };
    if (!meetsRequired || score <= 4) return { strength: 'Medium', color: 'warning', width: 66 };
    return { strength: 'Strong', color: 'success', width: 100 };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-vh-100" style={{ backgroundColor: 'var(--bs-body-bg)' }}>
      <Container className="py-5">
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col md={8} lg={6} xl={5}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <h2 className="text-primary mb-2">Create Account</h2>
                  <p className="text-muted">Join us for an amazing dining and stay experience</p>
                </div>

                <Form onSubmit={handleSubmit}>
                  {/* Full Name Field */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <User size={16} className="me-1" />
                      Full Name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      isInvalid={!!errors.name}
                      autoComplete="name"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.name}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Email Field */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <Mail size={16} className="me-1" />
                      Email Address
                    </Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      isInvalid={!!errors.email}
                      autoComplete="email"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Phone Field */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <Phone size={16} className="me-1" />
                      Phone Number
                    </Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter your phone number"
                      isInvalid={!!errors.phone}
                      autoComplete="tel"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.phone}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      We'll use this for booking confirmations and important updates
                    </Form.Text>
                  </Form.Group>

                  {/* Password Field */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <Lock size={16} className="me-1" />
                      Password
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a strong password"
                        isInvalid={!!errors.password}
                        autoComplete="new-password"
                      />
                      <Button
                        variant="link"
                        size="sm"
                        className="position-absolute end-0 top-50 translate-middle-y border-0 text-muted"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ transform: 'translateY(-50%) translateX(-10px)' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>

                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="mt-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted">Password strength:</small>
                          <small className={`text-${passwordStrength.color}`}>
                            {passwordStrength.strength}
                          </small>
                        </div>
                        <div className="progress" style={{ height: '4px' }}>
                          <div
                            className={`progress-bar bg-${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.width}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </Form.Group>

                  {/* Confirm Password Field */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <Lock size={16} className="me-1" />
                      Confirm Password
                    </Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        placeholder="Confirm your password"
                        isInvalid={!!errors.confirmPassword}
                        autoComplete="new-password"
                      />
                      <Button
                        variant="link"
                        size="sm"
                        className="position-absolute end-0 top-50 translate-middle-y border-0 text-muted"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{ transform: 'translateY(-50%) translateX(-10px)' }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                    <Form.Control.Feedback type="invalid">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  {/* Terms and Conditions */}
                  <Form.Group className="mb-4">
                    <Form.Check
                      type="checkbox"
                      id="agree-terms"
                      checked={agreeToTerms}
                      onChange={(e) => {
                        setAgreeToTerms(e.target.checked);
                        if (errors.terms) {
                          setErrors(prev => ({ ...prev, terms: undefined }));
                        }
                      }}
                      isInvalid={!!errors.terms}
                      label={
                        <span>
                          I agree to the{' '}
                          <Link to="/terms" className="text-decoration-none" target="_blank">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link to="/privacy" className="text-decoration-none" target="_blank">
                            Privacy Policy
                          </Link>
                        </span>
                      }
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.terms}
                    </Form.Control.Feedback>
                  </Form.Group>

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
                          <User size={16} className="me-2" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </div>
                </Form>

                <hr className="my-4" />

                {/* Sign In Link */}
                <div className="text-center">
                  <span className="text-muted">Already have an account? </span>
                  <Link to="/login" className="text-decoration-none">
                    Sign In
                  </Link>
                </div>

                {/* Additional Information */}
                <Alert variant="info" className="mt-3 small">
                  <strong>What happens next?</strong>
                  <ul className="mb-0 mt-2">
                    <li>We'll send a verification email to confirm your account</li>
                    <li>You'll gain access to our exclusive booking platform</li>
                    <li>Enjoy premium amenities and services</li>
                    <li>Receive special offers and early access to new amenities</li>
                  </ul>
                </Alert>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Register;