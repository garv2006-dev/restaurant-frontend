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
  const { refreshUser } = useAuth();

  const handleSocialLogin = async (provider: 'google', idToken?: string) => {
    if (setLoading) setLoading(true);
    
    try {
      // Use Google OAuth directly without Firebase
      if (!idToken) {
        onError?.('Google authentication token is required');
        return;
      }
      
      const result = await authAPI.googleLogin(idToken);
      
      if (result.success && result.user && result.token) {
        // Store in localStorage
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        localStorage.setItem('userType', result.user.role || 'customer');
        
        // Refresh the auth context to pick up new values
        await refreshUser();
        
        onSuccess?.(result.user, result.token);
      } else {
        onError?.(result.message || 'Login failed');
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
