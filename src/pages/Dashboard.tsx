import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { authAPI } from '../services/api';
import api from '../services/api';

interface BookingSummary {
  upcoming: number;
  pending: number;
  total: number;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [bookingSummary, setBookingSummary] = useState<BookingSummary>({ upcoming: 0, pending: 0, total: 0 });
  const [reviewsCount, setReviewsCount] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        // Current user
        const me = await authAPI.getMe();
        if (me.user) {
          setUserName(me.user.name || '');
        }

        // User bookings
        const bookingsRes = await api.get('/bookings', { params: { limit: 5 } });
        const bookings = bookingsRes.data.data || bookingsRes.data.bookings || [];
        const now = new Date().getTime();
        const upcoming = bookings.filter((b: any) => {
          const d = new Date(b?.bookingDates?.checkInDate || b?.date || b?.createdAt).getTime();
          return d >= now;
        }).length;
        const pending = bookings.filter((b: any) => b?.status === 'Pending').length;
        setBookingSummary({ upcoming, pending, total: bookingsRes.data.total || bookings.length });

        // User reviews
        const reviewsRes = await api.get('/reviews/my-reviews');
        const reviews = reviewsRes.data.data || reviewsRes.data.reviews || [];
        setReviewsCount(reviews.length);
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="container py-5 d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" /> <span>Loading dashboard...</span>
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
      <h2 className="mb-4">Welcome, {userName}</h2>
      <Row className="g-3">
        <Col md={4}>
          <Card className="p-3">
            <h5 className="mb-2">Bookings</h5>
            <ListGroup.Item className="d-flex justify-content-between">Total<strong>{bookingSummary.total}</strong></ListGroup.Item>

          </Card>
        </Col>
        <Col md={4}>
          <Card className="p-3">
            <h5 className="mb-2">Reviews</h5>
            <div>Total Reviews: <strong>{reviewsCount}</strong></div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
