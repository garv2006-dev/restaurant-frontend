import React, { useState, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { X, Copy, Check, Calendar, Star, ShoppingBag, Clock } from 'lucide-react';
import { notificationSoundService } from '../../services/NotificationSoundService';
import { toast } from 'react-toastify';
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
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(new Set());

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'room_booking':
        return <Calendar size={18} className="notification-type-icon text-primary" />;
      case 'promotion':
        return <Star size={18} className="notification-type-icon text-warning" />;
      case 'payment':
        return <ShoppingBag size={18} className="notification-type-icon text-success" />;
      case 'system':
      default:
        return <Clock size={18} className="notification-type-icon text-secondary" />;
    }
  };

  // Extract promo code from notification message
  const extractPromoCode = (message: string): string | null => {
    // Match patterns like "Use code: XXXXX" or "Code: XXXXX"
    const codeMatch = message.match(/(?:Use code:|Code:)\s*([A-Z0-9]+)/i);
    return codeMatch ? codeMatch[1] : null;
  };

  // Handle copying promo code to clipboard
  const handleCopyPromoCode = async (code: string, notificationId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes(prev => new Set(prev).add(notificationId));
      toast.success('Promo code copied to clipboard!', {
        position: 'top-right',
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedCodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy promo code:', error);
      toast.error('Failed to copy code. Please try again.', {
        position: 'top-right',
        autoClose: 2000,
      });
    }
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
        // Check if notification with same ID already exists to prevent duplicates
        if (prev.some(n => n.id === newNotification.id)) {
          return prev;
        }
        const updated = [newNotification, ...prev];
        // Limit number of displayed notifications
        return updated.slice(0, maxNotifications);
      });

      // Play sound if enabled
      if (notificationSoundService.isSoundEnabled()) {
        notificationSoundService.playNotificationSound(newNotification.type);
      }
    };



    // Listen for manual notifications
    const handleManualNotification = (event: CustomEvent) => {
      handleNewNotification(event);
    };


    window.addEventListener('showNotification', handleManualNotification as EventListener);
    window.addEventListener('newNotification', handleNewNotification as EventListener);

    return () => {

      window.removeEventListener('showNotification', handleManualNotification as EventListener);
      window.removeEventListener('newNotification', handleNewNotification as EventListener);
    };
  }, [maxNotifications]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };




  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - timestamp.getTime()) / 1000));

    // Less than 1 minute
    if (diffInSeconds < 60) {
      return `${Math.max(1, diffInSeconds)}s`;
    }

    // Less than 1 hour
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }

    // Less than 24 hours
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }

    // Less than 7 days
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d`;
    }

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
            <Toast.Header className="notification-toast-header" closeButton={false}>
              <div className="notification-header-content">
                <div className="title-with-icon">
                  {getNotificationIcon(notification.type)}
                  <strong className="notification-title">
                    {notification.title}
                  </strong>
                  
                  {notification.type === 'promotion' && extractPromoCode(notification.message) && (
                    <span className="promo-code-header">
                      {extractPromoCode(notification.message)}
                    </span>
                  )}
                </div>

                {notification.type === 'promotion' && extractPromoCode(notification.message) && (
                  <button
                    className="copy-button-header"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyPromoCode(
                        extractPromoCode(notification.message)!,
                        notification.id
                      );
                    }}
                  >
                    {copiedCodes.has(notification.id) ? (
                      <><Check size={14} /> <span>COPIED</span></>
                    ) : (
                      <><Copy size={14} /> <span>COPY</span></>
                    )}
                  </button>
                )}
              </div>
              
              <div className="notification-meta">
                <small className="notification-time">
                  {formatTimestamp(notification.timestamp)}
                </small>
                <button
                  type="button"
                  className="notification-close"
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
              <div>
                <p className={`notification-message ${isExpanded ? 'expanded' : 'collapsed'}`}>
                  {notification.type === 'promotion' && extractPromoCode(notification.message)
                    ? (notification.message.split(/(?:Use code:|Code:)/i)[0].trim() || 
                       notification.message.replace(new RegExp(`(?:Use code:|Code:)\\s*${extractPromoCode(notification.message)}`, 'i'), '').trim())
                    : notification.message}
                </p>
                {!isExpanded && notification.message.length > 60 && (
                  <span className="notification-expand-hint">Click to read more...</span>
                )}
              </div>
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