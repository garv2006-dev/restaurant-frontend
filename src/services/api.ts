import axios, { AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, User, Room, Booking, Review, Payment, LoginCredentials, RegisterData } from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 60000, // Increased to 60 seconds for production cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to check if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) {
    // Network errors, timeouts, etc.
    return true;
  }
  // Retry on 5xx server errors and 408 timeout
  const status = error.response.status;
  return status >= 500 || status === 408;
};

// Helper function to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Disable caching for GET requests
    // if (config.method?.toUpperCase() === 'GET') {
    //   config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    //   config.headers['Pragma'] = 'no-cache';
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors, token refresh, and retries
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config: any = error.config;

    // Initialize retry count
    if (!config._retryCount) {
      config._retryCount = 0;
    }

    // Check if we should retry
    if (config._retryCount < MAX_RETRIES && isRetryableError(error)) {
      config._retryCount += 1;

      console.log(`Retrying request (${config._retryCount}/${MAX_RETRIES}):`, config.url);

      // Exponential backoff: 2s, 4s, 8s...
      const delayTime = RETRY_DELAY * Math.pow(2, config._retryCount - 1);
      await delay(delayTime);

      // Retry the request
      return api(config);
    }

    // Only logout on 401 for specific API calls and not during app initialization
    const isAuthMeAPI = error.config?.url?.includes('/auth/me');

    if (error.response?.status === 401 && !isAuthMeAPI) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      window.location.href = '/login';
    }

    // Enhance error message for timeouts
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      const enhancedError: any = new Error(
        'The server is taking longer than expected to respond. This may be due to server startup. Please try again in a moment.'
      );
      enhancedError.isTimeout = true;
      enhancedError.originalError = error;
      return Promise.reject(enhancedError);
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<{ success: boolean; user?: User; token?: string; message?: string; userType?: string }> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterData): Promise<{ success: boolean; user?: User; token?: string; message?: string }> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async (): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async (): Promise<{ success: boolean; user?: User; message?: string }> => {
    const response: AxiosResponse<{ success: boolean; user?: User; message?: string }> = await api.get('/auth/me');
    return response.data;
  },

  updatePassword: async (currentPassword: string, password: string): Promise<{ success: boolean; user?: User; token?: string; message?: string }> => {
    const response: AxiosResponse<{ success: boolean; user?: User; token?: string; message?: string }> = await api.put('/auth/updatepassword', {
      currentPassword,
      password,
    });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/forgotpassword', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ success: boolean; user?: User; token?: string; message?: string }> => {
    const response: AxiosResponse<{ success: boolean; user?: User; token?: string; message?: string }> = await api.put('/auth/resetpassword', {
      token,
      password,
    });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.get(`/auth/verify/${token}`);
    return response.data;
  },

  resendVerification: async (email: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  // Google OAuth login
  googleLogin: async (idToken: string): Promise<{ success: boolean; user?: User; token?: string; message?: string }> => {
    const response = await api.post('/auth/google-login', { idToken });
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (userData: Partial<User>): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.put('/users/profile', userData);
    return response.data;
  },

  uploadAvatar: async (formData: FormData): Promise<ApiResponse<{ avatarUrl: string }>> => {
    const response: AxiosResponse<ApiResponse<{ avatarUrl: string }>> = await api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Rooms API
export const roomsAPI = {
  getAllRooms: async (filters?: any): Promise<ApiResponse<{ rooms: Room[]; pagination: any }>> => {
    const response: AxiosResponse<any> = await api.get('/rooms', {
      params: filters,
    });

    const raw = response.data || {};

    // Backend returns: { success, count, total, pagination, data: Room[] }
    let rooms: any[] = [];
    let pagination: any = raw.pagination || null;

    if (Array.isArray(raw.data)) {
      rooms = raw.data;
    } else if (Array.isArray(raw.rooms)) {
      // Fallback if backend ever sends rooms directly
      rooms = raw.rooms;
    } else if (Array.isArray(raw)) {
      // Fallback if the entire response is just an array
      rooms = raw;
    }

    // Normalize id field so frontend can rely on room.id
    const normalizedRooms: Room[] = rooms.map((room: any) => ({
      ...room,
      id: room.id || room._id,
    }));

    return {
      success: raw.success !== undefined ? raw.success : true,
      message: raw.message,
      data: {
        rooms: normalizedRooms,
        pagination,
      },
    } as ApiResponse<{ rooms: Room[]; pagination: any }>;
  },

  getRoomById: async (id: string): Promise<ApiResponse<Room>> => {
    const response: AxiosResponse<ApiResponse<Room>> = await api.get(`/rooms/${id}`);
    return response.data;
  },

  checkAvailability: async (roomId: string, checkIn: string, checkOut: string): Promise<ApiResponse<{ available: boolean; price: number }>> => {
    const response: AxiosResponse<ApiResponse<{ available: boolean; price: number }>> = await api.post('/rooms/check-availability', {
      roomId,
      checkIn,
      checkOut,
    });
    return response.data;
  },

  getRoomReviews: async (roomId: string): Promise<ApiResponse<Review[]>> => {
    const response: AxiosResponse<ApiResponse<Review[]>> = await api.get(`/rooms/${roomId}/reviews`);
    return response.data;
  },
};

// Bookings API
export const bookingsAPI = {
  validateDiscount: async (discountCode: string, subtotal: number): Promise<ApiResponse<{
    discount: {
      id: string;
      code: string;
      name: string;
      description: string;
      type: string;
      value: number;
    };
    discountAmount: number;
    finalAmount: number;
    savings: number;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      discount: {
        id: string;
        code: string;
        name: string;
        description: string;
        type: string;
        value: number;
      };
      discountAmount: number;
      finalAmount: number;
      savings: number;
    }>> = await api.post('/bookings/validate-discount', { discountCode, subtotal });
    return response.data;
  },

  createBooking: async (bookingData: any): Promise<ApiResponse<Booking>> => {
    const response: AxiosResponse<ApiResponse<Booking>> = await api.post('/bookings', bookingData);
    return response.data;
  },

  getUserBookings: async (): Promise<ApiResponse<{ bookings: Booking[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ bookings: Booking[]; pagination: any }>> = await api.get('/bookings');
    return response.data;
  },

  getAllBookings: async (params?: any): Promise<ApiResponse<Booking[]>> => {
    const response: AxiosResponse<ApiResponse<Booking[]>> = await api.get('/bookings/admin/all', { params });
    return response.data;
  },

  getBookingById: async (id: string): Promise<ApiResponse<Booking>> => {
    const response: AxiosResponse<ApiResponse<Booking>> = await api.get(`/bookings/${id}`);
    return response.data;
  },

  cancelBooking: async (id: string, reason?: string): Promise<ApiResponse<Booking>> => {
    console.log('API: Cancelling booking with ID:', id, 'Reason:', reason);
    try {
      const response: AxiosResponse<ApiResponse<Booking>> = await api.put(`/bookings/${id}/cancel`, { reason });
      console.log('API: Cancel booking response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Cancel booking error:', error);
      throw error;
    }
  },

  updateBooking: async (id: string, updateData: any): Promise<ApiResponse<Booking>> => {
    const response: AxiosResponse<ApiResponse<Booking>> = await api.put(`/bookings/${id}`, updateData);
    return response.data;
  },
};

// Reviews API
export const reviewsAPI = {
  createReview: async (reviewData: any): Promise<ApiResponse<Review>> => {
    const response: AxiosResponse<ApiResponse<Review>> = await api.post('/reviews', reviewData);
    return response.data;
  },

  getReviews: async (filters?: any): Promise<ApiResponse<Review[]>> => {
    const response: AxiosResponse<any> = await api.get('/reviews', {
      params: filters,
    });

    // Backend returns: { success, count, total, pagination, data: Review[] }
    // We need to normalize this to match the expected format
    const raw = response.data || {};

    let reviews: Review[] = [];
    let pagination: any = raw.pagination || null;

    if (Array.isArray(raw.data)) {
      reviews = raw.data;
    } else if (Array.isArray(raw.reviews)) {
      reviews = raw.reviews;
    } else if (Array.isArray(raw)) {
      reviews = raw;
    }

    return {
      success: raw.success !== undefined ? raw.success : true,
      message: raw.message,
      data: reviews,
      pagination
    } as any;
  },

  getUserReviews: async (): Promise<ApiResponse<Review[]>> => {
    const response: AxiosResponse<ApiResponse<Review[]>> = await api.get('/reviews/my-reviews');
    return response.data;
  },

  updateReview: async (id: string, reviewData: any): Promise<ApiResponse<Review>> => {
    const response: AxiosResponse<ApiResponse<Review>> = await api.put(`/reviews/${id}`, reviewData);
    return response.data;
  },

  deleteReview: async (id: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/reviews/${id}`);
    return response.data;
  },

  addHelpfulVote: async (id: string, vote: 'helpful' | 'notHelpful'): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/reviews/${id}/vote`, { vote });
    return response.data;
  },

  canReviewBooking: async (bookingId: string): Promise<ApiResponse<{
    canReview: boolean;
    reason?: string;
    message: string;
    existingReview?: {
      id: string;
      title: string;
      rating: number;
      createdAt: string;
      isApproved: boolean;
    };
    booking?: {
      id: string;
      bookingId: string;
      room: any;
      checkOutDate: string;
    };
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      canReview: boolean;
      reason?: string;
      message: string;
      existingReview?: {
        id: string;
        title: string;
        rating: number;
        createdAt: string;
        isApproved: boolean;
      };
      booking?: {
        id: string;
        bookingId: string;
        room: any;
        checkOutDate: string;
      };
    }>> = await api.get(`/reviews/can-review/${bookingId}`);
    return response.data;
  },
};

