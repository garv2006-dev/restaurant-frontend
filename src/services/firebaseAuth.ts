import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export interface SocialAuthResult {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    provider: 'google' | 'email';
  };
  error?: string;
}

export interface EmailAuthResult {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    displayName?: string;
  };
  error?: string;
}

export const signInWithGoogle = async (): Promise<SocialAuthResult> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName!,
        photoURL: user.photoURL || undefined,
        provider: 'google'
      }
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google'
    };
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<EmailAuthResult> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || undefined
      }
    };
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in with email'
    };
  }
};

export const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send password reset email'
    };
  }
};

export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign out'
    };
  }
};

export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
