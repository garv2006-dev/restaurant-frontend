import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaLock, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Create a wrapper component for FontAwesome icons to ensure React 19 compatibility
const IconWrapper = ({ icon: Icon, className, size, ...props }: { icon: any; className?: string; size?: number }) => {
    return <Icon className={className} size={size} {...props} />;
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
};

const VerifyCode: React.FC = () => {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const { verifyOtp, verifyAccount, forgotPassword, resendVerification } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;
    const mode = location.state?.mode || 'reset'; // 'reset' or 'register'

    useEffect(() => {
        if (!email) {
            // If no email in state, redirect back to login or forgot password based on common usage
            navigate('/login');
        }
    }, [email, navigate]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (resendCooldown > 0) {
            interval = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendCooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!otp || otp.length !== 6) {
            setError('Please enter a valid 6-digit verification code');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (mode === 'register') {
                const success = await verifyAccount(email, otp);
                if (success) {
                    // verifyAccount already acts on context to login
                    navigate('/dashboard');
                }
            } else {
                // Password reset flow
                const success = await verifyOtp(email, otp);
                if (success) {
                    setSuccess(true);
                    // We wait for user to click button to reset password
                }
            }
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resendCooldown > 0) return;

        setLoading(true);
        setError(null);

        try {
            // Pass true to throw error so we can catch 429 status
            let success = false;

            if (mode === 'register') {
                success = await resendVerification(email);
            } else {
                success = await forgotPassword(email, true);
            }

            if (success) {
                setResendCooldown(60); // 60 seconds normal cooldown
                setError(null);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to resend code';
            setError(errorMessage);

            // Check for rate limit error (Status 429)
            if (err.response && err.response.status === 429) {
                // Set cooldown to 30 minutes (1800 seconds)
                setResendCooldown(1800);
            } else if (errorMessage.toLowerCase().includes('wait')) {
                // Fallback if status not available but message says wait
                setResendCooldown(1800);
            }
        } finally {
            setLoading(false);
        }
    };



    if (!email) return null;

    if (success) {
        return (
            <div className="min-vh-100" style={{ backgroundColor: 'var(--bs-body-bg)' }}>
                <Container className="py-5">
                    <Row className="justify-content-center align-items-center min-vh-100">
                        <Col md={6} lg={5} xl={4}>
                            <Card className="shadow-sm border-0">
                                <Card.Body className="p-4 text-center">
                                    <div className="mb-4">
                                        <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                                            <IconWrapper icon={FaEnvelope} className="text-success" size={32} />
                                        </div>
                                    </div>
                                    <h2 className="text-success mb-3">Identity Verified</h2>
                                    <p className="text-muted mb-4">
                                        We've sent a password reset link to<br />
                                        <strong>{email}</strong>
                                    </p>
                                    <p className="small text-muted mb-4">
                                        Please click the link in the email to set your new password.
                                    </p>
                                    <Button variant="primary" as="a" href="/login">
                                        Back to Login
                                    </Button>
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
                                            <IconWrapper icon={FaLock} className="text-primary" size={24} />
                                        </div>
                                    </div>
                                    <h2 className="text-primary mb-2">
                                        {mode === 'register' ? 'Verify Account' : 'Recover Password'}
                                    </h2>
                                    <p className="text-muted">
                                        {mode === 'register' ? (
                                            <>
                                                To complete your registration,<br />
                                                please enter the code sent to<br />
                                                <strong>{email}</strong>
                                            </>
                                        ) : (
                                            <>
                                                If an account exists for<br />
                                                <strong>{email}</strong>, a verification code<br />
                                                will be sent to your inbox.
                                            </>
                                        )}
                                    </p>
                                </div>

                                {error && (
                                    <Alert variant="danger" className="mb-3">
                                        {error}
                                    </Alert>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email</Form.Label>
                                        <Form.Control
                                            type="email"
                                            value={email}
                                            readOnly
                                            className="bg-light"
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label>Verification Code</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="Enter 6-digit code"
                                            required
                                            className="text-center letter-spacing-2"
                                            style={{ letterSpacing: otp ? '0.5em' : 'normal', fontSize: '1.2rem' }}
                                            autoFocus
                                        />
                                    </Form.Group>

                                    <div className="d-grid gap-3">
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
                                                'Verify code'
                                            )}
                                        </Button>

                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onClick={handleResendCode}
                                            disabled={loading || resendCooldown > 0}
                                            className="d-flex align-items-center justify-content-center"
                                        >
                                            {resendCooldown > 0 ? `Resend available in ${formatTime(resendCooldown)}` : 'Send new code'}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default VerifyCode;
