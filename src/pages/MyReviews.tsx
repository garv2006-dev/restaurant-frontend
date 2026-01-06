import React, { useEffect, useState } from 'react';
import { Table, Alert, Spinner, Button, Card, Form, Modal } from 'react-bootstrap';
import { Star, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { reviewsAPI, bookingsAPI } from '../services/api';

interface Review {
  _id: string;
  title: string;
  rating: number;
  comment: string;
  reviewType: string;
  isApproved: boolean;
  room: {
    _id: string;
    name: string;
    type: string;
  };
  booking: {
    _id: string;
    bookingId: string;
  };
  createdAt: string;
}

interface Booking {
  _id: string;
  bookingId: string;
  room: {
    _id: string;
    name: string;
    type: string;
  };
  status: string;
}

const MyReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  
  // Review form state
  const [selectedBooking, setSelectedBooking] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [reviewType, setReviewType] = useState<string>('overall');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<string>('');
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReviews();
    fetchCompletedBookings();
    
    // Check if we came from MyBookings with a specific booking to review
    const state = location.state as { bookingId?: string };
    if (state?.bookingId) {
      setSelectedBooking(state.bookingId);
      setShowReviewForm(true);
      // Clear the state to prevent reopening on refresh
      navigate('/my-reviews', { replace: true });
    }
  }, [location.state, navigate]);

  const fetchReviews = async () => {
    try {
      const response = await reviewsAPI.getUserReviews();

      if (response?.success) {
        let reviewsData: any[] = [];

        if (Array.isArray(response.data)) {
          reviewsData = response.data;
        }

        setReviews(reviewsData);
      } else {
        setReviews([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedBookings = async () => {
    try {
      const response = await bookingsAPI.getUserBookings();
      
      if (response?.success) {
        let bookingsData: any[] = [];
        
        if (Array.isArray(response.data)) {
          bookingsData = response.data;
        }
        
        // Filter only completed bookings that haven't been reviewed
        const completedBookings = bookingsData.filter((booking: any) => 
          booking.status === 'CheckedOut'
        );
        
        setCompletedBookings(completedBookings);
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating) {
      setSubmitError('Please select a rating');
      return;
    }

    if (!title.trim()) {
      setSubmitError('Please add a review title');
      return;
    }

    if (!comment.trim()) {
      setSubmitError('Please write a review comment');
      return;
    }

    if (!selectedBooking) {
      setSubmitError('Please select a booking');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError('');
      setSubmitSuccess('');

      // Get room ID from selected booking
      const booking = completedBookings.find(b => b._id === selectedBooking);
      const roomId = booking?.room._id;

      const reviewData = {
        booking: selectedBooking,
        room: roomId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        reviewType: reviewType
      };

      console.log('Submitting review:', reviewData);
      const response = await reviewsAPI.createReview(reviewData);

      if (response.success) {
        setSubmitSuccess('Review submitted successfully and published!');
        
        // Reset form
        setRating(0);
        setTitle('');
        setComment('');
        setSelectedBooking('');
        setReviewType('overall');
        
        // Refresh reviews list
        await fetchReviews();
        
        // Close form after 2 seconds
        setTimeout(() => {
          setShowReviewForm(false);
          setSubmitSuccess('');
        }, 2000);
      } else {
        setSubmitError(response.message || 'Failed to submit review');
      }
    } catch (error: any) {
      setSubmitError(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return (
      <div className="d-flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={interactive ? 24 : 16}
            className={`${interactive ? 'cursor-pointer' : ''} ${
              star <= (interactive ? (hover || rating) : currentRating) 
                ? 'text-warning fill-warning' 
                : 'text-muted'
            }`}
            onClick={interactive ? () => setRating(star) : undefined}
            onMouseEnter={interactive ? () => setHover(star) : undefined}
            onMouseLeave={interactive ? () => setHover(0) : undefined}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container py-5 d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" /> <span>Loading reviews...</span>
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">My Reviews</h2>
        <Button 
          variant="primary" 
          onClick={() => setShowReviewForm(true)}
          className="d-flex align-items-center gap-2"
        >
          <Plus size={16} />
          Write Review
        </Button>
      </div>
      
      {reviews.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <Star size={48} className="text-muted mb-3" />
            <h4>No Reviews Yet</h4>
            <p className="text-muted mb-3">
              You haven't posted any reviews yet. Share your experience with others!
            </p>
            <Button 
              variant="primary" 
              onClick={() => setShowReviewForm(true)}
              className="d-flex align-items-center gap-2 mx-auto"
            >
              <Plus size={16} />
              Write Your First Review
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Room</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r, idx) => (
              <tr key={r._id}>
                <td>{idx + 1}</td>
                <td><strong>{r.title}</strong></td>
                <td>{r.room?.name} ({r.room?.type})</td>
                <td>
                  <div className="d-flex align-items-center gap-1">
                    {renderStars(r.rating)}
                    <span className="ms-2">({r.rating}/5)</span>
                  </div>
                </td>
                <td>
                  <div style={{ maxWidth: '300px' }}>
                    {r.comment}
                  </div>
                </td>
                <td>
                  <span className={`badge ${r.isApproved ? 'bg-success' : 'bg-warning'}`}>
                    {r.isApproved ? 'Published' : 'Pending'}
                  </span>
                </td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      
      {/* Review Form Modal */}
      <Modal show={showReviewForm} onHide={() => setShowReviewForm(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Write a Review</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitReview}>
          <Modal.Body>
            {submitError && <Alert variant="danger">{submitError}</Alert>}
            {submitSuccess && <Alert variant="success">{submitSuccess}</Alert>}
            
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

            <Form.Group className="mb-3">
              <Form.Label>Review Type</Form.Label>
              <Form.Select
                value={reviewType}
                onChange={(e) => setReviewType(e.target.value)}
                required
              >
                <option value="overall">Overall Experience</option>
                <option value="room">Room</option>
                <option value="service">Service</option>
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
              <div className="mb-2">
                {renderStars(rating, true)}
              </div>
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
            <Button variant="secondary" onClick={() => setShowReviewForm(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={submitting || !selectedBooking}
            >
              {submitting ? 'Publishing...' : 'Publish Review'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default MyReviews;