// Payments API
export const paymentsAPI = {
  createPayment: async (paymentData: any): Promise<ApiResponse<Payment>> => {
    const response: AxiosResponse<ApiResponse<Payment>> = await api.post('/payments/create', paymentData);
    return response.data;
  },

  createPaymentIntent: async (paymentData: any): Promise<ApiResponse<{ clientSecret?: string; amount: number; currency: string; bookingId: string; paymentMethod: string }>> => {
    const response: AxiosResponse<ApiResponse<{ clientSecret?: string; amount: number; currency: string; bookingId: string; paymentMethod: string }>> = await api.post('/payments/create-intent', paymentData);
    return response.data;
  },

  confirmPayment: async (paymentData: any): Promise<ApiResponse<{ payment: Payment; booking: any }>> => {
    const response: AxiosResponse<ApiResponse<{ payment: Payment; booking: any }>> = await api.post('/payments/confirm', paymentData);
    return response.data;
  },

  getPayments: async (filters?: any): Promise<ApiResponse<{ payments: Payment[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ payments: Payment[]; pagination: any }>> = await api.get('/payments', {
      params: filters,
    });
    return response.data;
  },

  getPaymentById: async (id: string): Promise<ApiResponse<Payment>> => {
    const response: AxiosResponse<ApiResponse<Payment>> = await api.get(`/payments/${id}`);
    return response.data;
  },

  getPaymentInvoice: async (id: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get(`/payments/${id}/invoice`);
    return response.data;
  },

  processRefund: async (id: string, refundData: any): Promise<ApiResponse<Payment>> => {
    const response: AxiosResponse<ApiResponse<Payment>> = await api.post(`/payments/${id}/refund`, refundData);
    return response.data;
  },

  // Admin only
  getAllPayments: async (filters?: any): Promise<ApiResponse<{ payments: Payment[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ payments: Payment[]; pagination: any }>> = await api.get('/payments/admin/all', {
      params: filters,
    });
    return response.data;
  },

  // Legacy methods for backward compatibility
  verifyPayment: async (paymentId: string, verificationData: any): Promise<ApiResponse<Payment>> => {
    const response: AxiosResponse<ApiResponse<Payment>> = await api.post(`/payments/${paymentId}/verify`, verificationData);
    return response.data;
  },

  getPaymentHistory: async (): Promise<ApiResponse<Payment[]>> => {
    const response: AxiosResponse<ApiResponse<Payment[]>> = await api.get('/payments/history');
    return response.data;
  },

  downloadInvoice: async (paymentId: string): Promise<Blob> => {
    const response = await api.get(`/payments/${paymentId}/invoice`, {
      responseType: 'blob',
    });
    return response.data;
  },

  requestRefund: async (paymentId: string, reason: string, amount?: number): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post(`/payments/${paymentId}/refund`, {
      reason,
      amount,
    });
    return response.data;
  },

  // Razorpay integration
  createRazorpayOrder: async (amount: number, currency: string = 'INR', bookingDetails?: any): Promise<ApiResponse<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
    }>> = await api.post('/payments/razorpay/create-order', {
      amount,
      currency,
      bookingDetails
    });
    return response.data;
  },

  verifyRazorpayPayment: async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    bookingData?: any;
  }): Promise<ApiResponse<{
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    email: string;
    contact: string;
  }>> => {
    const response: AxiosResponse<ApiResponse<{
      orderId: string;
      paymentId: string;
      amount: number;
      currency: string;
      status: string;
      method: string;
      email: string;
      contact: string;
    }>> = await api.post('/payments/razorpay/verify', paymentData);
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  getDashboardStats: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/admin/dashboard');
    return response.data;
  },

  getAllBookings: async (filters?: any): Promise<ApiResponse<{ bookings: Booking[]; pagination: any }>> => {
    const response: AxiosResponse<any> = await api.get('/admin/bookings', {
      params: filters,
    });

    const raw = response.data || {};

    // Backend returns: { success, count, total, pagination, data: Booking[] }
    // Normalize to: { success, data: { bookings: Booking[]; pagination } }
    let bookings: Booking[] = [];
    let pagination: any = raw.pagination || null;

    if (Array.isArray(raw.data)) {
      bookings = raw.data as Booking[];
    } else if (raw.data && Array.isArray(raw.data.bookings)) {
      bookings = raw.data.bookings as Booking[];
      pagination = raw.data.pagination || pagination;
    } else if (Array.isArray(raw.bookings)) {
      bookings = raw.bookings as Booking[];
    }

    // Map _id to id field for frontend compatibility
    bookings = bookings.map(booking => ({
      ...booking,
      id: booking._id || booking.id
    }));

    return {
      success: raw.success !== undefined ? raw.success : true,
      message: raw.message,
      data: {
        bookings,
        pagination,
      },
    } as ApiResponse<{ bookings: Booking[]; pagination: any }>;
  },

  updateBookingStatus: async (id: string, status: string): Promise<ApiResponse<Booking>> => {
    const response: AxiosResponse<ApiResponse<Booking>> = await api.put(`/admin/bookings/${id}/status`, { status });
    return response.data;
  },

  getAllUsers: async (filters?: any): Promise<ApiResponse<{ users: User[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ users: User[]; pagination: any }>> = await api.get('/users', {
      params: filters,
    });
    return response.data;
  },

  updateUserStatus: async (id: string, isActive: boolean): Promise<ApiResponse<User>> => {
    const response: AxiosResponse<ApiResponse<User>> = await api.put(`/admin/users/${id}/status`, { isActive });
    return response.data;
  },

  // Customer API
  getCustomers: async (filters?: any): Promise<ApiResponse<{ customers: any[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ customers: any[]; pagination: any }>> = await api.get('/customers', {
      params: filters,
    });
    return response.data;
  },

  addCustomer: async (customerData: any): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/customers', customerData);
    return response.data;
  },

  deleteCustomer: async (id: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/customers/${id}`);
    return response.data;
  },

  moderateReview: async (id: string, action: 'approve' | 'reject' | 'hide'): Promise<ApiResponse<Review>> => {
    const response: AxiosResponse<ApiResponse<Review>> = await api.put(`/admin/reviews/${id}/moderate`, { action });
    return response.data;
  },

  generateReport: async (type: 'daily' | 'monthly', startDate: string, endDate: string): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/admin/reports', {
      params: { type, startDate, endDate },
    });
    return response.data;
  },

  uploadImage: async (formData: FormData): Promise<ApiResponse<{ imageUrl: string }>> => {
    const response: AxiosResponse<ApiResponse<{ imageUrl: string }>> = await api.post('/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Contact API
export const contactAPI = {
  sendMessage: async (messageData: { name: string; email: string; subject: string; message: string }): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/contact', messageData);
    return response.data;
  },
};

// Newsletter API
export const newsletterAPI = {
  subscribe: async (email: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/newsletter/subscribe', { email });
    return response.data;
  },

  unsubscribe: async (email: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.post('/newsletter/unsubscribe', { email });
    return response.data;
  },
};



export default api;