// Utility function to trigger booking success notification
export const triggerBookingNotification = (bookingData: {
  bookingId: string;
  roomName: string;
  checkInDate: string;
  checkOutDate: string;
}) => {
  const event = new CustomEvent('bookingSuccess', {
    detail: bookingData
  });
  
  window.dispatchEvent(event);
};

// Utility function to show success message
export const showBookingSuccessMessage = (bookingId: string, roomName: string) => {
  // You can also show a toast or alert here
  console.log(`Booking ${bookingId} confirmed for ${roomName}`);
  
  // Trigger notification
  triggerBookingNotification({
    bookingId,
    roomName,
    checkInDate: new Date().toISOString(),
    checkOutDate: new Date().toISOString()
  });
};
