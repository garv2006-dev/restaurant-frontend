import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaClock, FaCheckCircle, FaUserShield } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import '../styles/VerifyCode.css';

// Create a wrapper component for icons
const IconWrapper = ({ icon: Icon, className, size, ...props }: { icon: any; className?: string; size?: number }) => {
    return <Icon className={className} size={size} {...props} />;
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VerifyCode: React.FC = () => {
    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const { verifyOtp, verifyAccount, forgotPassword, resendVerification } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;
    const mode = location.state?.mode || 'reset'; // 'reset' or 'register'

    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    useEffect(() => {
        let interval: any;
        if (resendCooldown > 0) {
            interval = setInterval(() => {
                setResendCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendCooldown]);

    const handleChange = (element: HTMLInputElement, index: number) => {
        const val = element.value;
        if (val && isNaN(Number(val))) return;

        // Take only the last character entered
        const char = val.slice(-1);
        const newOtp = [...otp];
        newOtp[index] = char;
        setOtp(newOtp);

        // Focus next input if char was added
        if (char !== "" && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace") {
            if (otp[index] === "" && index > 0) {
                // Focus previous and clear it
                inputRefs.current[index - 1]?.focus();
                const newOtp = [...otp];
                newOtp[index - 1] = "";
                setOtp(newOtp);
            } else if (otp[index] !== "") {
                // Clear current
                const newOtp = [...otp];
                newOtp[index] = "";
                setOtp(newOtp);
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").trim().slice(0, 6);
        if (!/^\d+$/.test(data)) return;

        const newOtp = [...otp];
        data.split("").forEach((value, index) => {
            if (index < 6) newOtp[index] = value;
        });
        setOtp(newOtp);

        // Focus the last filled input or the next empty one
        const lastIndex = Math.min(data.length, 5);
        inputRefs.current[lastIndex]?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpString = otp.join("");

        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (mode === 'register') {
                const res = await verifyAccount(email, otpString);
                if (res) {
                    navigate('/dashboard');
                }
            } else {
                const res = await verifyOtp(email, otpString);
                if (res) {
                    setIsVerified(true);
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
            let res = false;
            if (mode === 'register') {
                res = await resendVerification(email);
            } else {
                res = await forgotPassword(email, true);
            }

            if (res) {
                setResendCooldown(60);
                setError(null);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to resend code';
            setError(errorMessage);
            if (err.response && err.response.status === 429) {
                setResendCooldown(1800);
            } else if (errorMessage.toLowerCase().includes('wait')) {
                setResendCooldown(1800);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!email) return null;

    if (isVerified) {
        return (
            <div className="verify-code-container">
                <Card className="verify-card text-center">
                    <div className="mb-4">
                        <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '100px', height: '100px' }}>
                            <IconWrapper icon={FaCheckCircle} className="text-success" size={48} />
                        </div>
                    </div>
                    <h2 className="verify-title text-success">Verified!</h2>
                    <p className="verify-subtitle">
                        Identity confirmed for<br />
                        <strong>{email}</strong>
                    </p>
                    <p className="small text-muted mb-4">
                        A password reset link has been sent to your inbox. Please check your email and follow the instructions.
                    </p>
                    <Button variant="primary" className="confirm-btn" onClick={() => navigate('/login')}>
                        Back to Login
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="verify-code-container">
            <Card className="verify-card">
                <div className="illustration-box">
                    <div className="illustration-bg"></div>
                    <div className="illustration-img d-flex align-items-center justify-content-center">
                        <IconWrapper icon={FaUserShield} size={60} className="text-primary opacity-75" />
                    </div>
                </div>

                <h2 className="verify-title">Verification Code</h2>
                <p className="verify-subtitle">
                    Please enter the 6-digit code sent to<br />
                    <strong>{email}</strong>
                </p>

                {error && (
                    <Alert variant="danger" className="mb-4 py-2 small text-center rounded-3">
                        {error}
                    </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                    <div className="otp-input-group">
                        {otp.map((data, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength={1}
                                className={`otp-box ${data ? 'filled' : ''}`}
                                value={data}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                onChange={(e) => handleChange(e.target, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                disabled={loading}
                                autoComplete="one-time-code"
                                inputMode="numeric"
                            />
                        ))}
                    </div>

                    <div className="resend-container">
                        <span className="resend-text">Didn't receive the code?</span>
                        <span
                            className={`resend-link ${resendCooldown > 0 ? 'disabled' : ''}`}
                            onClick={handleResendCode}
                        >
                            Resend Code
                        </span>
                        {resendCooldown > 0 && (
                            <div className="timer-text">
                                <IconWrapper icon={FaClock} size={12} />
                                <span>{formatTime(resendCooldown)}</span>
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="confirm-btn"
                        disabled={loading || otp.join("").length !== 6}
                    >
                        {loading ? <LoadingSpinner size="sm" message="" /> : 'Confirm'}
                    </Button>
                </Form>
            </Card>
        </div>
    );
};

export default VerifyCode;
