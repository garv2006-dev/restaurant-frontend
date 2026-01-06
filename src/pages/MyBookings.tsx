import React, { useEffect, useState } from 'react';
import { Table, Alert, Spinner, Button, Modal, Form, Toast, ToastContainer, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { bookingsAPI, reviewsAPI } from '../services/api';
import { Booking } from '../types';
import MyReviews from './MyReviews';  
import { useNotifications } from '../context/NotificationContext';

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [reviewStatuses, setReviewStatuses] = useState<{[key: string]: any}>({});
  
  const { refreshNotifications } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await bookingsAPI.getUserBookings();
        console.log('Bookings API response:', response);

        if (response?.success) {
          // Backend currently returns: { success, count, total, pagination, data: Booking[] }
          // Older shape was: { success, data: { bookings: Booking[] } }
          let bookingsData: Booking[] = [];

          if (Array.isArray(response.data)) {
            bookingsData = response.data as unknown as Booking[];
          } else if (response.data && Array.isArray((response.data as any).bookings)) {
            bookingsData = (response.data as any).bookings as Booking[];
          }

          console.log('Normalized bookings data:', bookingsData);
          setBookings(bookingsData);
          
          // Check review status for completed bookings
          checkReviewStatuses(bookingsData);
        } else {
          console.log('No bookings data found in response');
          setBookings([]);
        }
      } catch (err: any) {
        console.error('Error fetching bookings:', err);
        setError(
          err?.response?.data?.message || err?.message || 'Failed to load bookings'
        );
        // Set empty bookings on error to prevent infinite loading
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const checkReviewStatuses = async (bookings: Booking[]) => {
    console.log('🔍 Checking review statuses for bookings:', bookings.length);
    const statuses: {[key: string]: any} = {};
    
    // Only check review status for completed bookings
    const completedBookings = bookings.filter(b => b.status === 'CheckedOut');
    console.log('📋 Completed bookings to check:', completedBookings.length);
    
    if (completedBookings.length === 0) {
      console.log('⚠️ No completed bookings found');
      setReviewStatuses({});
      return;
    }

    // For now, let's use a simpler approach - check if user has any reviews for these bookings
    try {
      console.log('📋 Fetching user reviews to check status...');
      const userReviewsResponse = await reviewsAPI.getUserReviews();
      console.log('📦 User reviews response:', userReviewsResponse);
      
      let userReviews: any[] = [];
      if (userReviewsResponse.success && userReviewsResponse.data) {
        userReviews = Array.isArray(userReviewsResponse.data) ? userReviewsResponse.data : [];
      }
      
      console.log(`📊 Found ${userReviews.length} user reviews`);
      
      // Check each completed booking
      for (const booking of completedBookings) {
        const existingReview = userReviews.find(review => 
          review.booking === booking._id || 
          (typeof review.booking === 'object' && review.booking?._id === booking._id)
        );
        
        if (existingReview) {
          console.log(`✓ Found existing review for booking ${booking._id}`);
          statuses[booking._id] = {
            canReview: false,
            reason: 'ALREADY_REVIEWED',
            existingReview: {
              id: existingReview._id,
              title: existingReview.title,
              rating: existingReview.rating,
              createdAt: existingReview.createdAt,
              isApproved: existingReview.isApproved
            }
          };
        } else {
          console.log(`✅ No existing review for booking ${booking._id}, can review`);
          statuses[booking._id] = { canReview: true };
        }
      }
      
      console.log('📊 Final review statuses:', statuses);
      setReviewStatuses(statuses);
      
    } catch (error: any) {
      console.error('❌ Error checking review statuses:', error);
      // Fallback: allow all completed bookings to be reviewed
      const defaultStatuses: {[key: string]: any} = {};
      completedBookings.forEach(booking => {
        defaultStatuses[booking._id] = { canReview: true };
      });
      setReviewStatuses(defaultStatuses);
    }
  };

  const handleCancelClick = (booking: Booking) => {
    console.log('Cancel button clicked for booking:', booking._id);
    console.log('Booking details:', booking);
    setSelectedBooking(booking);
    setShowCancelModal(true);
    setCancelReason('');
    setError(null); // Clear any previous errors
  };

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;

    try {
      console.log('Attempting to cancel booking:', selectedBooking._id);
      setCancelLoading(selectedBooking._id);
      
      const response = await bookingsAPI.cancelBooking(selectedBooking._id, cancelReason || 'Customer cancellation');
      console.log('Cancel booking response:', response);
      
      if (response?.success) {
        console.log('Booking cancelled successfully');
        // Update the booking in the local state
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking._id === selectedBooking._id 
              ? { ...booking, status: 'Cancelled' }
              : booking
          )
        );
        setShowCancelModal(false);
        setSelectedBooking(null);
        setCancelReason('');
        setError(null); // Clear any previous errors
        
        // Show success message
        setSuccessMessage(`Booking ${selectedBooking.bookingId} has been cancelled successfully!`);
        setShowSuccessToast(true);
        
        // Refresh notifications to show the cancellation notification
        refreshNotifications();
        
        // Auto-hide success toast after 5 seconds
        setTimeout(() => setShowSuccessToast(false), 5000);
      } else {
        console.error('Cancel booking failed:', response?.message);
        setError(response?.message || 'Failed to cancel booking');
      }
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      console.error('Error response:', err?.response);
      console.error('Error data:', err?.response?.data);
      setError(err?.response?.data?.message || err?.message || 'Failed to cancel booking');
    } finally {
      setCancelLoading(null);
    }
  };

  const handleCloseModal = () => {
    setShowCancelModal(false);
    setSelectedBooking(null);
    setCancelReason('');
  };

  const canCancelBooking = (booking: Booking): boolean => {
    return booking.status === 'Pending' || booking.status === 'Confirmed';
  };

  const renderReviewAction = (booking: Booking) => {
    console.log(`🎯 Rendering review action for booking ${booking._id}, status: ${booking.status}`);
    
    if (booking.status !== 'CheckedOut') {
      console.log(`⏭️ Booking ${booking._id} not checked out, showing dash`);
      return <span className="text-muted">-</span>;
    }

    const reviewStatus = reviewStatuses[booking._id];
    console.log(`📊 Review status for ${booking._id}:`, reviewStatus);
    
    if (!reviewStatus) {
      console.log(`⏳ No review status yet for ${booking._id}, showing spinner`);
      return <Spinner animation="border" size="sm" />;
    }

    if (reviewStatus.canReview) {
      console.log(`✅ Can review booking ${booking._id}, showing Review button`);
      return (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => {
            console.log(`🖱️ Review button clicked for booking ${booking._id}, navigating to WriteReview`);
            navigate(`/reviews`);
          }}
        >
          Review
        </Button>
      );
    } else if (reviewStatus.reason === 'ALREADY_REVIEWED') {
      console.log(`✓ Already reviewed booking ${booking._id}, showing badge`);
      return (
        <div>
          <Badge bg="success" className="mb-1">✓ Reviewed</Badge>
          <br />
          <small className="text-muted">
            {reviewStatus.existingReview?.rating}⭐ - {reviewStatus.existingReview?.isApproved ? 'Published' : 'Pending'}
          </small>
        </div>
      );
    } else {
      console.log(`❌ Cannot review booking ${booking._id}, reason: ${reviewStatus.reason}`);
      return <Badge bg="secondary">Cannot Review</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container py-5 d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" /> <span>Loading bookings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4">My Bookings</h2>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {bookings && bookings.length === 0 ? (
        <Alert variant="info" className="d-flex align-items-center justify-content-between">
          <span>You have no bookings yet.</span>
          <Button as={Link as any} to="/booking" variant="primary" size="sm">Create Booking</Button>
        </Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings && bookings.map ? bookings.map((b, idx) => {
              // Handle both string and object room references
              const room = typeof b.room === 'object' && b.room !== null ? b.room : null;
              const roomLabel = room ? `${room.name || ''} ${room.type ? `(${room.type})` : ''}`.trim() : 'Unknown Room';
              const ci = new Date(b.bookingDates.checkInDate).toLocaleDateString();
              const co = new Date(b.bookingDates.checkOutDate).toLocaleDateString();
              const nights = b.bookingDates.nights || 0;
              const total = `₹${b.pricing.totalAmount?.toFixed(2) || '0.00'}`;
              return (
                <tr key={b._id}>
                  <td>{idx + 1}</td>
                  <td>{roomLabel}</td>
                  <td>{ci}</td>
                  <td>{co}</td>
                  <td>{b.guestDetails.totalAdults + b.guestDetails.totalChildren} Guests</td>
                  <td>{b.status || 'Pending'}</td>
                  <td>{total}</td>
                  <td>
                    {canCancelBooking(b) ? (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleCancelClick(b)}
                        disabled={cancelLoading === b._id}
                        className="me-2"
                      >
                        {cancelLoading === b._id ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-1" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel'
                        )}
                      </Button>
                    ) : (
                      renderReviewAction(b)
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} className="text-center">
                  No booking data available
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
      
      {/* Cancel Confirmation Modal */}
      <Modal show={showCancelModal} onHide={handleCloseModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to cancel this booking?</p>
          {selectedBooking && (
            <div className="mb-3">
              <strong>Booking Details:</strong>
              <ul className="mt-2">
                <li>Room: {typeof selectedBooking.room === 'object' && selectedBooking.room !== null 
                  ? `${selectedBooking.room.name || ''}`.trim() 
                  : 'Unknown Room'}</li>
                <li>Check-in: {new Date(selectedBooking.bookingDates.checkInDate).toLocaleDateString()}</li>
                <li>Check-out: {new Date(selectedBooking.bookingDates.checkOutDate).toLocaleDateString()}</li>
                <li>Total: ₹{selectedBooking.pricing.totalAmount?.toFixed(2) || '0.00'}</li>
              </ul>
            </div>
          )}
          <Form.Group>
            <Form.Label>Reason for cancellation (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason for cancellation..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Keep Booking
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancelConfirm}
            disabled={cancelLoading !== null}
          >
            {cancelLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Cancelling...
              </>
            ) : (
              'Cancel Booking'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Success Toast */}
      <ToastContainer position="top-end" className="p-3">
        <Toast show={showSuccessToast} onClose={() => setShowSuccessToast(false)} bg="success">
          <Toast.Header>
            <strong className="me-auto">✅ Success</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {successMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default MyBookings;