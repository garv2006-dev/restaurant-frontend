import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Table, Spinner, Alert, Button, Form, InputGroup } from 'react-bootstrap';
import { 
  TrendingUp, 
  Book, 
  DollarSign, 
  Calendar,
  Eye, 
  CheckCircle, 
  XCircle, 
  LogIn, 
  LogOut,
  Loader2,
  Search
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import '../../styles/admin-panel.css';

// Add custom styles for search input
const searchStyles = `
  .search-input-group .form-control:focus {
    border-color: #dee2e6;
    box-shadow: none;
    outline: none;
  }
  
  .search-input-group .input-group-text {
    background-color: #f8f9fa;
    border-color: #dee2e6;
  }
  
  .search-input-group .form-control {
    border-color: #dee2e6;
  }
  
  .search-input-group .form-control:hover {
    border-color: #dee2e6;
    box-shadow: none;
  }
  
  .search-input-group .form-control:focus + .btn,
  .search-input-group .btn:focus {
    border-color: #dee2e6;
    box-shadow: none;
  }
  
  .search-input-group .btn:hover {
    border-color: #dee2e6;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = searchStyles;
  document.head.appendChild(styleElement);
}

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
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filter bookings based on search term
  const filteredBookings = data?.recentBookings?.filter(booking => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.guestDetails.primaryGuest.name.toLowerCase().includes(searchLower) ||
      booking.guestDetails.primaryGuest.email.toLowerCase().includes(searchLower) ||
      booking.guestDetails.primaryGuest.phone.includes(searchTerm) ||
      booking.room?.name?.toLowerCase().includes(searchLower) ||
      booking.status.toLowerCase().includes(searchLower) ||
      booking.bookingId.toLowerCase().includes(searchLower)
    );
  }) || [];

  const handleStatusUpdate = async (bookingId: string, status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'NoShow') => {
    // Add confirmation for destructive actions
    if (status === 'Cancelled' || status === 'NoShow') {
      const confirmMessage = status === 'Cancelled' 
        ? 'Are you sure you want to cancel this booking?' 
        : 'Are you sure you want to mark this booking as No Show?';
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: true }));
      
      console.log('Updating booking status:', { bookingId, status });
      
      const response = await adminAPI.updateBookingStatus(bookingId, status);
      
      if (response.success) {
        // Update local state
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            recentBookings: prev.recentBookings.map(booking => 
              booking._id === bookingId 
                ? { ...booking, status } 
                : booking
            )
          };
        });
        
        console.log('Booking status updated successfully');
      } else {
        throw new Error(response.message || 'Failed to update booking status');
      }
    } catch (err: any) {
      console.error('Failed to update booking status:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update booking status';
      alert(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleViewDetails = (booking: RecentBooking) => {
    // For now, just show an alert with booking details
    // You can implement a proper modal later
    alert(`Booking Details:\nID: ${booking.bookingId}\nGuest: ${booking.guestDetails.primaryGuest.name}\nRoom: ${booking.room.name}\nStatus: ${booking.status}`);
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        // Use admin endpoint to get all bookings
        const response = await adminAPI.getAllBookings({ limit: 100 });
        
        console.log('Dashboard API response:', response);
        
        if (response?.success && response?.data) {
          let bookings: any[] = [];
          
          // Handle different response structures
          if (Array.isArray(response.data)) {
            bookings = response.data;
          } else if (response.data.bookings && Array.isArray(response.data.bookings)) {
            bookings = response.data.bookings;
          } else if (response.data && Array.isArray((response.data as any).data)) {
            bookings = (response.data as any).data;
          }
          
          console.log('Processed bookings:', bookings);
          
          // Get recent bookings (increased to 20 for better search results)
          const recentBookings = bookings.slice(0, 20) as RecentBooking[];
          
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Clear search on Escape key
      if (event.key === 'Escape' && searchTerm) {
        setSearchTerm('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchTerm]);

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
            <Card.Header>
              <Row className="align-items-center">
                <Col md={6}>
                  <div className="d-flex align-items-center">
                    <Badge bg="danger">Live</Badge>
                    {searchTerm && (
                      <Badge bg="info" className="ms-2">
                        {filteredBookings.length} found
                      </Badge>
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <InputGroup className="search-input-group">
                    <InputGroup.Text className="bg-light border-end-0">
                      <Search size={16} className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search bookings by name, email, phone, room, or status..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-start-0 ps-0"
                      style={{ boxShadow: 'none' }}
                    />
                    {searchTerm && (
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setSearchTerm('')}
                        title="Clear search"
                        className="border-start-0"
                        style={{ 
                          borderTopLeftRadius: 0, 
                          borderBottomLeftRadius: 0,
                          fontSize: '18px',
                          lineHeight: 1
                        }}
                      >
                        ×
                      </Button>
                    )}
                  </InputGroup>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  <strong>Error:</strong> {error}
                </Alert>
              )}
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
                  {filteredBookings && filteredBookings.length > 0 ? (
                    filteredBookings.map((booking) => (
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
                          {booking?.room?.name}
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
                          <div className="d-flex justify-content-end gap-1">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => handleViewDetails(booking)}
                              title="View booking details"
                              disabled={actionLoading[booking._id]}
                            >
                              <Eye size={16} />
                            </Button>
                            
                            {booking.status === 'Pending' && (
                              <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking._id, 'Confirmed')}
                                disabled={actionLoading[booking._id]}
                                title="Confirm this booking"
                                className="d-flex align-items-center"
                              >
                                {actionLoading[booking._id] ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                              </Button>
                            )}
                            
                            {['Pending', 'Confirmed'].includes(booking.status) && (
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking._id, 'Cancelled')}
                                disabled={actionLoading[booking._id]}
                                title="Cancel this booking"
                                className="d-flex align-items-center"
                              >
                                {actionLoading[booking._id] ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <XCircle size={16} />
                                )}
                              </Button>
                            )}
                            
                            {booking.status === 'Confirmed' && (
                              <Button 
                                variant="outline-info" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking._id, 'CheckedIn')}
                                disabled={actionLoading[booking._id]}
                                title="Check in guest"
                                className="d-flex align-items-center"
                              >
                                {actionLoading[booking._id] ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <LogIn size={16} />
                                )}
                              </Button>
                            )}
                            
                            {booking.status === 'CheckedIn' && (
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking._id, 'CheckedOut')}
                                disabled={actionLoading[booking._id]}
                                title="Check out guest"
                                className="d-flex align-items-center"
                              >
                                {actionLoading[booking._id] ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <LogOut size={16} />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-4">
                        {searchTerm ? `No bookings found matching "${searchTerm}"` : 'No bookings available'}
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