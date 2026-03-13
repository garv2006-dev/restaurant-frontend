import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Calendar, Star, ShoppingBag, Clock } from 'lucide-react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from './AuthContext';
import { notificationSoundService } from '../services/NotificationSoundService';

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
  // Sound control functions
  isSoundEnabled: () => boolean;
  setSoundEnabled: (enabled: boolean) => void;
  testNotificationSound: () => void;
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

  const { socket, isConnected, connectionTimestamp } = useSocket();
  const { user, isAuthenticated } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Track processed notification IDs to prevent duplicates across reconnects/refreshes
  const processedNotificationIds = useRef<Set<string>>(new Set());
  // Track if initial fetch has completed (to distinguish between initial load and real-time)
  const initialFetchComplete = useRef<boolean>(false);

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

  const fetchNotifications = useCallback(async (type?: string, isRead?: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (typeof isRead === 'boolean') params.append('isRead', isRead.toString());
      // Increase limit to ensure we get duplicates for filtering
      params.append('limit', '100');

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

      // Deduplicate notifications based on unique criteria
      const uniqueNotifications = notificationsData.filter((notif: Notification, index: number, self: Notification[]) =>
        index === self.findIndex((t) => (
          t.type === notif.type &&
          t.title === notif.title &&
          t.message === notif.message &&
          t.relatedRoomBookingId === notif.relatedRoomBookingId
        ))
      );

      // Mark all fetched notifications as processed to prevent sound on reconnect
      uniqueNotifications.forEach((notif: Notification) => {
        processedNotificationIds.current.add(notif.id);
      });

      setNotifications(uniqueNotifications);

      // Calculate unread count from unique notifications to ensure consistency
      // This overrides the backend count which might include duplicates
      const uniqueUnreadCount = uniqueNotifications.filter((n: Notification) => !n.read).length;
      setUnreadCount(uniqueUnreadCount);

      initialFetchComplete.current = true;
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);



  const markAsRead = useCallback(async (id: string) => {
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
  }, [API_URL]);

  const markAllAsRead = useCallback(async () => {
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
  }, [API_URL]);

  const deleteNotification = useCallback(async (id: string) => {
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
  }, [API_URL, notifications]);

  const clearAllNotifications = useCallback(async () => {
    try {
      await axios.delete(`${API_URL}/notifications/clear-all`, getAuthConfig());

      setNotifications([]);
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Error clearing all notifications:', err);
      setError(err.response?.data?.message || 'Failed to clear notifications');
    }
  }, [API_URL]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

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

  // Sound control functions
  const isSoundEnabled = () => {
    return notificationSoundService.isSoundEnabled();
  };

  const setSoundEnabled = (enabled: boolean) => {
    notificationSoundService.setSoundEnabled(enabled);
  };

  const testNotificationSound = () => {
    notificationSoundService.testSound();
  };

  // Handle new real-time notifications
  const handleNewNotification = useCallback((socketNotif: any) => {
    console.log('📬 Processing socket notification:', socketNotif);

    const notificationId = socketNotif.notificationId || socketNotif._id;

    // CRITICAL: Check if we've already processed this notification ID
    // This prevents duplicates on socket reconnect and page refresh
    if (notificationId && processedNotificationIds.current.has(notificationId)) {
      console.log('⚠️ Notification already processed, skipping:', notificationId);
      return;
    }

    // Calculate notification age
    const notificationCreatedAt = socketNotif.createdAt
      ? new Date(socketNotif.createdAt).getTime()
      : Date.now();
    const notificationAge = Date.now() - notificationCreatedAt;

    // CRITICAL: More lenient timing check for real-time notifications
    // Increased to 60 seconds to handle network delays and server processing time
    // This ensures notifications aren't missed due to timing issues
    const isRealTimeNotification =
      notificationAge < 60000 && // Created within last 60 seconds (increased from 30)
      initialFetchComplete.current; // Initial fetch has completed

    console.log('📊 Notification timing analysis:', {
      notificationId,
      createdAt: socketNotif.createdAt,
      age: notificationAge,
      connectionTimestamp,
      initialFetchComplete: initialFetchComplete.current,
      isRealTime: isRealTimeNotification
    });

    // Mark as processed
    if (notificationId) {
      processedNotificationIds.current.add(notificationId);
    }

    const newNotification: Notification = {
      id: notificationId || Date.now().toString(),
      type: socketNotif.type,
      title: socketNotif.title,
      message: socketNotif.message,
      timestamp: new Date(socketNotif.createdAt || Date.now()),
      read: false,
      icon: getNotificationIcon(socketNotif.type),
      relatedRoomBookingId: socketNotif.relatedRoomBookingId,
      roomId: socketNotif.roomId,
      bookingStatus: socketNotif.bookingStatus
    };

    // Double check against current state implementation using the Ref
    // This resolves the race condition where unreadCount increments but setNotifications filters out the duplicate
    const alreadyExistsInState = notificationsRef.current.some(n => n.id === newNotification.id);

    if (alreadyExistsInState) {
      console.log('Notification already in state (checked via ref), skipping:', newNotification.id);
      return;
    }

    // Add notification to state (check for duplicates in state as well)
    setNotifications(prev => {
      const exists = prev.some(n => n.id === newNotification.id);
      if (exists) {
        console.log('Notification already in state, skipping add:', newNotification.id);
        return prev;
      }
      return [newNotification, ...prev];
    });

    setUnreadCount(prev => prev + 1);

    // Play sound ONLY for real-time notifications
    if (isRealTimeNotification) {
      const soundEnabledTypes = ['promotion', 'room_booking', 'payment', 'system'];
      if (soundEnabledTypes.includes(socketNotif.type)) {
        console.log('🔊 Attempting to play sound for real-time notification:', socketNotif.type);

        // Use setTimeout with requestAnimationFrame for better timing
        setTimeout(() => {
          requestAnimationFrame(() => {
            notificationSoundService.playNotificationSound(socketNotif.type)
              .then(() => console.log('Sound played successfully'))
              .catch((error) => {
                console.error('Error playing notification sound:', error);
                console.error('Sound service state:', notificationSoundService.getAudioState());
              });
          });
        }, 100); // Small delay to ensure audio context is ready
      }
      console.log(' New REAL-TIME notification processed:', newNotification.id);

      // CONFIGURATION: Dispatch event to trigger Toast notification in NotificationDisplay
      // This is required because NotificationDisplay listens to window events, not context state
      const event = new CustomEvent('newNotification', {
        detail: {
          ...socketNotif,
          id: newNotification.id,
          // Ensure type and message are passed correctly for the toast
          type: socketNotif.type,
          message: socketNotif.message,
          title: socketNotif.title,
          timestamp: new Date()
        }
      });
      window.dispatchEvent(event);

    } else {
      console.log('Old/reconnect notification received (no sound):', newNotification.id);
    }
  }, [connectionTimestamp]);

  // Initialize notifications on mount
  useEffect(() => {
    // Only fetch notifications if user is authenticated
    if (isAuthenticated && user) {
      refreshNotifications();
    }
  }, [isAuthenticated, user, refreshNotifications]);

  // Setup global click handler to initialize audio if permission was granted
  useEffect(() => {
    const handleGlobalClick = async () => {
      const permissionState = notificationSoundService.getPermissionState();
      const isReady = notificationSoundService.isReady();

      // If permission was granted but audio not initialized, initialize it
      if (permissionState === 'granted' && !isReady) {
        console.log('Initializing audio on user interaction (permission already granted)');
        try {
          await notificationSoundService.initializeOnUserInteraction();
          console.log('Audio initialized successfully on click');
        } catch (error) {
          console.error('Failed to initialize audio on click:', error);
        }
      }
    };

    // Add listener with once: false to handle multiple attempts if needed
    document.addEventListener('click', handleGlobalClick, { passive: true });
    document.addEventListener('touchstart', handleGlobalClick, { passive: true });

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, []);

  // Note: Audio initialization is now handled by SoundPermissionToast
  // No automatic initialization on user interaction - user must explicitly grant permission

  // Socket.io real-time notification listener
  useEffect(() => {
    if (!socket || !isAuthenticated || !user) {
      console.log('Socket listener not ready:', {
        hasSocket: !!socket,
        isConnected,
        isAuthenticated,
        hasUser: !!user
      });
      return;
    }

    if (!isConnected) {
      console.log('Socket not connected yet, waiting...');
      return;
    }

    console.log('Setting up socket notification listeners for user:', user.id);
    console.log('Socket connection timestamp:', new Date(connectionTimestamp).toISOString());

    // Join user-specific room for notifications (backup join in case SocketContext didn't)
    const userId = user.id || (user as any)._id;
    socket.emit('join-user-room', userId);
    console.log('Joining user room from NotificationContext:', userId);

    // Listen for real-time notifications
    const handleNotification = (data: any) => {
      console.log('Socket notification received:', data);
      handleNewNotification(data);
    };

    // Listen for various notification events
    socket.on('notification', handleNotification);
    socket.on('new_notification', handleNotification);
    socket.on('user_notification', handleNotification);

    return () => {
      console.log('Cleaning up notification listeners (socket remains connected)');
      socket.off('notification', handleNotification);
      socket.off('new_notification', handleNotification);
      socket.off('user_notification', handleNotification);
    };
  }, [socket, isConnected, isAuthenticated, user, handleNewNotification, connectionTimestamp]); // Added handleNewNotification and connectionTimestamp to deps

  // Keep notificationsRef in sync with state for access in event handlers
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Legacy: Listen for custom events (backward compatibility)
  useEffect(() => {
    const handleSocketNotification = (event: CustomEvent) => {
      console.log('Legacy socket notification received:', event.detail);
      handleNewNotification(event.detail);
    };

    // Listen for socket notifications
    window.addEventListener('socketNotification', handleSocketNotification as EventListener);

    return () => {
      window.removeEventListener('socketNotification', handleSocketNotification as EventListener);
    };
  }, [handleNewNotification]);

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
      getUnreadCountByType,
      isSoundEnabled,
      setSoundEnabled,
      testNotificationSound
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
