import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-toastify';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

interface GoogleLoginButtonProps {
    onLoadingChange?: (loading: boolean) => void;
}

function GoogleLoginButton({ onLoadingChange }: GoogleLoginButtonProps) {
    const { googleLogin } = useAuth();
    const { theme } = useTheme();

    const handleSuccess = async (credentialResponse: any) => {
        try {
            onLoadingChange?.(true);
            const idToken = credentialResponse.credential;
            await googleLogin(idToken);
        } catch (error: any) {
            console.error('Login Failed', error);
            toast.error(error?.message || 'Google login failed');
        } finally {
            onLoadingChange?.(false);
        }
    };

    const handleError = () => {
        console.error('Google Login Failed');
        toast.error('Google Login Failed. Please try again.');
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div style={{ width: '100%', position: 'relative', minHeight: '44px' }}>
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

