import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-toastify';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

function GoogleLoginButton() {
    const { googleLogin, loading } = useAuth();
    const { theme } = useTheme();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleSuccess = async (credentialResponse: any) => {
        try {
            setIsAuthenticating(true);
            const idToken = credentialResponse.credential;
            await googleLogin(idToken);
        } catch (error: any) {
            console.error('Login Failed', error);
            toast.error(error?.message || 'Google login failed');
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleError = () => {
        console.error('Google Login Failed');
        toast.error('Google Login Failed. Please try again.');
    };

    const isLoadingState = loading || isAuthenticating;

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div style={{ width: '100%', position: 'relative' }}>
                {isLoadingState && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: theme === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '20px',
                        backdropFilter: 'blur(2px)'
                    }}>
                        <LoadingSpinner size="sm" message="Signing in with Google..." />
                    </div>
                )}
                <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                    width="100%"
                    theme={theme === 'dark' ? 'filled_black' : 'outline'}
                    size="large"
                    text="signin_with"
                    shape="pill"
                />
            </div>
        </GoogleOAuthProvider>
    );
}

export { GoogleLoginButton };

