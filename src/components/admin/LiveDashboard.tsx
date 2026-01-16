import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Badge, Table, Alert, Button, Form, InputGroup, Modal } from 'react-bootstrap';
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
import api from '../../services/api';
import '../../styles/admin-panel.css';
import DataLoader from '../common/DataLoader';

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
  createdAt?: string;
}

interface DashboardData {
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  pendingCheckins: number;
  recentBookings: RecentBooking[];
}

interface RoomMetrics {
  total: number;
  available: number;
  allocated: number;
  occupied: number;
  maintenance: number;
}

const LiveDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [roomMetrics, setRoomMetrics] = useState<RoomMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<RecentBooking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch bookings with search functionality
  const fetchBookings = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Use admin endpoint to get all bookings with search
      const response = await adminAPI.getAllBookings({
        limit: 100,
        search: search || undefined
      });

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

        // Store all bookings for client-side pagination
        const recentBookings = bookings as RecentBooking[];

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
        // Reset to first page on new fetch
        setCurrentPage(1);
      } else {
        setError('Failed to fetch booking data');
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      setError(err?.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return (searchValue: string) => {
        clearTimeout(timeoutId);
        if (searchValue.trim() === '') {
          fetchBookings();
        } else {
          setSearchLoading(true);
          timeoutId = setTimeout(() => {
            fetchBookings(searchValue);
          }, 500);
        }
      };
    },
    [fetchBookings]
  );

  useEffect(() => {
    fetchBookings();
    fetchRoomMetrics();
  }, [fetchBookings]);

  // Fetch room number metrics
  const fetchRoomMetrics = async () => {
    try {
      // Create dates for "Today" query to get real-time status
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const checkInDate = today.toISOString().split('T')[0];
      const checkOutDate = tomorrow.toISOString().split('T')[0];

      const response = await api.get(`/room-numbers?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`);
      if (response?.data?.data) {
        const roomNumbers = response.data.data;
        const metrics = {
          total: roomNumbers.length,
          available: roomNumbers.filter((r: any) => (r.dateWiseStatus || r.status) === 'Available').length,
          allocated: roomNumbers.filter((r: any) => (r.dateWiseStatus || r.status) === 'Allocated').length,
          occupied: roomNumbers.filter((r: any) => (r.dateWiseStatus || r.status) === 'Occupied').length,
          maintenance: roomNumbers.filter((r: any) => (r.dateWiseStatus || r.status) === 'Maintenance' || (r.dateWiseStatus || r.status) === 'Out of Service').length,
        };
        setRoomMetrics(metrics);
      }
    } catch (err) {
      console.error('Error fetching room metrics:', err);
      // Don't set error state, just log it
    }
  };

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
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Prevent double spaces
    if (value.includes('  ')) {
      value = value.replace(/\s\s+/g, ' ');
    }

    setSearchTerm(value);
    debouncedSearch(value.trim());
  };

  // Handle search clear
  const handleClearSearch = () => {
    setSearchTerm('');
    fetchBookings();
  };

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

  if (loading && !data) {
    return (
      <DataLoader type="card" count={4} />
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data?.recentBookings.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = Math.ceil((data?.recentBookings.length || 0) / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

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

      {/* Room Availability Metrics */}
      {roomMetrics && (
        <Row className="g-4 mb-4">
          <Col md={12}>
            <Card className="border-start border-primary border-4">
              <Card.Body>
                <h6 className="mb-3">Room Availability Overview</h6>
                <Row>
                  <Col md={2}>
                    <div className="text-center">
                      <h4 className="mb-1 text-primary">{roomMetrics.total}</h4>
                      <small className="text-muted">Total Rooms</small>
                    </div>
                  </Col>

                  <Col md={2}>
                    <div className="text-center">
                      <h4 className="mb-1 text-warning">{roomMetrics.allocated}</h4>
                      <small className="text-muted">Allocated</small>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="text-center">
                      <h4 className="mb-1 text-danger">{roomMetrics.occupied}</h4>
                      <small className="text-muted">Occupied</small>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="text-center">
                      <h4 className="mb-1 text-secondary">{roomMetrics.maintenance}</h4>
                      <small className="text-muted">Maintenance</small>
                    </div>
                  </Col>
                  <Col md={2}>
                    <div className="text-center">
                      <h4 className="mb-1 text-info">
                        {roomMetrics.total > 0 ? Math.round(((roomMetrics.occupied + roomMetrics.allocated) / roomMetrics.total) * 100) : 0}%
                      </h4>
                      <small className="text-muted">Occupancy</small>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

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
                        {data?.recentBookings?.length || 0} found
                      </Badge>
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <div className="position-relative">
                    <InputGroup className="search-input-group">
                      <InputGroup.Text className="bg-light border-end-0">
                        <Search size={16} className="text-muted" />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Search bookings by name, email, phone, room, or status..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="border-start-0 ps-0"
                        style={{ boxShadow: 'none' }}
                      />
                      {(searchLoading || loading) && (
                        <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                          <Loader2 size={16} className="animate-spin text-muted" />
                        </div>
                      )}
                      {searchTerm && !searchLoading && (
                        <Button
                          variant="outline-secondary"
                          onClick={handleClearSearch}
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
                  </div>
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
                  {(loading || searchLoading) ? (
                    <DataLoader type="table" columns={9} count={5} />
                  ) : currentItems.length > 0 ? (
                    currentItems.map((booking) => (
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted">Show</span>
                    <Form.Select
                      size="sm"
                      style={{ width: 'auto' }}
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </Form.Select>
                    <span className="text-muted">entries</span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted">
                      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, data?.recentBookings.length || 0)} of {data?.recentBookings.length || 0} entries
                    </span>
                  </div>

                  <div className="d-flex gap-1">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      Previous
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "primary" : "outline-secondary"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}

                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Booking Details Modal */}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
        className="booking-details-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Booking Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking ? (
            <div>
              {/* Booking Header */}
              <div className="booking-header">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5>
                      Booking <span className="booking-id">#{selectedBooking.bookingId}</span>
                    </h5>
                    <div className="booking-date">
                      Created on {formatDate(selectedBooking.createdAt || '')}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="booking-amount">
                      ₹{selectedBooking.pricing?.totalAmount || 0}
                    </div>
                    <div className="booking-status">
                      <Badge bg={
                        selectedBooking.status === 'Confirmed' ? 'success' :
                          selectedBooking.status === 'Pending' ? 'warning' :
                            selectedBooking.status === 'CheckedIn' ? 'info' :
                              selectedBooking.status === 'CheckedOut' ? 'secondary' :
                                selectedBooking.status === 'Cancelled' ? 'danger' :
                                  'secondary'
                      }>
                        {selectedBooking.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <hr />

              <Row>
                <Col md={6}>
                  <Card className="info-card">
                    <Card.Body>
                      <h6>Guest Details</h6>
                      <div className="info-item">
                        <span className="info-label">Name:</span>
                        <span className="info-value">{selectedBooking.guestDetails.primaryGuest.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email:</span>
                        <span className="info-value">{selectedBooking.guestDetails.primaryGuest.email}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Phone:</span>
                        <span className="info-value">{selectedBooking.guestDetails.primaryGuest.phone}</span>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="info-card">
                    <Card.Body>
                      <h6>Booking Details</h6>
                      <div className="info-item">
                        <span className="info-label">Check-in:</span>
                        <span className="info-value">{formatDate(selectedBooking.bookingDates.checkInDate)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Check-out:</span>
                        <span className="info-value">{formatDate(selectedBooking.bookingDates.checkOutDate)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Room:</span>
                        <span className="info-value">{selectedBooking.room.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Room Type:</span>
                        <span className="info-value">{selectedBooking.room.type}</span>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading booking details...</span>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

// Helper function to format dates
const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

export default LiveDashboard;