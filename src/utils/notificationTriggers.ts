/**
 * Notification Trigger Utilities
 * Helper functions to trigger notifications from various parts of the application
 */

import { realTimeNotificationService } from '../services/RealTimeNotificationService';

/**
 * Booking-related notification triggers
 */
export const BookingNotifications = {
  /**
   * Trigger when a booking is confirmed
   */
  bookingConfirmed: (bookingData: {
    bookingId: string;
    roomName: string;
    checkIn: string;
    checkOut: string;
    guestName?: string;
  }) => {
    realTimeNotificationService.triggerBookingNotification({
      bookingId: bookingData.bookingId,
      title: 'Booking Confirmed',
      message: `Your reservation for ${bookingData.roomName} from ${bookingData.checkIn} to ${bookingData.checkOut} has been confirmed.`,
      userId: bookingData.guestName
    });
  },

  /**
   * Trigger when a booking is cancelled
   */
  bookingCancelled: (bookingData: {
    bookingId: string;
    roomName: string;
    refundAmount?: number;
  }) => {
    realTimeNotificationService.triggerBookingNotification({
      bookingId: bookingData.bookingId,
      title: 'Booking Cancelled',
      message: `Your reservation for ${bookingData.roomName} has been cancelled.${bookingData.refundAmount ? ` Refund of $${bookingData.refundAmount} will be processed.` : ''}`,
    });
  },

  /**
   * Trigger when check-in is available
   */
  checkInAvailable: (bookingData: {
    bookingId: string;
    roomName: string;
  }) => {
    realTimeNotificationService.triggerBookingNotification({
      bookingId: bookingData.bookingId,
      title: 'Check-in Available',
      message: `Your room ${bookingData.roomName} is ready for check-in.`,
    });
  },

  /**
   * Trigger check-out reminder
   */
  checkOutReminder: (bookingData: {
    bookingId: string;
    roomName: string;
    checkOutTime: string;
  }) => {
    realTimeNotificationService.triggerBookingNotification({
      bookingId: bookingData.bookingId,
      title: 'Check-out Reminder',
      message: `Please remember to check out of ${bookingData.roomName} by ${bookingData.checkOutTime}.`,
    });
  }
};

/**
 * Payment-related notification triggers
 */
export const PaymentNotifications = {
  /**
   * Trigger when payment is successful
   */
  paymentSuccessful: (paymentData: {
    paymentId: string;
    amount: number;
    bookingId?: string;
    method: string;
  }) => {
    realTimeNotificationService.triggerPaymentNotification({
      paymentId: paymentData.paymentId,
      title: 'Payment Successful',
      message: `Your payment of $${paymentData.amount.toFixed(2)} via ${paymentData.method} has been processed successfully.`,
      amount: paymentData.amount
    });
  },

  /**
   * Trigger when payment fails
   */
  paymentFailed: (paymentData: {
    paymentId: string;
    amount: number;
    reason?: string;
  }) => {
    realTimeNotificationService.triggerPaymentNotification({
      paymentId: paymentData.paymentId,
      title: 'Payment Failed',
      message: `Your payment of $${paymentData.amount.toFixed(2)} could not be processed.${paymentData.reason ? ` Reason: ${paymentData.reason}` : ''}`,
      amount: paymentData.amount
    });
  },

  /**
   * Trigger when refund is processed
   */
  refundProcessed: (refundData: {
    paymentId: string;
    amount: number;
    bookingId?: string;
  }) => {
    realTimeNotificationService.triggerPaymentNotification({
      paymentId: refundData.paymentId,
      title: 'Refund Processed',
      message: `Your refund of $${refundData.amount.toFixed(2)} has been processed and will appear in your account within 3-5 business days.`,
      amount: refundData.amount
    });
  }
};

/**
 * Promotion-related notification triggers
 */
export const PromotionNotifications = {
  /**
   * Trigger for special offers
   */
  specialOffer: (promoData: {
    promotionId: string;
    title: string;
    discount: number;
    validUntil?: string;
    code?: string;
  }) => {
    realTimeNotificationService.triggerPromotionNotification({
      promotionId: promoData.promotionId,
      title: promoData.title,
      message: `Get ${promoData.discount}% off your next booking!${promoData.code ? ` Use code: ${promoData.code}` : ''}${promoData.validUntil ? ` Valid until ${promoData.validUntil}.` : ''}`,
      discount: promoData.discount
    });
  },

  /**
   * Trigger for loyalty rewards
   */
  loyaltyReward: (rewardData: {
    promotionId: string;
    points: number;
    rewardType: string;
  }) => {
    realTimeNotificationService.triggerPromotionNotification({
      promotionId: rewardData.promotionId,
      title: 'Loyalty Reward Earned',
      message: `Congratulations! You've earned ${rewardData.points} loyalty points and unlocked a ${rewardData.rewardType}.`,
    });
  },

  /**
   * Trigger for seasonal promotions
   */
  seasonalPromotion: (promoData: {
    promotionId: string;
    season: string;
    discount: number;
    description: string;
  }) => {
    realTimeNotificationService.triggerPromotionNotification({
      promotionId: promoData.promotionId,
      title: `${promoData.season} Special`,
      message: `${promoData.description} Save ${promoData.discount}% on your next stay!`,
      discount: promoData.discount
    });
  }
};

