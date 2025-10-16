import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Table } from 'react-bootstrap';
import { TrendingUp, ShoppingCart, DollarSign, Calendar } from 'lucide-react';

interface DashboardData {
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  pendingCheckins: number;
  recentBookings: Array<{
    id: string;
    guestName: string;
    roomNumber: string;
    checkIn: string;
    status: string;
  }>;
}

const LiveDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now
    const mockData: DashboardData = {
      totalBookings: 128,
      totalRevenue: 245600,
      occupancyRate: 78,
      pendingCheckins: 12,
      recentBookings: [
        {
          id: '1',
          guestName: 'John Doe',
          roomNumber: '101',
          checkIn: '2024-01-15',
          status: 'Confirmed'
        },
        {
          id: '2',
          guestName: 'Jane Smith',
          roomNumber: '205',
          checkIn: '2024-01-16',
          status: 'Pending'
        }
      ]
    };
    setData(mockData);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Card>
        <Card.Body>
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading dashboard data...</p>
          </div>
        </Card.Body>
      </Card>
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
                  <ShoppingCart size={24} className="text-primary" />
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
                    <th>Room</th>
                    <th>Check-in Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.guestName}</td>
                      <td>{booking.roomNumber}</td>
                      <td>{booking.checkIn}</td>
                      <td>
                        <Badge bg={
                          booking.status === 'Confirmed' ? 'success' : 
                          booking.status === 'Pending' ? 'warning' : 'secondary'
                        }>
                          {booking.status}
                        </Badge>
                      </td>
                      <td>
                        <button className="btn btn-outline-primary btn-sm me-1">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
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