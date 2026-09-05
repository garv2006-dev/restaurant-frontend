import React from 'react';
import SocialButtons from './SocialButtons';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import styles from './SocialLogin.module.css';

interface SocialLoginProps {
  onSuccess?: (user: any, token: string) => void;
  onError?: (message: string) => void;
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
}

const SocialLogin: React.FC<SocialLoginProps> = ({
  onSuccess,
  onError,
  loading = false,
  setLoading
}) => {
  const { googleLogin } = useAuth();

  const handleSocialLogin = async (provider: 'google', idToken?: string) => {
    if (setLoading) setLoading(true);
    
    try {
      if (!idToken) {
        onError?.('Google authentication token is required');
        return;
      }
      
      const success = await googleLogin(idToken);
      if (success) {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
          onSuccess?.(JSON.parse(storedUser), token);
        }
      } else {
        onError?.('Login failed');
      }
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      onError?.(error.message || 'An error occurred during login');
    } finally {
      if (setLoading) setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // This component is now deprecated - use GoogleLoginButton directly
    // The GoogleLoginButton component handles the OAuth flow internally
    console.warn('SocialLogin component is deprecated. Use GoogleLoginButton directly.');
  };

  return (
    <div className={styles['social-login']}>
      <div className={styles['social-login-buttons']}>
        <SocialButtons.GoogleSignInButton
          onClick={handleGoogleSignIn}
          disabled={loading}
        />
      </div>
    </div>
  );
};

export default SocialLogin;
