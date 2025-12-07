import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  addDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FirestoreUser {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'staff' | 'admin';
  createdAt: any;
  updatedAt?: any;
  authProvider: 'local' | 'google' | 'facebook';
  photoURL?: string;
  isEmailVerified: boolean;
  loyaltyPoints?: number;
  loyaltyTier?: string;
  lastLogin?: any;
}

export interface FirestoreBooking {
  userId: string;
  room: string;
  dates: {
    checkIn: string;
    checkOut: string;
  };
  price: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: any;
  updatedAt?: any;
  bookingId?: string;
  specialRequests?: string;
  numberOfGuests?: number;
}

// User operations
export const createUserInFirestore = async (userData: Partial<FirestoreUser>): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userData.uid!);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
      // Create new user
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    }
    return true;
  } catch (error) {
    console.error('Error creating user in Firestore:', error);
    return false;
  }
};

export const getUserFromFirestore = async (uid: string): Promise<FirestoreUser | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as FirestoreUser;
    }
    return null;
  } catch (error) {
    console.error('Error getting user from Firestore:', error);
    return null;
  }
};

export const updateUserInFirestore = async (uid: string, updates: Partial<FirestoreUser>): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating user in Firestore:', error);
    return false;
  }
};

// Booking operations
export const createBookingInFirestore = async (bookingData: FirestoreBooking): Promise<string | null> => {
  try {
    // Create booking in main bookings collection
    const bookingRef = await addDoc(collection(db, 'bookings'), {
      ...bookingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const bookingId = bookingRef.id;

    // Also create booking under user's subcollection
    const userBookingsRef = collection(db, 'users', bookingData.userId, 'bookings');
    await addDoc(userBookingsRef, {
      ...bookingData,
      bookingId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update main booking document with bookingId
    await updateDoc(bookingRef, { bookingId });

    return bookingId;
  } catch (error) {
    console.error('Error creating booking in Firestore:', error);
    return null;
  }
};

export const getUserBookings = async (uid: string): Promise<FirestoreBooking[]> => {
  try {
    const bookingsRef = collection(db, 'users', uid, 'bookings');
    const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...(doc.data() as Omit<FirestoreBooking, 'id'>),
      id: doc.id
    }));
  } catch (error) {
    console.error('Error getting user bookings from Firestore:', error);
    return [];
  }
};

export const getAllBookings = async (): Promise<FirestoreBooking[]> => {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...(doc.data() as Omit<FirestoreBooking, 'id'>),
      id: doc.id
    }));
  } catch (error) {
    console.error('Error getting all bookings from Firestore:', error);
    return [];
  }
};

export const updateBookingStatus = async (bookingId: string, status: FirestoreBooking['status']): Promise<boolean> => {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      status,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating booking status in Firestore:', error);
    return false;
  }
};

// Admin operations
export const getAllUsers = async (): Promise<FirestoreUser[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id
    })) as FirestoreUser[];
  } catch (error) {
    console.error('Error getting all users from Firestore:', error);
    return [];
  }
};

// Sync operations
export const syncUserToFirestore = async (userData: any, authProvider: 'local' | 'google' | 'facebook' = 'local'): Promise<boolean> => {
  try {
    const firestoreUser: Partial<FirestoreUser> = {
      uid: userData.uid || userData.firebaseUid || userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role || 'customer',
      authProvider,
      photoURL: userData.photoURL || userData.avatar,
      isEmailVerified: userData.isEmailVerified || false,
      loyaltyPoints: userData.loyaltyPoints || 0,
      loyaltyTier: userData.loyaltyTier || 'Bronze'
    };

    return await createUserInFirestore(firestoreUser);
  } catch (error) {
    console.error('Error syncing user to Firestore:', error);
    return false;
  }
};
