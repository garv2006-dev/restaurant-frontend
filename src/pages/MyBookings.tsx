import React, { useEffect, useState } from 'react';
import { Table, Alert, Spinner, Button, Modal, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';
import ReviewForm from '../components/ReviewForm';

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<string>('');

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

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
    setCancelReason('');
  };

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;

    try {
      setCancelLoading(selectedBooking._id);
      const response = await bookingsAPI.cancelBooking(selectedBooking._id, cancelReason || 'Customer cancellation');
      
      if (response?.success) {
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
      } else {
        setError(response?.message || 'Failed to cancel booking');
      }
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
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
              const roomLabel = room ? `${room.name || ''} ${room.type ? `(${room.type})` : ''} ${room.roomNumber ? `#${room.roomNumber}` : ''}`.trim() : 'Unknown Room';
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
                    ) : b.status === 'CheckedOut' ? (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => {
                          setSelectedBookingForReview(b._id);
                          setShowReviewModal(true);
                        }}
                      >
                        Review
                      </Button>
                    ) : (
                      <span className="text-muted">-</span>
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
      
      {/* Review Modal */}
      <ReviewForm
        show={showReviewModal}
        onHide={() => setShowReviewModal(false)}
        bookingId={selectedBookingForReview}
        onReviewSubmitted={() => {
          setShowReviewModal(false);
          setSelectedBookingForReview('');
          // Optionally refresh bookings if needed
        }}
      />

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
                  ? `${selectedBooking.room.name || ''} ${selectedBooking.room.roomNumber ? `#${selectedBooking.room.roomNumber}` : ''}`.trim() 
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
    </div>
  );
};

export default MyBookings;