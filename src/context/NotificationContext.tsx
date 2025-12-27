import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Calendar, Star, MessageSquare, ShoppingBag, Clock } from 'lucide-react';
import axios from 'axios';

interface Notification {
  id: string;
  type: 'room_booking' | 'promotion' | 'system' | 'payment';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon: React.ReactNode;
  relatedRoomBookingId?: string;
  roomId?: string;
  bookingStatus?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (type?: string, isRead?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  // New counting functions
  getNotificationCount: (type?: string, isRead?: boolean) => number;
  getUnreadCountByType: (type: string) => number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'room_booking':
        return <Calendar size={16} className="text-primary" />;
      case 'promotion':
        return <Star size={16} className="text-warning" />;
      case 'system':
        return <Clock size={16} className="text-secondary" />;
      case 'payment':
        return <ShoppingBag size={16} className="text-success" />;
      default:
        return <Clock size={16} className="text-secondary" />;
    }
  };

  const fetchNotifications = async (type?: string, isRead?: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (typeof isRead === 'boolean') params.append('isRead', isRead.toString());

      const response = await axios.get(`${API_URL}/notifications?${params}`, getAuthConfig());
      
      const notificationsData = response.data.data.map((notif: any) => ({
        id: notif._id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        timestamp: new Date(notif.createdAt),
        read: notif.isRead,
        icon: getNotificationIcon(notif.type),
        relatedRoomBookingId: notif.relatedRoomBookingId?._id,
        roomId: notif.roomId?._id,
        bookingStatus: notif.bookingStatus
      }));

      setNotifications(notificationsData);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/notifications/unread-count`, getAuthConfig());
      setUnreadCount(response.data.data.unreadCount);
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await axios.put(`${API_URL}/notifications/${id}/read`, {}, getAuthConfig());
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      setError(err.response?.data?.message || 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/mark-all-read`, {}, getAuthConfig());
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      setError(err.response?.data?.message || 'Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/notifications/${id}`, getAuthConfig());
      
      const deletedNotif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      
      if (deletedNotif && !deletedNotif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      console.error('Error deleting notification:', err);
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const clearAllNotifications = async () => {
    try {
      await axios.delete(`${API_URL}/notifications/clear-all`, getAuthConfig());
      
      setNotifications([]);
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error clearing all notifications:', err);
      setError(err.response?.data?.message || 'Failed to clear notifications');
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifications();
    await fetchUnreadCount();
  };

  // New counting functions
  const getNotificationCount = (type?: string, isRead?: boolean) => {
    let filtered = notifications;
    
    if (type) {
      filtered = filtered.filter(notif => notif.type === type);
    }
    
    if (typeof isRead === 'boolean') {
      filtered = filtered.filter(notif => notif.read === isRead);
    }
    
    return filtered.length;
  };

  const getUnreadCountByType = (type: string) => {
    return notifications.filter(notif => notif.type === type && !notif.read).length;
  };

  // Initialize notifications on mount
  useEffect(() => {
    refreshNotifications();
  }, []);

  // Listen for real-time socket notifications
  useEffect(() => {
    const handleSocketNotification = (event: CustomEvent) => {
      console.log('Socket notification received:', event.detail);
      const socketNotif = event.detail;
      
      const newNotification: Notification = {
        id: socketNotif.notificationId || Date.now().toString(),
        type: socketNotif.type,
        title: socketNotif.title,
        message: socketNotif.message,
        timestamp: new Date(),
        read: false,
        icon: getNotificationIcon(socketNotif.type)
      };
      
      console.log('Adding real-time notification:', newNotification);
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    // Listen for socket notifications
    window.addEventListener('socketNotification', handleSocketNotification as EventListener);
    
    return () => {
      window.removeEventListener('socketNotification', handleSocketNotification as EventListener);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      error,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
      refreshNotifications,
      getNotificationCount,
      getUnreadCountByType
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
