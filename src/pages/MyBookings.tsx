import React, { useEffect, useState, useCallback } from 'react';
import { Table, Alert, Spinner, Button, Modal, Form, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { bookingsAPI, reviewsAPI } from '../services/api';
import { Booking } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useSocket } from '../contexts/SocketContext';

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [reviewStatuses, setReviewStatuses] = useState<{ [key: string]: any }>({});

  const { refreshNotifications } = useNotifications();
  const navigate = useNavigate();

  const { socket } = useSocket();

  // Helper to check review statuses
  const checkReviewStatuses = useCallback(async (bookingsList: Booking[]) => {
    console.log('🔍 Checking review statuses for bookings:', bookingsList.length);
    const statuses: { [key: string]: any } = {};

    // Only check review status for completed bookings
    const completedBookings = bookingsList.filter(b => b.status === 'CheckedOut');

    if (completedBookings.length === 0) {
      setReviewStatuses({});
      return;
    }

    try {
      const userReviewsResponse = await reviewsAPI.getUserReviews();
      let userReviews: any[] = [];
      if (userReviewsResponse.success && userReviewsResponse.data) {
        userReviews = Array.isArray(userReviewsResponse.data) ? userReviewsResponse.data : [];
      }

      for (const booking of completedBookings) {
        const existingReview = userReviews.find(review =>
          review.booking === booking._id ||
          (typeof review.booking === 'object' && review.booking?._id === booking._id)
        );

        if (existingReview) {
          statuses[booking._id] = {
            canReview: false,
            reason: 'ALREADY_REVIEWED',
            existingReview: {
              id: existingReview._id,
              rating: existingReview.rating,
              isApproved: existingReview.isApproved
            }
          };
        } else {
          statuses[booking._id] = { canReview: true };
        }
      }

      setReviewStatuses(statuses);
    } catch (error: any) {
      console.error('❌ Error checking review statuses:', error);
      const defaultStatuses: { [key: string]: any } = {};
      completedBookings.forEach(booking => {
        defaultStatuses[booking._id] = { canReview: true };
      });
      setReviewStatuses(defaultStatuses);
    }
  }, []);

  const fetchBookings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await bookingsAPI.getUserBookings();
      console.log('Bookings API response:', response);

      if (response?.success) {
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
      // Don't show error alert for background refreshes
      if (!silent) {
        setError(
          err?.response?.data?.message || err?.message || 'Failed to load bookings'
        );
        setBookings([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [checkReviewStatuses]);

  useEffect(() => {
    fetchBookings(false);
  }, [fetchBookings]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleBookingUpdate = (data: any) => {
      console.log('Booking update received:', data);
      fetchBookings(true);
    };

    socket.on('booking-status-change', handleBookingUpdate);
    socket.on('booking-update', handleBookingUpdate);
    // Removed 'notification' listener - NotificationContext handles all notifications

    return () => {
      socket.off('booking-status-change', handleBookingUpdate);
      socket.off('booking-update', handleBookingUpdate);
    };
  }, [socket, fetchBookings]);



  const handleCancelClick = (booking: Booking) => {
    console.log('Cancel button clicked for booking:', booking._id);
    console.log('Booking details:', booking);
    setSelectedBooking(booking);
    setShowCancelModal(true);
    setCancelReason('');
    setSelectedRooms([]); // Reset selected rooms
    setError(null); // Clear any previous errors
  };

  const handlePartialCancelConfirm = async () => {
    if (!selectedBooking || selectedRooms.length === 0) return;

    try {
      setCancelLoading(selectedBooking._id);
      const response = await bookingsAPI.partialCancelBooking(
        selectedBooking._id,
        selectedRooms,
        cancelReason || 'Partial customer cancellation'
      );

      if (response?.success) {
        toast.success('Partial cancellation successful');
        fetchBookings(true);
        setShowCancelModal(false);
        setSelectedBooking(null);
        setSelectedRooms([]);
        setCancelReason('');
        refreshNotifications();
      } else {
        setError(response?.message || 'Failed to cancel rooms');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to cancel rooms');
    } finally {
      setCancelLoading(null);
    }
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

        // Refresh notifications to show the cancellation notification
        refreshNotifications();

        // Removed success toast - notification system provides feedback
        // setSuccessMessage('Booking cancelled successfully');
        // setShowSuccessToast(true);
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
              <th>Original Amount</th>
              <th>Discount</th>
              <th>GST</th>
              <th>Final Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings && bookings.map ? bookings.map((b, idx) => {
              // Handle multiple rooms
              let roomLabel = 'No Rooms';
              if (b.rooms && b.rooms.length > 0) {
                const roomInfo = b.rooms.map(r => {
                  const type = typeof r.roomType === 'object' && r.roomType !== null ? (r.roomType as any).name || '' : 'Room';
                  const num = r.roomNumberInfo ? r.roomNumberInfo.number : r.roomNumber;
                  return `${type} #${num}${r.status === 'Cancelled' ? ' (Cancelled)' : ''}`;
                });
                roomLabel = roomInfo.join(', ');
              } else if ((b as any).room) {
                // Fallback for old single-room bookings
                const room = typeof (b as any).room === 'object' && (b as any).room !== null ? (b as any).room : null;
                roomLabel = room ? `${room.name || ''} ${room.type ? `(${room.type})` : ''}`.trim() : 'Unknown Room';
              }
              const ci = new Date(b.bookingDates.checkInDate).toLocaleDateString();
              const co = new Date(b.bookingDates.checkOutDate).toLocaleDateString();

              // Calculate pricing breakdown
              const subtotal = b.pricing.subtotal || 0;
              const discountAmount = b.pricing.discount?.amount || 0;
              const couponCode = b.pricing.discount?.couponCode || null;
              const gstAmount = b.pricing.taxes?.gst || 0;
              const totalAmount = b.pricing.totalAmount || 0;

              const originalAmount = `₹${subtotal.toFixed(2)}`;
              const gstDisplay = `₹${gstAmount.toFixed(2)}`;
              const finalPaid = `₹${totalAmount.toFixed(2)}`;

              return (
                <tr key={b._id}>
                  <td>{idx + 1}</td>
                  <td>{roomLabel}</td>
                  <td>{ci}</td>
                  <td>{co}</td>
                  <td>{b.guestDetails.totalAdults + b.guestDetails.totalChildren} Guests</td>
                  <td>{b.status || 'Pending'}</td>
                  <td>{originalAmount}</td>
                  <td>
                    {discountAmount > 0 && couponCode ? (
                      <div>
                        <Badge bg="success" className="mb-1">₹{discountAmount.toFixed(2)}</Badge>
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>{gstDisplay}</td>
                  <td><strong>{finalPaid}</strong></td>
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
                <td colSpan={11} className="text-center">
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
                <li>Check-in: {new Date(selectedBooking.bookingDates.checkInDate).toLocaleDateString()}</li>
                <li>Check-out: {new Date(selectedBooking.bookingDates.checkOutDate).toLocaleDateString()}</li>
                <li>Total: ₹{selectedBooking.pricing.totalAmount?.toFixed(2) || '0.00'}</li>
              </ul>

              {(selectedBooking as any).rooms && (selectedBooking as any).rooms.length > 1 && (
                <div className="mt-3">
                  <strong>Select Rooms to Cancel:</strong>
                  <div className="mt-2 border rounded p-3">
                    {(selectedBooking as any).rooms.map((roomItem: any) => (
                      <Form.Check
                        key={roomItem.roomNumber}
                        type="checkbox"
                        id={`room-${roomItem.roomNumber}`}
                        label={`Room ${roomItem.roomNumberInfo.number} (${roomItem.status})`}
                        disabled={roomItem.status === 'Cancelled'}
                        checked={selectedRooms.includes(roomItem.roomNumber)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRooms([...selectedRooms, roomItem.roomNumber]);
                          } else {
                            setSelectedRooms(selectedRooms.filter(id => id !== roomItem.roomNumber));
                          }
                        }}
                      />
                    ))}
                  </div>
                  <small className="text-muted d-block mt-1">
                    Select specific rooms to cancel or click "Cancel Full Booking" to cancel everything.
                  </small>
                </div>
              )}
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
          {selectedRooms.length > 0 && selectedBooking && (selectedBooking as any).rooms && selectedRooms.length < (selectedBooking as any).rooms.filter((r: any) => r.status !== 'Cancelled').length && (
            <Button
              variant="warning"
              onClick={handlePartialCancelConfirm}
              disabled={cancelLoading !== null}
            >
              {cancelLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Cancelling Rooms...
                </>
              ) : (
                'Cancel Selected Rooms'
              )}
            </Button>
          )}
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
              selectedRooms.length > 0 ? 'Cancel Full Booking' : 'Cancel Full Booking'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MyBookings;