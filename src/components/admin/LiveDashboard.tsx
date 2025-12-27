import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Table, Spinner, Alert } from 'react-bootstrap';
import { TrendingUp, Book, DollarSign, Calendar } from 'lucide-react';
import { bookingsAPI } from '../../services/api';
import '../../styles/admin-panel.css';

interface RecentBooking {
  _id: string;
  bookingId: string;
  guestDetails: {
    primaryGuest: {
      name: string;
      email: string;
      phone: string;
    };
  };
  room: {
    _id: string;
    name: string;
    roomNumber: string;
    type: string;
  };
  bookingDates: {
    checkInDate: string;
    checkOutDate: string;
  };
  status: string;
  pricing: {
    totalAmount: number;
  };
}

interface DashboardData {
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  pendingCheckins: number;
  recentBookings: RecentBooking[];
}

const LiveDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        // Use admin endpoint to get all bookings
        const response = await bookingsAPI.getAllBookings({ limit: 100 });
        
        if (response?.success && response?.data) {
          let bookings: any[] = Array.isArray(response.data) ? response.data : [];
          
          // Get recent 5 bookings
          const recentBookings = bookings.slice(0, 5) as RecentBooking[];
          
          // Calculate stats
          const totalBookings = bookings.length;
          const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (b.pricing?.totalAmount || 0), 0);
          const confirmedBookings = bookings.filter((b: any) => b.status === 'Confirmed').length;
          const occupancyRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;
          const pendingCheckins = bookings.filter((b: any) => b.status === 'Pending').length;
          
          setData({
            totalBookings,
            totalRevenue,
            occupancyRate,
            pendingCheckins,
            recentBookings
          });
        } else {
          setError('Failed to fetch booking data');
        }
      } catch (err: any) {
        console.error('Error fetching bookings:', err);
        setError(err?.response?.data?.message || 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading dashboard data...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Data</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  return (
    <div>
      <Row className="g-4 mb-4">
        <Col md={3}>
          <Card className="border-start border-primary border-4">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 bg-primary bg-opacity-10 p-3 rounded">
                  <Book size={24} className="text-primary" />
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">{data?.totalBookings || 0}</h5>
                  <p className="mb-0 text-muted small">Total Bookings</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-start border-success border-4">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 bg-success bg-opacity-10 p-3 rounded">
                  <DollarSign size={24} className="text-success" />
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">₹{data?.totalRevenue.toLocaleString() || 0}</h5>
                  <p className="mb-0 text-muted small">Total Revenue</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-start border-info border-4">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 bg-info bg-opacity-10 p-3 rounded">
                  <TrendingUp size={24} className="text-info" />
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">{data?.occupancyRate || 0}%</h5>
                  <p className="mb-0 text-muted small">Occupancy Rate</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="border-start border-warning border-4">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0 bg-warning bg-opacity-10 p-3 rounded">
                  <Calendar size={24} className="text-warning" />
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-1">{data?.pendingCheckins || 0}</h5>
                  <p className="mb-0 text-muted small">Pending Check-ins</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Bookings</h5>
              <Badge bg="secondary">Live</Badge>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Guest Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Room</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentBookings && data.recentBookings.length > 0 ? (
                    data.recentBookings.map((booking) => (
                      <tr key={booking._id}>
                        <td>
                          <strong>{booking.guestDetails.primaryGuest.name}</strong>
                        </td>
                        <td>
                          <small>{booking.guestDetails.primaryGuest.email}</small>
                        </td>
                        <td>
                          <small>{booking.guestDetails.primaryGuest.phone}</small>
                        </td>
                        <td>
                          {booking?.room?.name} #{booking?.room?.roomNumber}
                        </td>
                        <td>
                          <small>{new Date(booking.bookingDates.checkInDate).toLocaleDateString()}</small>
                        </td>
                        <td>
                          <small>{new Date(booking.bookingDates.checkOutDate).toLocaleDateString()}</small>
                        </td>
                        <td>
                          <strong>₹{booking.pricing.totalAmount?.toFixed(2) || '0.00'}</strong>
                        </td>
                        <td>
                          <Badge bg={
                            booking.status === 'Confirmed' ? 'success' : 
                            booking.status === 'Pending' ? 'warning' : 
                            booking.status === 'CheckedIn' ? 'info' :
                            booking.status === 'CheckedOut' ? 'secondary' :
                            booking.status === 'Cancelled' ? 'danger' : 'secondary'
                          }>
                            {booking.status}
                          </Badge>
                        </td>
                        <td>
                          <button className="btn btn-outline-primary btn-sm">
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-4">
                        No bookings available
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LiveDashboard;