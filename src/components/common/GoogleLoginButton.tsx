import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';

const GOOGLE_CLIENT_ID = '897986200614-2lbsiml3p06gou0jis1ndlldrd3um8ib.apps.googleusercontent.com';

function GoogleLoginButton() {
    const { setAuthState } = useAuth()
    const handleSuccess = async (credentialResponse: any) => {
        try {
            // credentialResponse.credential is the id_token
            const idToken = credentialResponse.credential;

            const response = await authAPI.googleLogin(idToken);

            if (response?.success) {
                console.log("Respone", response);

                const { token, user } = response;

                setAuthState({
                    user: user as User,
                    token: token as string,
                    isAuthenticated: true,
                    loading: false,
                });
                // Update stored user data
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('token', token || '');
            }
        }
        catch (error) {
            console.error('Login Failed', error);
        }
    };

    const handleError = () => {
        console.error('Login Failed');
    };

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={handleError}
                />
            </div>
        </GoogleOAuthProvider>
    );
}

export { GoogleLoginButton };
