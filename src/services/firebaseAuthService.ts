import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { createUserInFirestore, getUserFromFirestore, syncUserToFirestore, FirestoreUser } from './firestoreService';

export interface AuthResult {
  success: boolean;
  user?: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    provider: 'google' | 'email';
    role?: string;
    phone?: string;
  };
  error?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// Register new user with Firebase Auth and Firestore
export const registerWithFirebase = async (userData: RegisterData): Promise<AuthResult> => {
  try {
    // Create user in Firebase Auth
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );

    const { user } = userCredential;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: userData.name
    });

    // Create user in Firestore
    const firestoreUser: Partial<FirestoreUser> = {
      uid: user.uid,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: 'customer' as const,
      authProvider: 'local' as const,
      isEmailVerified: false,
      loyaltyPoints: 0,
      loyaltyTier: 'Bronze' as const
    };

    const firestoreSuccess = await createUserInFirestore(firestoreUser);
    
    if (!firestoreSuccess) {
      console.error('Failed to create user in Firestore, but Firebase Auth user was created');
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email!,
        displayName: userData.name,
        provider: 'email',
        role: 'customer',
        phone: userData.phone
      }
    };
  } catch (error: any) {
    console.error('Firebase registration error:', error);
    return {
      success: false,
      error: getFirebaseErrorMessage(error.code)
    };
  }
};

// Sign in with email/password
export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // Get user data from Firestore
    const firestoreUser = await getUserFromFirestore(user.uid);
    
    // Update last login
    if (firestoreUser) {
      await syncUserToFirestore({
        ...firestoreUser,
        lastLogin: new Date()
      }, 'local');
    }

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || firestoreUser?.name || 'User',
        provider: 'email',
        role: firestoreUser?.role,
        phone: firestoreUser?.phone
      }
    };
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    return {
      success: false,
      error: getFirebaseErrorMessage(error.code)
    };
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const { user } = result;

    // Check if user exists in Firestore
    const firestoreUser = await getUserFromFirestore(user.uid);
    
    if (!firestoreUser) {
      // Create new user in Firestore for Google login
      const newFirestoreUser: Partial<FirestoreUser> = {
        uid: user.uid,
        name: user.displayName || 'Google User',
        email: user.email!,
        phone: user.phoneNumber || undefined,
        role: 'customer' as const,
        authProvider: 'google' as const,
        photoURL: user.photoURL || undefined,
        isEmailVerified: user.emailVerified,
        loyaltyPoints: 0,
        loyaltyTier: 'Bronze' as const
      };

      await createUserInFirestore(newFirestoreUser);
    } else {
      // Update existing user
      await syncUserToFirestore({
        ...firestoreUser,
        lastLogin: new Date(),
        photoURL: user.photoURL || firestoreUser.photoURL
      }, 'google');
    }

    const updatedFirestoreUser = await getUserFromFirestore(user.uid);

    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email!,
        displayName: user.displayName || updatedFirestoreUser?.name || 'Google User',
        photoURL: user.photoURL || undefined,
        provider: 'google',
        role: updatedFirestoreUser?.role,
        phone: updatedFirestoreUser?.phone
      }
    };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      error: getFirebaseErrorMessage(error.code)
    };
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Firebase: Sending password reset email to:', email);
    console.log('Firebase: Auth instance:', auth);
    console.log('Firebase: Project config:', {
      authDomain: auth.config?.authDomain,
      projectId: auth.app?.options?.projectId
    });
    
    // Send password reset email with proper action URL
    await sendPasswordResetEmail(auth, email, {
      url: window.location.origin + '/login'
    });
    
    console.log('Firebase: Password reset email sent successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Firebase: Password reset error:', error);
    console.error('Firebase: Error details:', {
      code: error.code,
      message: error.message,
      customData: error.customData
    });
    
    return {
      success: false,
      error: getFirebaseErrorMessage(error.code)
    };
  }
};

// Sign out
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: getFirebaseErrorMessage(error.code)
    };
  }
};

// Get current Firebase user
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// Helper function to get user-friendly error messages
const getFirebaseErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please use a different email or sign in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled. Please try again.';
    case 'auth/popup-blocked':
      return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was cancelled.';
    default:
      return 'An error occurred. Please try again.';
  }
};

// Check if user is authenticated
export const isUserAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

// Wait for authentication state to be determined
export const waitForAuthState = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};
