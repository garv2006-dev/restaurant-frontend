import React, { useEffect, useState } from 'react';
import { Table, Alert, Spinner, Button, Card } from 'react-bootstrap';
import { Star, Plus } from 'lucide-react';
import api from '../services/api';
import ReviewForm from '../components/ReviewForm';

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

const MyReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data } = await api.get('/reviews/my-reviews');

        // Backend returns: { success, count, total, pagination, data: Review[] }
        // Older shape might be: { success, reviews: Review[] }
        if (data?.success) {
          let reviewsData: Review[] = [];

          if (Array.isArray(data.data)) {
            reviewsData = data.data as Review[];
          } else if (Array.isArray(data.reviews)) {
            reviewsData = data.reviews as Review[];
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
    fetchReviews();
  }, []);

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
              <th>Rating</th>
              <th>Comment</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r, idx) => (
              <tr key={r._id}>
                <td>{idx + 1}</td>
                <td>
                  <div className="d-flex align-items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={
                          star <= r.rating 
                            ? 'text-warning fill-warning' 
                            : 'text-muted'
                        }
                      />
                    ))}
                    <span className="ms-2">({r.rating}/5)</span>
                  </div>
                </td>
                <td>
                  <div style={{ maxWidth: '300px' }}>
                    {r.comment}
                  </div>
                </td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      
      {/* Review Form Modal */}
      <ReviewForm
        show={showReviewForm}
        onHide={() => setShowReviewForm(false)}
        onReviewSubmitted={() => {
          // Refresh reviews list
          const fetchReviews = async () => {
            try {
              const { data } = await api.get('/reviews/my-reviews');
              if (data?.success) {
                let reviewsData: Review[] = [];
                if (Array.isArray(data.data)) {
                  reviewsData = data.data as Review[];
                } else if (Array.isArray(data.reviews)) {
                  reviewsData = data.reviews as Review[];
                }
                setReviews(reviewsData);
              }
            } catch (err: any) {
              console.error('Error refreshing reviews:', err);
            }
          };
          fetchReviews();
        }}
      />
    </div>
  );
};

export default MyReviews;
