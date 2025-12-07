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
  bookingId: string;
  room: {
    name: string;
    type: string;
  };
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
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>('');

  useEffect(() => {
    if (show) {
      fetchCompletedBookings();
    }
  }, [show]);

  const fetchCompletedBookings = async () => {
    try {
      const { data } = await api.get('/bookings');
      if (data.success) {
        const bookings = data.data?.bookings || data.bookings || [];
        const completed = bookings.filter(
          (booking: Booking) => 
            booking.status === 'CheckedOut' || booking.status === 'Completed'
        );
        setCompletedBookings(completed);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating) {
      setError('Please select a rating');
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

      const reviewData = {
        booking: selectedBooking || bookingId,
        room: roomId,
        rating,
        comment: comment.trim()
      };

      const { data } = await api.post('/reviews', reviewData);

      if (data.success) {
        setSuccess('Review submitted successfully!');
        setRating(0);
        setComment('');
        setSelectedBooking('');
        
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
                onChange={(e) => setSelectedBooking(e.target.value)}
                required
              >
                <option value="">Choose a completed booking...</option>
                {completedBookings.map((booking) => (
                  <option key={booking._id} value={booking._id}>
                    {booking.bookingId} - {booking.room.name} ({booking.room.type})
                  </option>
                ))}
              </Form.Select>
              {completedBookings.length === 0 && (
                <Form.Text className="text-muted">
                  No completed bookings found. You can only review completed stays.
                </Form.Text>
              )}
            </Form.Group>
          )}

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
