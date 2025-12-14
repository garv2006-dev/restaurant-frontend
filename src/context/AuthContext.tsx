import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { User, AuthState, LoginCredentials, RegisterData } from '../types';
import { authAPI } from '../services/api';
import { toast } from 'react-toastify';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<boolean>;
  resendVerification: (email: string) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>
}

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

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const userType = localStorage.getItem('userType') as 'admin' | 'user' | null;

        if (token && storedUser) {
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
              // Update stored user data
              localStorage.setItem('user', JSON.stringify(user));
              return;
            }
          } catch (error) {
            // Token validation failed, but don't logout immediately
            console.error('Auth initialization failed:', error);
            // Try to use stored user data if API is temporarily unavailable
            if (storedUser && token) {
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
                console.error('Failed to parse stored user data:', parseError);
              }
            }
          }
        }

        // Only logout if no valid stored data exists
        if (!token || !storedUser) {
          updateAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            loading: false,
          });
        } else {
          // If we have stored data but API failed, keep user logged in
          try {
            const parsedUser = JSON.parse(storedUser);
            updateAuthState({
              user: parsedUser,
              token,
              isAuthenticated: true,
              loading: false,
            });
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
            updateAuthState({
              user: null,
              token: null,
              isAuthenticated: false,
              loading: false,
            });
          }
        }
      } catch (error) {
        console.error('Unexpected error during auth initialization:', error);
        updateAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          loading: false,
        });
      }
    };

    initializeAuth();
  }, [updateAuthState]);

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

        // Redirect based on actual user role
        const redirectPath = userRole === 'admin' ? '/admin/dashboard' : '/dashboard';
        window.location.href = redirectPath;

        return true;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      toast.error(errorMessage);
      updateAuthState({ loading: false });
      return false;
    }
  }, [updateAuthState]);

  const register = useCallback(async (userData: RegisterData): Promise<boolean> => {
    try {
      updateAuthState({ loading: true });

      const response = await authAPI.register(userData);

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

        toast.success('Registration successful! Please verify your email.');
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

    toast.success('Logged out successfully');
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

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      const response = await authAPI.forgotPassword(email);

      if (response.success) {
        toast.success('Password reset email sent successfully');
        return true;
      } else {
        throw new Error(response.message || 'Failed to send password reset email');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send password reset email';
      toast.error(errorMessage);
      return false;
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.resetPassword(token, password);

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
    register,
    logout,
    updatePassword,
    forgotPassword,
    resetPassword,
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
    register,
    logout,
    updatePassword,
    forgotPassword,
    resetPassword,
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
