import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { AuthState, LoginCredentials, RegisterData } from '../types';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  googleLogin: (idToken: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  forgotPassword: (email: string, shouldThrow?: boolean) => Promise<boolean>;
  resetPassword: (email: string, otp: string, password: string) => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  verifyAccount: (email: string, otp: string) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<boolean>;
  resendVerification: (email: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>
}

export const isTokenExpired = (token: string | null | undefined): boolean => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Current time in seconds vs exp in seconds (5 sec buffer)
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp <= currentTime + 5;
  } catch (error) {
    return true; // If parsing fails, treat as expired/invalid
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

type AuthStateUpdate = Partial<AuthState>;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
  });

  // Helper function to safely update auth state
  const updateAuthState = useCallback((updates: AuthStateUpdate) => {
    setAuthState(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Helper function for automatic logout when token expires
  const handleAutoLogout = useCallback((reason = 'Your session has expired. Please sign in again.') => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');

    updateAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });

    toast.error(reason, {
      toastId: 'session-expired-toast',
      position: "top-center",
      autoClose: 4000,
    });
  }, [updateAuthState]);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const userType = localStorage.getItem('userType') as 'admin' | 'user' | null;

        if (token) {
          // Client-side JWT expiration check
          if (isTokenExpired(token)) {
            console.warn('🔑 JWT token is expired');
            handleAutoLogout('Your session has expired. Please sign in again.');
            return;
          }

          if (storedUser) {
            try {
              const response = await authAPI.getMe();
              if (response.success && response.user) {
                const user = {
                  ...response.user,
                  role: response.user.role || (userType === 'admin' ? 'admin' : 'user')
                };

                updateAuthState({
                  user,
                  token,
                  isAuthenticated: true,
                  loading: false,
                });
                localStorage.setItem('user', JSON.stringify(user));
                return;
              }
            } catch (error: any) {
              console.error('Auth initialization failed:', error);
              if (
                error.response?.status === 401 ||
                error.message?.toLowerCase().includes('token expired') ||
                error.message?.toLowerCase().includes('jwt expired')
              ) {
                handleAutoLogout('Your session has expired. Please sign in again.');
                return;
              }

              // Fallback for offline network failure (not 401)
              try {
                const parsedUser = JSON.parse(storedUser);
                updateAuthState({
                  user: parsedUser,
                  token,
                  isAuthenticated: true,
                  loading: false,
                });
                return;
              } catch (parseError) {
                handleAutoLogout('Your session has expired. Please sign in again.');
                return;
              }
            }
          }
        }

        updateAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
        });
      } catch (error) {
        console.error('Unexpected error during auth initialization:', error);
        handleAutoLogout('Your session has expired. Please sign in again.');
      }
    };

    initializeAuth();
  }, [updateAuthState, handleAutoLogout]);

  // Listen for global auth:expired custom events dispatched by Axios interceptor
  useEffect(() => {
    const onAuthExpired = (event: Event) => {
      const customEvent = event as CustomEvent;
      const message = customEvent.detail?.message || 'Your session has expired. Please sign in again.';
      handleAutoLogout(message);
    };

    window.addEventListener('auth:expired', onAuthExpired);
    return () => {
      window.removeEventListener('auth:expired', onAuthExpired);
    };
  }, [handleAutoLogout]);

  // Periodic token expiration check (every 30 seconds)
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.token) return;

    const interval = setInterval(() => {
      if (authState.token && isTokenExpired(authState.token)) {
        console.warn('🔑 Token expired during active session');
        handleAutoLogout('Your session has expired. Please sign in again.');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, authState.token, handleAutoLogout]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      updateAuthState({ loading: true });

      const response = await authAPI.login(credentials);

      if (response.success && response.user && response.token) {
        const { user, token } = response;
        const userRole = user.role || 'user';
        const effectiveUserType: 'admin' | 'user' = userRole === 'admin' ? 'admin' : 'user';

        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...user, role: userRole }));
        localStorage.setItem('userType', effectiveUserType);

        // Update state
        updateAuthState({
          user: { ...user, role: userRole },
          token,
          isAuthenticated: true,
          loading: false,
        });

        // Show success toast
        toast.success(`Welcome back, ${user.name || 'User'}!`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // State update will trigger re-render in Login component,
        // which handles the redirect logic including the return path.

        return true;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      updateAuthState({ loading: false });
      return false;
    }
  }, [updateAuthState]);

  const googleLogin = useCallback(async (idToken: string): Promise<boolean> => {
    try {
      updateAuthState({ loading: true });

      const response = await authAPI.googleLogin(idToken);

      if (response.success && response.user && response.token) {
        const { user, token } = response;
        const userRole = user.role || 'user';
        const effectiveUserType: 'admin' | 'user' = userRole === 'admin' ? 'admin' : 'user';

        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...user, role: userRole }));
        localStorage.setItem('userType', effectiveUserType);

        // Update state
        updateAuthState({
          user: { ...user, role: userRole },
          token,
          isAuthenticated: true,
          loading: false,
        });

        // Show success toast
        toast.success(`Welcome back, ${user.name || 'User'}!`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        return true;
      } else {
        throw new Error(response.message || 'Google login failed');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Google login failed';
      toast.error(errorMessage);

      updateAuthState({ loading: false });
      return false;
    }
  }, [updateAuthState]);

  const register = useCallback(async (userData: RegisterData): Promise<boolean> => {
    try {
      updateAuthState({ loading: true });

      const response = await authAPI.register(userData);

      if (response.success) {
        // We no longer set state or token here because user needs to verify email first
        toast.success(response.message || 'Registration successful! Please verify your email.', {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return true;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(errorMessage);

      updateAuthState({ loading: false });
      return false;
    }
  }, [updateAuthState]);

  const logout = useCallback(() => {
    // Call logout API (don't wait for response)
    authAPI.logout().catch(error => console.error('Logout API error:', error));

    // Disconnect socket on logout
    try {
      const { disconnectSocket } = require('../contexts/SocketContext');
      disconnectSocket();
      console.log('Socket disconnected on logout');
    } catch (error) {
      console.warn('Failed to disconnect socket on logout:', error);
    }

    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');

    // Update state
    updateAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });

    toast.success('Logged out successfully', {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  }, [updateAuthState]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const response = await authAPI.updatePassword(currentPassword, newPassword);

      if (response.success && response.user && response.token) {
        const { user, token } = response;

        // Update stored data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Update state
        updateAuthState({ user, token });

        toast.success('Password updated successfully');
        return true;
      } else {
        throw new Error(response.message || 'Password update failed');
      }
    } catch (error: any) {
      console.error('Update password error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Password update failed';
      toast.error(errorMessage);
      return false;
    }
  }, [updateAuthState]);

  const forgotPassword = useCallback(async (email: string, shouldThrow = false): Promise<boolean> => {
    try {
      const response = await authAPI.forgotPassword(email);

      if (response.success) {
        toast.success('Verification code sent successfully');
        return true;
      } else {
        throw new Error(response.message || 'Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send verification code';
      toast.error(errorMessage);
      if (shouldThrow) throw error;
      return false;
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string): Promise<boolean> => {
    try {
      const response = await authAPI.verifyOtp(email, otp);

      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Verification failed';
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const verifyAccount = useCallback(async (email: string, otp: string): Promise<boolean> => {
    try {
      // We need to add this method to authAPI service first ideally, or call axios directly.
      // Assuming authAPI will be updated or we can add it here.
      // Use verifyOtp endpoint structure but point to verify-account
      const response = await authAPI.verifyAccount(email, otp);

      if (response.success && response.user && response.token) {
        const { user, token } = response;

        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // Update state
        updateAuthState({
          user,
          token,
          isAuthenticated: true,
          loading: false,
        });

        toast.success('Account verified successfully!');
        return true;
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Account verification error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Verification failed';
      toast.error(errorMessage);
      return false;
    }
  }, [updateAuthState]);

  const resetPassword = useCallback(async (email: string, otp: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.resetPassword(email, otp, password);

      if (response.success && response.user && response.token) {
        const { user, token: newToken } = response;

        // Store in localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(user));

        // Update state
        updateAuthState({
          user,
          token: newToken,
          isAuthenticated: true,
          loading: false,
        });

        toast.success('Password reset successful');
        return true;
      } else {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Password reset failed';
      toast.error(errorMessage);
      return false;
    }
  }, [updateAuthState]);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await authAPI.getMe();
        if (response.success && response.user) {
          const userType = localStorage.getItem('userType') as 'admin' | 'user' | null;
          const user = {
            ...response.user,
            role: response.user.role || (userType === 'admin' ? 'admin' : 'user')
          };

          updateAuthState({ user });
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      // If there's an error refreshing, log out the user
      logout();
    }
  }, [logout, updateAuthState]);

  const verifyEmail = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await authAPI.verifyEmail(token);

      if (response.success) {
        // Refresh user data to get updated verification status
        await refreshUser();
        toast.success('Email verified successfully');
        return true;
      } else {
        throw new Error(response.message || 'Email verification failed');
      }
    } catch (error: any) {
      console.error('Verify email error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Email verification failed';
      toast.error(errorMessage);
      return false;
    }
  }, [refreshUser]);

  const resendVerification = useCallback(async (email: string): Promise<boolean> => {
    try {
      const response = await authAPI.resendVerification(email);

      if (response.success) {
        toast.success('Verification email sent successfully');
        return true;
      } else {
        throw new Error(response.message || 'Failed to send verification email');
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send verification email';
      toast.error(errorMessage);
      return false;
    }
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo((): AuthContextType => ({
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
    login,
    googleLogin,
    register,
    logout,
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyOtp,
    verifyAccount,
    verifyEmail,
    resendVerification,
    refreshUser,
    setAuthState
  }), [
    authState.user,
    authState.token,
    authState.isAuthenticated,
    authState.loading,
    login,
    googleLogin,
    register,
    logout,
    updatePassword,
    forgotPassword,
    resetPassword,
    verifyOtp,
    verifyAccount,
    verifyEmail,
    resendVerification,
    refreshUser,
    setAuthState
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth called outside AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
