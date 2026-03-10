import React, { useEffect, useState, useCallback } from 'react';
import { Button, Modal, Form, Spinner, Alert, Table } from 'react-bootstrap';
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const checkReviewStatuses = useCallback(async (bookingsList: Booking[]) => {
    const statuses: { [key: string]: any } = {};
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
      completedBookings.forEach(booking => { statuses[booking._id] = { canReview: true }; });
      setReviewStatuses(statuses);
    }
  }, []);

  const fetchBookings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await bookingsAPI.getUserBookings();
      if (response?.success) {
        let bookingsData: Booking[] = [];
        if (Array.isArray(response.data)) bookingsData = response.data as unknown as Booking[];
        else if (response.data && Array.isArray((response.data as any).bookings)) bookingsData = (response.data as any).bookings as Booking[];
        setBookings(bookingsData);
        checkReviewStatuses(bookingsData);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      if (!silent) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load bookings');
        setBookings([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [checkReviewStatuses]);

  useEffect(() => { fetchBookings(false); }, [fetchBookings]);

  useEffect(() => {
    if (!socket) return;
    const handleBookingUpdate = () => fetchBookings(true);
    socket.on('booking-status-change', handleBookingUpdate);
    socket.on('booking-update', handleBookingUpdate);
    return () => {
      socket.off('booking-status-change', handleBookingUpdate);
      socket.off('booking-update', handleBookingUpdate);
    };
  }, [socket, fetchBookings]);

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
    setCancelReason('');
    setSelectedRooms([]);
    setError(null);
  };

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;
    try {
      setCancelLoading(selectedBooking._id);
      const response = await bookingsAPI.cancelBooking(selectedBooking._id, cancelReason || 'Customer cancellation');
      if (response?.success) {
        toast.success('Booking cancelled successfully');
        fetchBookings(true);
        setShowCancelModal(false);
        setSelectedBooking(null);
        refreshNotifications();
      } else {
        setError(response?.message || 'Failed to cancel');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelLoading(null);
    }
  };

  const handlePartialCancelConfirm = async () => {
    if (!selectedBooking || selectedRooms.length === 0) return;
    try {
      setCancelLoading(selectedBooking._id);
      const response = await bookingsAPI.partialCancelBooking(selectedBooking._id, selectedRooms, cancelReason || 'Partial cancellation');
      if (response?.success) {
        toast.success('Rooms cancelled successfully');
        fetchBookings(true);
        setShowCancelModal(false);
        refreshNotifications();
      }
    } catch (err: any) {
      setError('Partial cancellation failed');
    } finally {
      setCancelLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-5" style={{ fontFamily: "'Jost', sans-serif" }}>
      <h2 className="mb-4" style={{ fontWeight: 700, color: '#1a1a1a' }}>My Bookings</h2>

      {error && <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>{error}</Alert>}

      {bookings.length === 0 ? (
        <div className="text-center py-5 border rounded bg-white">
          <h3>No bookings found</h3>
          <p className="text-muted mb-4">You haven't made any reservations yet.</p>
          <Link to="/booking" className="btn btn-primary px-4">Book Your Stay</Link>
        </div>
      ) : (
        <div className="table-responsive bg-white">
          <Table bordered hover className="align-middle mb-0" style={{ fontSize: '14px' }}>
            <thead className="bg-light">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3" style={{ minWidth: '300px' }}>Rooms</th>
                <th className="py-3 px-3">Check-in</th>
                <th className="py-3 px-3">Check-out</th>
                <th className="py-3 px-3">Guests</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Original Amount</th>
                <th className="py-3 px-3">Discount</th>
                <th className="py-3 px-3">GST</th>
                <th className="py-3 px-3">Final Paid</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking, index) => {
                const typeCounts: { [key: string]: { active: number, cancelled: number } } = {};
                booking.rooms.forEach(r => {
                  const typeName = (r.roomType as any)?.name || 'Room';
                  if (!typeCounts[typeName]) {
                    typeCounts[typeName] = { active: 0, cancelled: 0 };
                  }
                  if (r.status === 'Cancelled') {
                    typeCounts[typeName].cancelled++;
                  } else {
                    typeCounts[typeName].active++;
                  }
                });

                const roomDisplay = Object.entries(typeCounts).map(([typeName, counts]) => {
                  const totalForType = counts.active + counts.cancelled;
                  let str = `${totalForType} ${typeName}${totalForType > 1 ? (typeName.endsWith('s') ? "'" : 's') : ''}`;
                  if (counts.cancelled > 0) {
                    str += ` (${counts.cancelled} Cancelled)`;
                  }
                  return str;
                }).join(', ');

                const subtotal = booking.pricing.roomPrice || 0;
                const discount = booking.pricing.discount?.amount || 0;
                const gst = booking.pricing.taxes?.gst || 0;
                const total = booking.pricing.totalAmount || 0;

                return (
                  <tr key={booking._id}>
                    <td className="px-3">{index + 1}</td>
                    <td className="px-3" style={{ maxWidth: '400px' }}>{roomDisplay}</td>
                    <td className="px-3">{formatDate(booking.bookingDates.checkInDate)}</td>
                    <td className="px-3">{formatDate(booking.bookingDates.checkOutDate)}</td>
                    <td className="px-3">
                      {booking.guestDetails.totalAdults + booking.guestDetails.totalChildren}
                      <br />
                      <span className="text-muted" style={{ fontSize: '12px' }}>Guests</span>
                    </td>
                    <td className="px-3">
                      <span style={{ fontWeight: 500 }}>{booking.status}</span>
                    </td>
                    <td className="px-3">₹{subtotal.toFixed(2)}</td>
                    <td className="px-3">{discount > 0 ? `₹${discount.toFixed(2)}` : '-'}</td>
                    <td className="px-3">₹{gst.toFixed(2)}</td>
                    <td className="px-3">
                      <strong style={{ fontSize: '15px' }}>₹{total.toFixed(2)}</strong>
                    </td>
                    <td className="px-3 text-center">
                      {(booking.status === 'Pending' || booking.status === 'Confirmed') && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '4px' }}
                          onClick={() => handleCancelClick(booking)}
                          disabled={cancelLoading === booking._id}
                        >
                          {cancelLoading === booking._id ? '...' : 'Cancel'}
                        </Button>
                      )}

                      {booking.status === 'CheckedOut' && reviewStatuses[booking._id]?.canReview && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '4px' }}
                          onClick={() => navigate('/reviews')}
                        >
                          Review
                        </Button>
                      )}

                      {booking.status === 'CheckedOut' && reviewStatuses[booking._id]?.reason === 'ALREADY_REVIEWED' && (
                        <span className="text-success small fw-bold">Reviewed</span>
                      )}

                      {booking.status === 'Cancelled' && <span className="text-muted">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}


      {/* Cancel Modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered className="lux-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">Cancel Your Stay?</Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-2">
          <p className="text-muted">Are you sure you want to cancel booking <strong>{selectedBooking?.bookingId}</strong>? Room availability will be released.</p>

          {selectedBooking && selectedBooking.rooms.length > 1 && (
            <div className="mb-4">
              <label className="fw-bold small mb-2 text-uppercase">Selective Room Cancellation</label>
              <div className="border rounded-3 p-3 bg-light">
                {selectedBooking.rooms.map((r, i) => (
                  <Form.Check
                    key={i}
                    type="checkbox"
                    id={`room-${i}`}
                    label={`${(r.roomType as any)?.name || 'Room'}`}
                    disabled={r.status === 'Cancelled'}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRooms([...selectedRooms, r.roomNumber]);
                      else setSelectedRooms(selectedRooms.filter(id => id !== r.roomNumber));
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <Form.Group>
            <Form.Label className="small fw-bold text-uppercase">Cancellation Reason</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Tell us why you are cancelling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" onClick={() => setShowCancelModal(false)}>Keep It</Button>
          {selectedRooms.length > 0 && (
            <Button variant="warning" onClick={handlePartialCancelConfirm} disabled={cancelLoading !== null}>
              Cancel Selected Rooms
            </Button>
          )}
          <Button variant="danger" onClick={handleCancelConfirm} disabled={cancelLoading !== null}>
            {cancelLoading ? 'Cancelling...' : 'Cancel Full Booking'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MyBookings;