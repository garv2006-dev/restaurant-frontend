import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User, Room, Booking, MenuItem, Review, Payment, LoginCredentials, RegisterData } from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials, userType?: 'admin' | 'user'): Promise<{ success: boolean; user?: User; token?: string; message?: string; userType?: string }> => {
    const response = await api.post('/auth/login', { ...credentials, userType });
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
    const response: AxiosResponse<ApiResponse<{ rooms: Room[]; pagination: any }>> = await api.get('/rooms', {
      params: filters,
    });
    return response.data;
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
  createBooking: async (bookingData: any): Promise<ApiResponse<Booking>> => {
    const response: AxiosResponse<ApiResponse<Booking>> = await api.post('/bookings', bookingData);
    return response.data;
  },

  getUserBookings: async (): Promise<ApiResponse<{ bookings: Booking[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ bookings: Booking[]; pagination: any }>> = await api.get('/bookings');
    return response.data;
  },

  getBookingById: async (id: string): Promise<ApiResponse<Booking>> => {
    const response: AxiosResponse<ApiResponse<Booking>> = await api.get(`/bookings/${id}`);
    return response.data;
  },

  cancelBooking: async (id: string, reason?: string): Promise<ApiResponse<Booking>> => {
    const response: AxiosResponse<ApiResponse<Booking>> = await api.put(`/bookings/${id}/cancel`, { reason });
    return response.data;
  },

  updateBooking: async (id: string, updateData: any): Promise<ApiResponse<Booking>> => {
    const response: AxiosResponse<ApiResponse<Booking>> = await api.put(`/bookings/${id}`, updateData);
    return response.data;
  },
};

// Menu API
export const menuAPI = {
  getMenuItems: async (filters?: any): Promise<ApiResponse<{ items: MenuItem[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ items: MenuItem[]; pagination: any }>> = await api.get('/menu', {
      params: filters,
    });
    return response.data;
  },

  getMenuItemById: async (id: string): Promise<ApiResponse<MenuItem>> => {
    const response: AxiosResponse<ApiResponse<MenuItem>> = await api.get(`/menu/${id}`);
    return response.data;
  },

  getMenuCategories: async (): Promise<ApiResponse<string[]>> => {
    const response: AxiosResponse<ApiResponse<string[]>> = await api.get('/menu/categories');
    return response.data;
  },

  getFeaturedItems: async (): Promise<ApiResponse<MenuItem[]>> => {
    const response: AxiosResponse<ApiResponse<MenuItem[]>> = await api.get('/menu/featured');
    return response.data;
  },
};

// Reviews API
export const reviewsAPI = {
  createReview: async (reviewData: any): Promise<ApiResponse<Review>> => {
    const response: AxiosResponse<ApiResponse<Review>> = await api.post('/reviews', reviewData);
    return response.data;
  },

  getReviews: async (filters?: any): Promise<ApiResponse<{ reviews: Review[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ reviews: Review[]; pagination: any }>> = await api.get('/reviews', {
      params: filters,
    });
    return response.data;
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
};

// Payments API
export const paymentsAPI = {
  createPayment: async (paymentData: any): Promise<ApiResponse<{ paymentId: string; clientSecret?: string }>> => {
    const response: AxiosResponse<ApiResponse<{ paymentId: string; clientSecret?: string }>> = await api.post('/payments', paymentData);
    return response.data;
  },

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
};

// Admin API
export const adminAPI = {
  getDashboardStats: async (): Promise<ApiResponse<any>> => {
    const response: AxiosResponse<ApiResponse<any>> = await api.get('/admin/dashboard');
    return response.data;
  },

  getAllBookings: async (filters?: any): Promise<ApiResponse<{ bookings: Booking[]; pagination: any }>> => {
    const response: AxiosResponse<ApiResponse<{ bookings: Booking[]; pagination: any }>> = await api.get('/admin/bookings', {
      params: filters,
    });
    return response.data;
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
  
  createRoom: async (roomData: any): Promise<ApiResponse<Room>> => {
    const response: AxiosResponse<ApiResponse<Room>> = await api.post('/admin/rooms', roomData);
    return response.data;
  },
  
  updateRoom: async (id: string, roomData: any): Promise<ApiResponse<Room>> => {
    const response: AxiosResponse<ApiResponse<Room>> = await api.put(`/rooms/${id}`, roomData);
    return response.data;
  },

  deleteRoom: async (id: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/rooms/${id}`);
    return response.data;
  },

  createMenuItem: async (itemData: any): Promise<ApiResponse<MenuItem>> => {
    const response: AxiosResponse<ApiResponse<MenuItem>> = await api.post('/admin/menu', itemData);
    return response.data;
  },

  updateMenuItem: async (id: string, itemData: any): Promise<ApiResponse<MenuItem>> => {
    const response: AxiosResponse<ApiResponse<MenuItem>> = await api.put(`/admin/menu/${id}`, itemData);
    return response.data;
  },

  deleteMenuItem: async (id: string): Promise<ApiResponse> => {
    const response: AxiosResponse<ApiResponse> = await api.delete(`/admin/menu/${id}`);
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