import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Calendar, Star, MessageSquare, ShoppingBag, Clock } from 'lucide-react';

interface Notification {
  id: string;
  type: 'booking' | 'review' | 'promotion' | 'order' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon: React.ReactNode;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
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

  // Initialize with mock data and connect to socket
  useEffect(() => {
    // Initialize socket connection
    // socketService.connect();

    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'booking',
        title: 'Booking Confirmed',
        message: 'Your table reservation for 2 people on Dec 25, 2025 at 7:00 PM has been confirmed.',
        timestamp: new Date('2025-12-25T10:00:00'),
        read: false,
        icon: <Calendar size={16} className="text-primary" />
      },
      {
        id: '2',
        type: 'promotion',
        title: 'Special Holiday Offer!',
        message: 'Get 20% off on all main courses this Christmas weekend. Use code: HOLIDAY20',
        timestamp: new Date('2025-12-25T09:00:00'),
        read: false,
        icon: <Star size={16} className="text-warning" />
      },
      {
        id: '3',
        type: 'review',
        title: 'Review Response',
        message: 'The chef has responded to your recent review about the pasta dish.',
        timestamp: new Date('2025-12-24T18:30:00'),
        read: true,
        icon: <MessageSquare size={16} className="text-info" />
      },
      {
        id: '4',
        type: 'order',
        title: 'Order Delivered',
        message: 'Your online order #1234 has been successfully delivered. Enjoy your meal!',
        timestamp: new Date('2025-12-24T15:45:00'),
        read: true,
        icon: <ShoppingBag size={16} className="text-success" />
      },
      {
        id: '5',
        type: 'system',
        title: 'System Maintenance',
        message: 'Our system will undergo maintenance on Dec 26, 2025 from 2:00 AM to 4:00 AM.',
        timestamp: new Date('2025-12-24T12:00:00'),
        read: true,
        icon: <Clock size={16} className="text-secondary" />
      }
    ];
    setNotifications(mockNotifications);
  }, []);

  // Listen for real-time socket notifications
  useEffect(() => {
    const handleSocketNotification = (event: CustomEvent) => {
      console.log('Socket notification received:', event.detail);
      const notification = event.detail;
      
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp,
        read: false,
        icon: getNotificationIcon(notification.type)
      };
      
      console.log('Adding notification to list:', newNotification);
      setNotifications(prev => [newNotification, ...prev]);
    };

    // Listen for socket notifications
    window.addEventListener('socketNotification', handleSocketNotification as EventListener);
    
    return () => {
      window.removeEventListener('socketNotification', handleSocketNotification as EventListener);
    };
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar size={16} className="text-primary" />;
      case 'promotion':
        return <Star size={16} className="text-warning" />;
      case 'review':
        return <MessageSquare size={16} className="text-info" />;
      case 'order':
        return <ShoppingBag size={16} className="text-success" />;
      case 'system':
        return <Clock size={16} className="text-secondary" />;
      default:
        return <Clock size={16} className="text-secondary" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
