import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Badge } from 'react-bootstrap';
import { Star } from 'lucide-react';
import api from '../services/api';

interface ReviewFormProps {
  show: boolean;
  onHide: () => void;
  bookingId?: string;
  roomId?: string;
  onReviewSubmitted?: () => void;
}

interface Booking {
  _id: string;
  id?: string;
  bookingId: string;
  room: {
    _id?: string;
    id?: string;
    name: string;
    type: string;
  } | string;
  status: string;
  createdAt: string;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ 
  show, 
  onHide, 
  bookingId, 
  roomId, 
  onReviewSubmitted 
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [reviewType, setReviewType] = useState<string>('room');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  useEffect(() => {
    if (show) {
      if (bookingId) {
        // If bookingId is provided, fetch that specific booking to get roomId
        fetchBookingDetails();
      } else {
        // Otherwise fetch all completed bookings for selection
        fetchCompletedBookings();
      }
    }
  }, [show, bookingId]);

  const fetchBookingDetails = async () => {
    try {
      if (!bookingId) return;
      
      const { data: response } = await api.get('/bookings');
      
      if (response.success) {
        let bookings = response.data || [];
        if (!Array.isArray(bookings)) {
          bookings = [];
        }
        
        const booking = bookings.find((b: any) => b._id === bookingId);
        
        if (booking && typeof booking.room === 'object' && booking.room !== null) {
          const roomId = (booking.room._id || booking.room.id) as string;
          setSelectedRoomId(roomId);
          console.log('Booking details loaded, room ID set to:', roomId);
        } else {
          console.warn('Could not find booking or extract room ID:', booking);
        }
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    }
  };

  const fetchCompletedBookings = async () => {
    try {
      const { data: response } = await api.get('/bookings?limit=100');
      
      console.log('Raw API response:', response);
      
      if (response.success) {
        // Backend returns: { success, count, total, pagination, data: Booking[] }
        // Not wrapped in bookings
        let bookings = response.data || [];
        
        if (!Array.isArray(bookings)) {
          console.warn('Unexpected bookings response format:', bookings);
          bookings = [];
        }
        
        console.log('All bookings fetched:', bookings);
        
        const completed = bookings.filter((booking: any) => {
          console.log(`Checking booking ${booking.bookingId}: status = ${booking.status}`);
          return booking.status === 'CheckedOut' || booking.status === 'Completed';
        });
        
        console.log('Completed bookings filtered:', completed);
        setCompletedBookings(completed);
        
        if (completed.length === 0) {
          console.warn('No completed bookings found. Available statuses:', 
            bookings.map((b: any) => ({ id: b.bookingId, status: b.status }))
          );
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleBookingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bookingId = e.target.value;
    setSelectedBooking(bookingId);
    
    if (bookingId) {
      const booking = completedBookings.find(b => b._id === bookingId);
      if (booking && typeof booking.room === 'object' && booking.room !== null) {
        const roomId = (booking.room._id || booking.room.id) as string;
        setSelectedRoomId(roomId);
        console.log('Booking selected, room ID set to:', roomId);
      } else {
        console.warn('Could not extract room ID from booking:', booking);
      }
    } else {
      setSelectedRoomId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating) {
      setError('Please select a rating');
      return;
    }

    if (!title.trim()) {
      setError('Please add a review title');
      return;
    }

    if (!comment.trim()) {
      setError('Please write a review comment');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Get room ID from state or prop
      const finalRoomId = selectedRoomId || roomId;

      const reviewData = {
        booking: selectedBooking || bookingId,
        room: finalRoomId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        reviewType: reviewType
      };

      console.log('Review data being sent:', reviewData);
      const { data } = await api.post('/reviews', reviewData);

      if (data.success) {
        setSuccess('Review submitted successfully!');
        setRating(0);
        setTitle('');
        setComment('');
        setSelectedBooking('');
        setReviewType('room');
        
        setTimeout(() => {
          onHide();
          onReviewSubmitted?.();
        }, 1500);
      } else {
        setError(data.message || 'Failed to submit review');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="d-flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={24}
            className={`cursor-pointer ${
              star <= (hover || rating) ? 'text-warning fill-warning' : 'text-muted'
            }`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          />
        ))}
      </div>
    );
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Write a Review</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          {!bookingId && (
            <Form.Group className="mb-3">
              <Form.Label>Select Booking</Form.Label>
              <Form.Select
                value={selectedBooking}
                onChange={handleBookingChange}
                required
              >
                <option value="">Choose a completed booking...</option>
                {completedBookings.map((booking) => {
                  const roomName = typeof booking.room === 'object' && booking.room ? booking.room.name : 'Unknown';
                  const roomType = typeof booking.room === 'object' && booking.room ? booking.room.type : 'Unknown';
                  return (
                    <option key={booking._id} value={booking._id}>
                      {booking.bookingId} - {roomName} ({roomType})
                    </option>
                  );
                })}
              </Form.Select>
              {completedBookings.length === 0 && (
                <Form.Text className="text-muted">
                  No completed bookings found. You can only review completed stays.
                </Form.Text>
              )}
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Review Type</Form.Label>
            <Form.Select
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value)}
              required
            >
              <option value="room">Room</option>
              <option value="service">Service</option>
              <option value="overall">Overall Experience</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Review Title</Form.Label>
            <Form.Control
              type="text"
              placeholder="Give your review a short title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
            <Form.Text className="text-muted">
              {title.length}/100 characters
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Rating</Form.Label>
            {renderStars()}
            <Form.Text className="text-muted">
              Click to rate your experience
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Your Review</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              minLength={10}
            />
            <Form.Text className="text-muted">
              Minimum 10 characters
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading || (!bookingId && !selectedBooking)}
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ReviewForm;
