/**
 * Real-Time Notification Service
 * Handles real-time notifications from backend and displays them with sound
 */



interface RealTimeNotification {
  id: string;
  type: 'room_booking' | 'promotion' | 'payment' | 'system';
  title: string;
  message: string;
  userId?: string;
  timestamp: Date;
  data?: any;
}

class RealTimeNotificationService {
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the real-time notification service
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Listen for socket notifications
    this.setupSocketListeners();

    // Listen for backend notifications
    this.setupBackendListeners();

    this.isInitialized = true;
    console.log('Real-time notification service initialized');
  }

  /**
   * Setup socket.io listeners for real-time notifications
   */
  private setupSocketListeners(): void {
    // Listen for custom socket events
    window.addEventListener('socketNotification', this.handleSocketNotification.bind(this) as EventListener);

    // Listen for booking notifications
    window.addEventListener('bookingNotification', this.handleBookingNotification.bind(this) as EventListener);

    // Listen for payment notifications
    window.addEventListener('paymentNotification', this.handlePaymentNotification.bind(this) as EventListener);

    // Listen for promotion notifications
    window.addEventListener('promotionNotification', this.handlePromotionNotification.bind(this) as EventListener);

    // Listen for system notifications
    window.addEventListener('systemNotification', this.handleSystemNotification.bind(this) as EventListener);
  }

  /**
   * Setup backend API listeners
   */
  private setupBackendListeners(): void {
    // Listen for API-triggered notifications
    window.addEventListener('apiNotification', this.handleApiNotification.bind(this) as EventListener);
  }

  /**
   * Handle socket notifications
   */
  private handleSocketNotification(event: Event): void {
    const customEvent = event as CustomEvent;
    const notification = customEvent.detail;
    this.processNotification({
      id: notification.id || Date.now().toString(),
      type: notification.type || 'system',
      title: notification.title || 'New Notification',
      message: notification.message || '',
      userId: notification.userId,
      timestamp: new Date(notification.timestamp || Date.now()),
      data: notification.data
    });
  }

  /**
   * Handle booking notifications
   */
  private handleBookingNotification(event: Event): void {
    const customEvent = event as CustomEvent;
    const data = customEvent.detail;
    this.processNotification({
      id: data.bookingId || Date.now().toString(),
      type: 'room_booking',
      title: data.title || 'Booking Update',
      message: data.message || 'Your booking has been updated',
      userId: data.userId,
      timestamp: new Date(),
      data: data
    });
  }

  /**
   * Handle payment notifications
   */
  private handlePaymentNotification(event: Event): void {
    const customEvent = event as CustomEvent;
    const data = customEvent.detail;
    this.processNotification({
      id: data.paymentId || Date.now().toString(),
      type: 'payment',
      title: data.title || 'Payment Update',
      message: data.message || 'Your payment has been processed',
      userId: data.userId,
      timestamp: new Date(),
      data: data
    });
  }

  /**
   * Handle promotion notifications
   */
  private handlePromotionNotification(event: Event): void {
    const customEvent = event as CustomEvent;
    const data = customEvent.detail;
    this.processNotification({
      id: data.promotionId || Date.now().toString(),
      type: 'promotion',
      title: data.title || 'Special Offer',
      message: data.message || 'New promotion available',
      userId: data.userId,
      timestamp: new Date(),
      data: data
    });
  }

  /**
   * Handle system notifications
   */
  private handleSystemNotification(event: Event): void {
    const customEvent = event as CustomEvent;
    const data = customEvent.detail;
    this.processNotification({
      id: data.id || Date.now().toString(),
      type: 'system',
      title: data.title || 'System Update',
      message: data.message || 'System notification',
      userId: data.userId,
      timestamp: new Date(),
      data: data
    });
  }

  /**
   * Handle API notifications
   */
  private handleApiNotification(event: Event): void {
    const customEvent = event as CustomEvent;
    const notification = customEvent.detail;
    this.processNotification(notification);
  }

  /**
   * Process and display notification
   */
  private processNotification(notification: RealTimeNotification): void {
    console.log('📬 Processing real-time notification:', notification);

    // Display the notification
    this.displayNotification(notification);

    // NOTE: Sound is now handled by NotificationContext to avoid duplication
    // The NotificationContext will play sound for real-time notifications
    console.log('✅ Notification processed (sound handled by NotificationContext)');

    // Store in local storage for persistence (optional)
    this.storeNotification(notification);
  }

  /**
   * Display notification using the NotificationDisplay component
   */
  private displayNotification(notification: RealTimeNotification): void {
    const displayEvent = new CustomEvent('newNotification', {
      detail: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp,
        autoHide: true,
        duration: this.getNotificationDuration(notification.type)
      }
    });

    window.dispatchEvent(displayEvent);
  }

  /**
   * Get notification duration based on type
   */
  private getNotificationDuration(type: string): number {
    switch (type) {
      case 'room_booking':
        return 8000; // 8 seconds for important booking notifications
      case 'payment':
        return 7000; // 7 seconds for payment notifications
      case 'promotion':
        return 6000; // 6 seconds for promotions
      case 'system':
        return 5000; // 5 seconds for system notifications
      default:
        return 5000;
    }
  }

  /**
   * Store notification for persistence
   */
  private storeNotification(notification: RealTimeNotification): void {
    try {
      const stored = localStorage.getItem('recentNotifications');
      const notifications = stored ? JSON.parse(stored) : [];

      // Add new notification
      notifications.unshift({
        ...notification,
        timestamp: notification.timestamp.toISOString()
      });

      // Keep only last 50 notifications
      const limited = notifications.slice(0, 50);

      localStorage.setItem('recentNotifications', JSON.stringify(limited));
    } catch (error) {
      console.warn('Failed to store notification:', error);
    }
  }

  /**
   * Trigger a booking notification
   */
  public triggerBookingNotification(data: {
    bookingId: string;
    title: string;
    message: string;
    userId?: string;
  }): void {
    const event = new CustomEvent('bookingNotification', { detail: data });
    window.dispatchEvent(event);
  }

  /**
   * Trigger a payment notification
   */
  public triggerPaymentNotification(data: {
    paymentId: string;
    title: string;
    message: string;
    amount?: number;
    userId?: string;
  }): void {
    const event = new CustomEvent('paymentNotification', { detail: data });
    window.dispatchEvent(event);
  }

  /**
   * Trigger a promotion notification
   */
  public triggerPromotionNotification(data: {
    promotionId: string;
    title: string;
    message: string;
    discount?: number;
    userId?: string;
  }): void {
    const event = new CustomEvent('promotionNotification', { detail: data });
    window.dispatchEvent(event);
  }

  /**
   * Trigger a system notification
   */
  public triggerSystemNotification(data: {
    title: string;
    message: string;
    userId?: string;
  }): void {
    const event = new CustomEvent('systemNotification', { detail: data });
    window.dispatchEvent(event);
  }

  /**
   * Get recent notifications from storage
   */
  public getRecentNotifications(): RealTimeNotification[] {
    try {
      const stored = localStorage.getItem('recentNotifications');
      if (!stored) return [];

      const notifications = JSON.parse(stored);
      return notifications.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }));
    } catch (error) {
      console.warn('Failed to get recent notifications:', error);
      return [];
    }
  }

  /**
   * Clear stored notifications
   */
  public clearStoredNotifications(): void {
    try {
      localStorage.removeItem('recentNotifications');
    } catch (error) {
      console.warn('Failed to clear stored notifications:', error);
    }
  }
}

// Export singleton instance
export const realTimeNotificationService = new RealTimeNotificationService();
export default realTimeNotificationService;