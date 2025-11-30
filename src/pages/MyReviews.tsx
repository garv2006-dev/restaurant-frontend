import React, { useEffect, useState } from 'react';
import { Table, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';

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

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data } = await api.get('/reviews/my-reviews');
        setReviews(data.reviews || []);
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
      <h2 className="mb-4">My Reviews</h2>
      {reviews.length === 0 ? (
        <Alert variant="info">You haven't posted any reviews yet.</Alert>
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
                <td>{r.rating}</td>
                <td>{r.comment}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default MyReviews;
