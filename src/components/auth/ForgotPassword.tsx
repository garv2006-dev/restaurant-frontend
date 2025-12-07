import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import styles from './ForgotPassword.module.css';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ 
  onBackToLogin, 
  onSuccess, 
  onError 
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      onError?.('Please enter your email address');
      return;
    }

    setLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      onSuccess?.('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      let errorMessage = 'Failed to send password reset email';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles['forgot-password-success']}>
        <h3>Reset Email Sent!</h3>
        <p>
          We've sent a password reset link to your email address. 
          Please check your inbox and follow the instructions to reset your password.
        </p>
        <button 
          className={styles.btn}
          onClick={onBackToLogin}
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className={styles['forgot-password']}>
      <h2>Forgot Password</h2>
      <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <form onSubmit={handleSubmit} className={styles['forgot-password-form']}>
        <div className={styles['form-group']}>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            disabled={loading}
          />
        </div>
        
        <button 
          type="submit" 
          className={styles.btn}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
      </form>
      
      <div className={styles['back-to-login']}>
        <button 
          className={styles.btn}
          onClick={onBackToLogin}
          disabled={loading}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
