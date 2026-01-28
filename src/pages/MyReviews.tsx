import React, { useEffect, useState } from 'react';
import { Table, Alert, Spinner, Button, Card, Form, Modal } from 'react-bootstrap';
import { Star, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
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
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
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

  const openNewReviewModal = () => {
    setEditingReview(null); // Ensure we're not in editing mode
    setSelectedBooking('');
    setRating(0);
    setTitle('');
    setComment('');
    setReviewType('overall');
    setSubmitError('');
    setSubmitSuccess('');
    setShowReviewForm(true);
  };

  const handleEditClick = (review: Review) => {
    setEditingReview(review);
    setSelectedBooking(review.booking._id); // Pre-select booking, but disable it
    setRating(review.rating);
    setTitle(review.title);
    setComment(review.comment);
    setReviewType(review.reviewType);
    setSubmitError('');
    setSubmitSuccess('');
    setShowReviewForm(true);
  };

  const handleDeleteClick = (reviewId: string) => {
    setReviewToDelete(reviewId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;

    try {
      setSubmitting(true); // Re-using submitting state for delete operation
      const response = await reviewsAPI.deleteReview(reviewToDelete);

      if (response.success) {
        setSubmitSuccess('Review deleted successfully!'); // Using submitSuccess for delete confirmation
        await fetchReviews();
        setShowDeleteModal(false);
        setReviewToDelete(null);
        setTimeout(() => setSubmitSuccess(''), 2000); // Clear success message
      } else {
        setSubmitError(response.message || 'Failed to delete review'); // Using submitError for delete error
      }
    } catch (error: any) {
      setSubmitError(error.response?.data?.message || 'Failed to delete review');
    } finally {
      setSubmitting(false);
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

    if (title.trim().length < 10 || title.trim().length > 20) {
      setSubmitError('Review title must be between 10 and 20 characters');
      return;
    }

    // Check for multiple spaces in title
    if (/\s\s+/.test(title)) {
      setSubmitError('Review title cannot contain multiple consecutive spaces');
      return;
    }

    if (!comment.trim()) {
      setSubmitError('Please write a review comment');
      return;
    }

    if (comment.trim().length < 10 || comment.trim().length > 90) {
      setSubmitError('Review content must be between 10 and 90 characters');
      return;
    }

    // Check for multiple spaces in comment
    if (/\s\s+/.test(comment)) {
      setSubmitError('Review content cannot contain multiple consecutive spaces');
      return;
    }

    // Only check booking if not editing (booking cannot be changed during edit)
    if (!editingReview && !selectedBooking) {
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

      let response;
      if (editingReview) {
        response = await reviewsAPI.updateReview(editingReview._id, {
          rating,
          title: title.trim(),
          comment: comment.trim(),
          reviewType
        });
      } else {
        response = await reviewsAPI.createReview(reviewData);
      }

      if (response.success) {
        setSubmitSuccess(editingReview ? 'Review updated successfully!' : 'Review submitted successfully and published!');

        // Reset form
        setRating(0);
        setTitle('');
        setComment('');
        setSelectedBooking('');
        setReviewType('overall');
        setEditingReview(null);

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
            className={`${interactive ? 'cursor-pointer' : ''} ${star <= (interactive ? (hover || rating) : currentRating)
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

  // Helper to check if review is editable (within 24 hours)
  const canModifyReview = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    return (now - created) <= oneDay;
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
          onClick={openNewReviewModal}
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
              onClick={openNewReviewModal}
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
              <th>Actions</th>
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
                <td>
                  {canModifyReview(r.createdAt) && (
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleEditClick(r)}
                        title="Edit Review"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteClick(r._id)}
                        title="Delete Review"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Review Form Modal */}
      <Modal show={showReviewForm} onHide={() => setShowReviewForm(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingReview ? 'Edit Review' : 'Write a Review'}</Modal.Title>
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
                disabled={!!editingReview} // Disable booking selection when editing
              >
                <option value="">Choose a completed booking...</option>
                {completedBookings
                  .filter(booking => {
                    // Filter out bookings that already have a review
                    // Unless it's the booking currently associated with the review being edited
                    const hasReview = reviews.some(r => r.booking?._id === booking._id);
                    const isEditingCurrentBooking = editingReview?.booking?._id === booking._id;
                    return !hasReview || isEditingCurrentBooking;
                  })
                  .map((booking) => (
                    <option key={booking._id} value={booking._id}>
                      {booking.bookingId} - {booking.room.name} ({booking.room.type})
                    </option>
                  ))}
              </Form.Select>
              {completedBookings.filter(b => !reviews.some(r => r.booking?._id === b._id)).length === 0 && !editingReview && (
                <Form.Text className="text-muted">
                  No unreviewed completed bookings found.
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
                maxLength={20}
                minLength={10}
              />
              <Form.Text className={title.length > 0 && (title.length < 10 || title.length > 20) ? "text-danger" : "text-muted"}>
                {title.length}/20 characters (min 10)
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
                maxLength={90}
                minLength={10}
              />
              <Form.Text className={comment.length > 0 && (comment.length < 10 || comment.length > 90) ? "text-danger" : "text-muted"}>
                {comment.length}/90 characters (min 10)
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
              disabled={submitting || (!selectedBooking && !editingReview)}
            >
              {submitting ? (editingReview ? 'Updating...' : 'Publishing...') : (editingReview ? 'Update Review' : 'Publish Review')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger d-flex align-items-center gap-2">
            <AlertCircle size={20} />
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this review? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete Review'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MyReviews;