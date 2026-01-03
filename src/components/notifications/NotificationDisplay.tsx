import React, { useState, useEffect } from 'react';
import { Toast, ToastContainer, Badge } from 'react-bootstrap';
import { X, Bell, Calendar, Star, ShoppingBag, Clock } from 'lucide-react';
import { notificationSoundService } from '../../services/NotificationSoundService';
import '../../styles/notification-display.css';

interface NotificationItem {
  id: string;
  type: 'room_booking' | 'promotion' | 'system' | 'payment';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
  duration?: number;
}

interface NotificationDisplayProps {
  position?: 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';
  maxNotifications?: number;
}

const NotificationDisplay: React.FC<NotificationDisplayProps> = ({ 
  position = 'top-end',
  maxNotifications = 5 
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    // Listen for new notifications from various sources
    const handleNewNotification = (event: CustomEvent) => {
      const notificationData = event.detail;
      
      const newNotification: NotificationItem = {
        id: notificationData.id || Date.now().toString(),
        type: notificationData.type || 'system',
        title: notificationData.title || 'New Notification',
        message: notificationData.message || '',
        timestamp: new Date(notificationData.timestamp || Date.now()),
        autoHide: notificationData.autoHide !== false, // Default to true
        duration: notificationData.duration || 5000
      };

      // Add notification to display
      setNotifications(prev => {
        const updated = [newNotification, ...prev];
        // Limit number of displayed notifications
        return updated.slice(0, maxNotifications);
      });

      // Play sound if enabled
      if (notificationSoundService.isSoundEnabled()) {
        notificationSoundService.playNotificationSound(newNotification.type);
      }
    };

    // Listen for socket notifications
    const handleSocketNotification = (event: CustomEvent) => {
      handleNewNotification(event);
    };

    // Listen for manual notifications
    const handleManualNotification = (event: CustomEvent) => {
      handleNewNotification(event);
    };

    window.addEventListener('socketNotification', handleSocketNotification as EventListener);
    window.addEventListener('showNotification', handleManualNotification as EventListener);
    window.addEventListener('newNotification', handleNewNotification as EventListener);

    return () => {
      window.removeEventListener('socketNotification', handleSocketNotification as EventListener);
      window.removeEventListener('showNotification', handleManualNotification as EventListener);
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, [maxNotifications]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'room_booking':
        return <Calendar size={18} className="notification-icon booking" />;
      case 'promotion':
        return <Star size={18} className="notification-icon promotion" />;
      case 'payment':
        return <ShoppingBag size={18} className="notification-icon payment" />;
      case 'system':
        return <Clock size={18} className="notification-icon system" />;
      default:
        return <Bell size={18} className="notification-icon default" />;
    }
  };

  const getNotificationVariant = (type: string) => {
    switch (type) {
      case 'room_booking':
        return 'primary';
      case 'promotion':
        return 'warning';
      case 'payment':
        return 'success';
      case 'system':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'room_booking':
        return 'Booking';
      case 'promotion':
        return 'Promotion';
      case 'payment':
        return 'Payment';
      case 'system':
        return 'System';
      default:
        return 'Notification';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <ToastContainer 
      position={position} 
      className="notification-display-container"
      style={{ zIndex: 9999 }}
    >
      {notifications.map((notification) => {
        const isExpanded = expandedNotifications.has(notification.id);
        
        return (
          <Toast
            key={notification.id}
            show={true}
            onClose={() => removeNotification(notification.id)}
            autohide={notification.autoHide}
            delay={notification.duration}
            className={`notification-toast ${notification.type} ${isExpanded ? 'expanded' : 'collapsed'}`}
          >
            <Toast.Header className="notification-toast-header">
              <div className="notification-header-content">
                <div className="notification-title-section">
                  <strong className="notification-title">
                    {notification.title}
                  </strong>
                  <Badge 
                    bg={getNotificationVariant(notification.type)} 
                    className="notification-type-badge"
                  >
                    {getTypeLabel(notification.type)}
                  </Badge>
                </div>
              </div>
              <div className="notification-meta">
                <small className="notification-time">
                  {formatTimestamp(notification.timestamp)}
                </small>
                <button
                  type="button"
                  className="btn-close notification-close"
                  aria-label="Close"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </Toast.Header>
            <Toast.Body 
              className="notification-toast-body"
              onClick={() => toggleExpanded(notification.id)}
              style={{ cursor: 'pointer' }}
            >
              <p className={`notification-message ${isExpanded ? 'expanded' : 'collapsed'}`}>
                {notification.message}
              </p>
              {!isExpanded && notification.message.length > 60 && (
                <span className="notification-expand-hint">Click to read more...</span>
              )}
            </Toast.Body>
          </Toast>
        );
      })}
    </ToastContainer>
  );
};

// Helper function to show notifications programmatically
export const showNotification = (notification: Partial<NotificationItem>) => {
  const event = new CustomEvent('showNotification', {
    detail: {
      id: Date.now().toString(),
      type: 'system',
      title: 'Notification',
      message: '',
      timestamp: new Date(),
      autoHide: true,
      duration: 5000,
      ...notification
    }
  });
  
  window.dispatchEvent(event);
};

// Helper function to show different types of notifications
export const NotificationHelpers = {
  showBooking: (title: string, message: string, options?: Partial<NotificationItem>) => {
    showNotification({
      type: 'room_booking',
      title,
      message,
      ...options
    });
  },

  showPromotion: (title: string, message: string, options?: Partial<NotificationItem>) => {
    showNotification({
      type: 'promotion',
      title,
      message,
      ...options
    });
  },

  showPayment: (title: string, message: string, options?: Partial<NotificationItem>) => {
    showNotification({
      type: 'payment',
      title,
      message,
      ...options
    });
  },

  showSystem: (title: string, message: string, options?: Partial<NotificationItem>) => {
    showNotification({
      type: 'system',
      title,
      message,
      ...options
    });
  },

  // Test notifications
  showTestNotification: () => {
    const types: Array<'room_booking' | 'promotion' | 'payment' | 'system'> = 
      ['room_booking', 'promotion', 'payment', 'system'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const messages = {
      room_booking: {
        title: 'New Booking Confirmed',
        message: 'Your room booking for Deluxe Suite has been confirmed for tomorrow.'
      },
      promotion: {
        title: 'Special Offer Available',
        message: 'Get 20% off on weekend bookings. Limited time offer!'
      },
      payment: {
        title: 'Payment Successful',
        message: 'Your payment of $299.99 has been processed successfully.'
      },
      system: {
        title: 'System Update',
        message: 'The system has been updated with new features and improvements.'
      }
    };

    showNotification({
      type: randomType,
      ...messages[randomType],
      timestamp: new Date()
    });
  }
};

export default NotificationDisplay;