/**
 * System-related notification triggers
 */
export const SystemNotifications = {
  /**
   * Trigger for maintenance notifications
   */
  maintenanceNotice: (maintenanceData: {
    title: string;
    startTime: string;
    endTime: string;
    affectedServices?: string[];
  }) => {
    realTimeNotificationService.triggerSystemNotification({
      title: maintenanceData.title,
      message: `Scheduled maintenance from ${maintenanceData.startTime} to ${maintenanceData.endTime}.${maintenanceData.affectedServices ? ` Affected services: ${maintenanceData.affectedServices.join(', ')}.` : ''}`
    });
  },

  /**
   * Trigger for system updates
   */
  systemUpdate: (updateData: {
    version: string;
    features: string[];
  }) => {
    realTimeNotificationService.triggerSystemNotification({
      title: 'System Updated',
      message: `New version ${updateData.version} is now available with: ${updateData.features.join(', ')}.`
    });
  },

  /**
   * Trigger for service alerts
   */
  serviceAlert: (alertData: {
    service: string;
    status: 'down' | 'degraded' | 'restored';
    message?: string;
  }) => {
    const statusMessages = {
      down: 'is currently unavailable',
      degraded: 'is experiencing issues',
      restored: 'has been restored'
    };

    realTimeNotificationService.triggerSystemNotification({
      title: 'Service Alert',
      message: `${alertData.service} ${statusMessages[alertData.status]}.${alertData.message ? ` ${alertData.message}` : ''}`
    });
  },

  /**
   * Trigger for welcome messages
   */
  welcomeMessage: (userData: {
    name: string;
    isFirstTime?: boolean;
  }) => {
    realTimeNotificationService.triggerSystemNotification({
      title: userData.isFirstTime ? 'Welcome to Luxury Hotel!' : `Welcome back, ${userData.name}!`,
      message: userData.isFirstTime 
        ? 'Thank you for choosing us. Explore our services and enjoy your stay!'
        : 'We\'re glad to have you back. Check out our latest offers and services.'
    });
  }
};

/**
 * General notification trigger for custom notifications
 */
export const triggerCustomNotification = (notification: {
  type: 'room_booking' | 'promotion' | 'payment' | 'system';
  title: string;
  message: string;
  id?: string;
  userId?: string;
  data?: any;
}) => {
  const event = new CustomEvent('apiNotification', {
    detail: {
      id: notification.id || Date.now().toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      userId: notification.userId,
      timestamp: new Date(),
      data: notification.data
    }
  });

  window.dispatchEvent(event);
};

/**
 * Integration helpers for common scenarios
 */
export const NotificationIntegration = {
  /**
   * Handle successful booking creation
   */
  onBookingCreated: (booking: any) => {
    BookingNotifications.bookingConfirmed({
      bookingId: booking.id || booking._id,
      roomName: booking.room?.name || booking.roomType,
      checkIn: new Date(booking.checkInDate).toLocaleDateString(),
      checkOut: new Date(booking.checkOutDate).toLocaleDateString(),
      guestName: booking.guestName || booking.user?.name
    });
  },

  /**
   * Handle successful payment
   */
  onPaymentSuccess: (payment: any) => {
    PaymentNotifications.paymentSuccessful({
      paymentId: payment.id || payment._id,
      amount: payment.amount,
      bookingId: payment.bookingId,
      method: payment.method || 'Credit Card'
    });
  },

  /**
   * Handle user login
   */
  onUserLogin: (user: any, isFirstTime = false) => {
    SystemNotifications.welcomeMessage({
      name: user.name || user.firstName,
      isFirstTime
    });
  },

  /**
   * Handle promotion activation
   */
  onPromotionActivated: (promotion: any) => {
    PromotionNotifications.specialOffer({
      promotionId: promotion.id || promotion._id,
      title: promotion.title || 'Special Offer',
      discount: promotion.discount || promotion.percentage,
      validUntil: promotion.validUntil ? new Date(promotion.validUntil).toLocaleDateString() : undefined,
      code: promotion.code
    });
  }
};