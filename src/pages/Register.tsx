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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
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

    const nameError = validateField('name', formData.name);
    if (nameError) newErrors.name = nameError;

    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;

    const phoneError = validateField('phone', formData.phone);
    if (phoneError) newErrors.phone = phoneError;

    const passwordError = validateField('password', formData.password);
    if (passwordError) newErrors.password = passwordError;

    const confirmError = validateField('confirmPassword', confirmPassword);
    if (confirmError) newErrors.confirmPassword = confirmError;

    // Terms validation
    if (!agreeToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateField = (name: string, value: string) => {
    let error: string | undefined;

    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Full name is required';
        else if (value.trim().length < 2) error = 'Name must be at least 2 characters';
        else if (value.trim().length > 50) error = 'Name must be less than 50 characters';
        break;
      case 'email':
        if (!value) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Please enter a valid email address';
        break;
      case 'phone':
        // strictly 10 digits
        const phoneRegex = /^[0-9]{10}$/;
        if (!value) error = 'Phone number is required';
        else if (!phoneRegex.test(value.replace(/\s|-/g, ''))) error = 'Phone number must be exactly 10 digits';
        break;
      case 'password':
        if (!value) error = 'Password is required';
        else if (value.length < 6) error = 'Password must be at least 6 characters';
        else if (value.length > 128) error = 'Password must be less than 128 characters';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) error = 'Password must contain uppercase, lowercase, and number';
        break;
      case 'confirmPassword':
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
      case 'terms':
        // Terms validation is boolean based, handled separately or implicitly
        break;
    }
    return error;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    // Special case for password confirm sync
    if (name === 'password' && confirmPassword && touched.confirmPassword) {
      const confirmError = value === confirmPassword ? undefined : 'Passwords do not match';
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    // When focused, mark as untouched so error disappears
    setTouched(prev => ({ ...prev, [name]: false }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    // Normalize phone like backend expects - strictly 10 digits
    if (name === 'phone') {
      value = value.replace(/[^0-9]/g, '').slice(0, 10);
    }

    if (name === 'password') {
      // Prevent leading/trailing spaces from accidentally failing validation
      value = value.replace(/^\s+|\s+$/g, '');
    }

    setFormData(prev => ({
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

    // Special case: If typing in password, update confirm error if it was already touched
    if (name === 'password' && touched.confirmPassword) {
      const confirmError = confirmPassword === value ? undefined : 'Passwords do not match';
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);

    if (touched.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: val === formData.password ? undefined : 'Passwords do not match'
      }));
    }
  };

  const handleConfirmPasswordBlur = () => {
    setTouched(prev => ({ ...prev, confirmPassword: true }));
    setErrors(prev => ({
      ...prev,
      confirmPassword: !confirmPassword
        ? 'Please confirm your password'
        : confirmPassword === formData.password ? undefined : 'Passwords do not match'
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched to show errors
    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true
    });

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const success = await register(formData);
      if (success) {
        navigate('/verify-code', { state: { email: formData.email, mode: 'register' } });
      }
    } finally {
      setIsSubmitting(false);
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
                      onBlur={handleBlur}
                      onFocus={handleFocus}
                      placeholder="Enter your full name"
                      isInvalid={touched.name && !!errors.name}
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
                      onBlur={handleBlur}
                      onFocus={handleFocus}
                      placeholder="Enter your email"
                      isInvalid={touched.email && !!errors.email}
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
                      maxLength={10}
                      value={formData.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      onFocus={handleFocus}
                      placeholder="Enter 10-digit phone number"
                      isInvalid={touched.phone && !!errors.phone}
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
                        onBlur={handleBlur}
                        onFocus={handleFocus}
                        placeholder="Create a strong password"
                        isInvalid={touched.password && !!errors.password}
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
                    <Form.Control.Feedback type="invalid" className={touched.password && errors.password ? 'd-block' : ''}>
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
                        onBlur={handleConfirmPasswordBlur}
                        onFocus={() => setTouched(prev => ({ ...prev, confirmPassword: false }))}
                        placeholder="Confirm your password"
                        isInvalid={touched.confirmPassword && !!errors.confirmPassword}
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
                    <Form.Control.Feedback type="invalid" className={touched.confirmPassword && errors.confirmPassword ? 'd-block' : ''}>
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
                      disabled={isSubmitting}
                      className="d-flex align-items-center justify-content-center"
                    >
                      {isSubmitting ? (
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