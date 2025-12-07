import React from 'react';
import SocialButtons from './SocialButtons';
import { authAPI } from '../../services/api';
import { signInWithGoogle, SocialAuthResult } from '../../services/firebaseAuth';
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

  const handleSocialLogin = async (
    signInFunction: () => Promise<SocialAuthResult>,
    provider: 'google'
  ) => {
    if (setLoading) setLoading(true);
    
    try {
      // First authenticate with Firebase
      const firebaseResult = await signInFunction();
      
      if (!firebaseResult.success || !firebaseResult.user) {
        onError?.(firebaseResult.error || 'Authentication failed');
        return;
      }

      // Then send data to backend
      const backendResult = await authAPI.socialLogin({
        uid: firebaseResult.user.uid,
        email: firebaseResult.user.email,
        displayName: firebaseResult.user.displayName,
        photoURL: firebaseResult.user.photoURL,
        provider
      });

      if (backendResult.success && backendResult.user && backendResult.token) {
        // Store in localStorage
        localStorage.setItem('token', backendResult.token);
        localStorage.setItem('user', JSON.stringify(backendResult.user));
        localStorage.setItem('userType', backendResult.user.role || 'customer');
        
        // Refresh the auth context to pick up new values
        await refreshUser();
        
        onSuccess?.(backendResult.user, backendResult.token);
      } else {
        onError?.(backendResult.message || 'Login failed');
      }
    } catch (error: any) {
      console.error(`${provider} login error:`, error);
      onError?.(error.message || 'An error occurred during login');
    } finally {
      if (setLoading) setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    handleSocialLogin(signInWithGoogle, 'google');
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
