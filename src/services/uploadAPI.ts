import axios, { AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // Longer timeout for file uploads
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

// Upload API
export const uploadAPI = {
  // Upload room images
  uploadRoomImages: async (roomId: string, files: File[]): Promise<any> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    const response = await api.post(`/upload/room/${roomId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload menu image
  uploadMenuImage: async (menuItemId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post(`/upload/menu/${menuItemId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete room image
  deleteRoomImage: async (roomId: string, imageId: string): Promise<any> => {
    const response = await api.delete(`/upload/room/${roomId}/image/${imageId}`);
    return response.data;
  },

  // Delete menu image
  deleteMenuImage: async (menuItemId: string): Promise<any> => {
    const response = await api.delete(`/upload/menu/${menuItemId}/image`);
    return response.data;
  },

  // Set primary room image
  setPrimaryRoomImage: async (roomId: string, imageId: string): Promise<any> => {
    const response = await api.put(`/upload/room/${roomId}/image/${imageId}/primary`);
    return response.data;
  },

  // Upload user avatar
  uploadAvatar: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete user avatar
  deleteAvatar: async (): Promise<any> => {
    const response = await api.delete('/upload/avatar');
    return response.data;
  },
};

export default api;
