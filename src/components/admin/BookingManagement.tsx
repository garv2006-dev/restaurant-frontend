import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Row, Col, Badge, Modal } from 'react-bootstrap';
import { adminAPI } from '../../services/api';
import { Booking, BookingFormData } from '../../types';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  LogIn, 
  LogOut, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Loader2
} from 'lucide-react';

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState<{
    status: string;
    date: string;
    search: string;
  }>({
    status: 'all',
    date: '',
    search: ''
  });
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching bookings with filters:', filters); // Debug log
        
        const response = await adminAPI.getAllBookings({
          status: filters.status !== 'all' ? filters.status : undefined,
          date: filters.date || undefined,
          search: filters.search || undefined,
          page: pagination.page,
          limit: pagination.limit
        });
        
        console.log('Bookings API response:', response); // Debug log
        
        if (response.success && response.data) {
          const bookingsData = response.data.bookings || [];
          console.log('Processed bookings data:', bookingsData); // Debug log
          
          setBookings(bookingsData);
          setPagination(prev => ({
            ...prev,
            total: response.data?.pagination?.total || 0,
            pages: response.data?.pagination?.pages || 0
          }));
        } else {
          throw new Error(response.message || 'Failed to fetch bookings');
        }
      } catch (err: any) {
        console.error('Error fetching bookings:', err); // Debug log
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load bookings';
        setError(errorMessage);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [filters, pagination.page, pagination.limit]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
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
      setError(null); // Clear any previous errors
      
      console.log('Updating booking status:', { bookingId, status }); // Debug log
      
      const response = await adminAPI.updateBookingStatus(bookingId, status);
      
      console.log('Status update response:', response); // Debug log
      
      if (response.success) {
        // Update local state
        setBookings(prev => prev.map(booking => 
          (booking.id === bookingId || booking._id === bookingId)
            ? { ...booking, status } 
            : booking
        ));
        
        // Update selected booking if it's the same one
        if (selectedBooking && (selectedBooking.id === bookingId || selectedBooking._id === bookingId)) {
          setSelectedBooking(prev => prev ? { ...prev, status } : null);
        }
        
        // Show success message
        console.log('Booking status updated successfully');
        
        // Optional: Show a success toast instead of console.log
        // toast.success(`Booking status updated to ${status}`);
      } else {
        throw new Error(response.message || 'Failed to update booking status');
      }
    } catch (err: any) {
      console.error('Failed to update booking status:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update booking status';
      setError(errorMessage);
      
      // Show error to user (you can replace this with a toast notification)
      alert(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy hh:mm a');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };

  const getTotalPrice = (booking: Booking) => {
    return booking.pricing?.totalAmount?.toFixed(2) || '0.00';
  };

  const handlePrintBooking = () => {
    // Store original title
    const originalTitle = document.title;
    
    // Set print-friendly title
    if (selectedBooking) {
      document.title = `Booking Details - ${selectedBooking.bookingId}`;
    }
    
    // Add a small delay to ensure modal is fully rendered
    setTimeout(() => {
      window.print();
      
      // Restore original title after print dialog
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 100);
  };

  
  const getStatusBadge = (status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'NoShow') => {
    const variants: { [key: string]: string } = {
      'Confirmed': 'success',
      'Pending': 'warning',
      'Cancelled': 'danger',
      'CheckedIn': 'info',
      'CheckedOut': 'secondary',
      'NoShow': 'dark'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center py-4">
          <div>Loading bookings...</div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Body>
          <div className="text-danger">Error: {error}</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Booking Management</h5>
          <div>
            <Button variant="primary" size="sm" onClick={() => window.print()}>
              <Printer size={16} className="me-1" /> Print
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <strong>Error:</strong> {error}
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setError(null)}
                aria-label="Close"
              ></button>
            </div>
          )}
          <Row className="mb-3 g-3">
            <Col md={3}>
              <Form.Select 
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="CheckedIn">Checked In</option>
                <option value="CheckedOut">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
                <option value="NoShow">No Show</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Control 
                as="input"
                type="date" 
                name="date"
                value={filters.date}
                onChange={handleFilterChange}
              />
            </Col>
            <Col md={6}>
              <Form.Control 
                as="input"
                type="search" 
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by booking ID or guest name" 
              />
            </Col>
          </Row>

          <div className="table-responsive">
            <Table hover className="align-middle">
              <thead className="table-light">
                <tr>
                  <th>Booking ID</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length > 0 ? (
                  bookings.map((booking) => {
                    const room = typeof booking.room === 'object' && booking.room !== null ? booking.room : null;
                    const guestName = booking.guestDetails?.primaryGuest?.name || 'Unknown';
                    const roomLabel = room ? `${room.name || ''} ${room.roomNumber ? `#${room.roomNumber}` : ''}`.trim() : '-';
                    
                    return (
                      <tr key={booking.id || booking._id}>
                        <td>
                          <div className="fw-semibold">{booking.bookingId}</div>
                          <small className="text-muted">
                            {formatDate(booking.createdAt)}
                          </small>
                        </td>
                        <td>
                          <div>{guestName}</div>
                          <small className="text-muted">
                            {booking.guestDetails?.primaryGuest?.phone}
                          </small>
                        </td>
                        <td>{roomLabel}</td>
                        <td>
                          <div>{formatDate(booking.bookingDates.checkInDate)}</div>
                          <small className="text-muted">
                            {booking.bookingDates.nights} nights
                          </small>
                        </td>
                        <td>{formatDate(booking.bookingDates.checkOutDate)}</td>
                        <td>₹{getTotalPrice(booking)}</td>
                        <td>{getStatusBadge(booking.status)}</td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              onClick={() => handleViewDetails(booking)}
                              title="View Details"
                              disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                            >
                              <Eye size={16} />
                            </Button>
                            
                            {booking.status === 'Pending' && (
                              <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'Confirmed')}
                                disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                                title="Confirm this booking"
                                className="d-flex align-items-center"
                              >
                                {(actionLoading[booking.id] || actionLoading[booking._id]) ? (
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
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'Cancelled')}
                                disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                                title="Cancel this booking"
                                className="d-flex align-items-center"
                              >
                                {(actionLoading[booking.id] || actionLoading[booking._id]) ? (
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
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'CheckedIn')}
                                disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                                title="Check in guest"
                                className="d-flex align-items-center"
                              >
                                {(actionLoading[booking.id] || actionLoading[booking._id]) ? (
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
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'CheckedOut')}
                                disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                                title="Check out guest"
                                className="d-flex align-items-center"
                              >
                                {(actionLoading[booking.id] || actionLoading[booking._id]) ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <LogOut size={16} />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      {loading ? (
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : (
                        <div className="text-muted">No bookings found</div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted">Show</span>
                <Form.Select 
                  size="sm" 
                  style={{ width: 'auto' }}
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
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
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </span>
              </div>
              
              <div className="d-flex gap-1">
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </Button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? "primary" : "outline-secondary"}
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
                  disabled={pagination.page === pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

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
              {/* Print-only header */}
              <div className="d-none d-print-block text-center mb-4">
                <h1 style={{ fontSize: '24pt', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  Hotel Booking Receipt
                </h1>
                <p style={{ fontSize: '12pt', color: '#666', margin: '0' }}>
                  Generated on {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Booking Header */}
              <div className="booking-header">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5>
                      Booking <span className="booking-id">#{selectedBooking.bookingId}</span>
                    </h5>
                    <div className="booking-date">
                      Created on {formatDate(selectedBooking.createdAt)}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="booking-amount">
                      ₹{getTotalPrice(selectedBooking)}
                    </div>
                    <div className="booking-status">
                      {getStatusBadge(selectedBooking.status)}
                    </div>
                  </div>
                </div>
              </div>

              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Card className="info-card">
                    <Card.Body>
                      <h6>Guest Information</h6>
                      <div className="info-item">
                        <span className="info-label">Name:</span>
                        <span className="info-value">{selectedBooking.guestDetails?.primaryGuest?.name}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Email:</span>
                        <span className="info-value">{selectedBooking.guestDetails?.primaryGuest?.email}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Phone:</span>
                        <span className="info-value">{selectedBooking.guestDetails?.primaryGuest?.phone}</span>
                      </div>
                      {selectedBooking.guestDetails?.additionalGuests?.length > 0 && (
                        <div className="additional-guests">
                          <strong>Additional Guests:</strong>
                          <ul>
                            {selectedBooking.guestDetails.additionalGuests.map((guest, index) => (
                              <li key={index}>
                                {guest.name} {guest.relation && `(${guest.relation})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                        <span className="info-label">Nights:</span>
                        <span className="info-value">{selectedBooking.bookingDates.nights}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Guests:</span>
                        <span className="info-value">{selectedBooking.guestDetails?.totalAdults || 1} Adults, {selectedBooking.guestDetails?.totalChildren || 0} Children</span>
                      </div>
                      {selectedBooking.specialRequests && (
                        <div className="special-requests">
                          <strong>Special Requests:</strong>
                          <div>{selectedBooking.specialRequests}</div>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card className="pricing-breakdown">
                <Card.Body>
                  <h6>Pricing Breakdown</h6>
                  <div className="table-responsive">
                    <Table borderless className="mb-0">
                      <tbody>
                        <tr>
                          <td>Room Charges ({selectedBooking.bookingDates.nights} nights)</td>
                          <td className="text-end">₹{selectedBooking.pricing?.roomPrice?.toFixed(2) || '0.00'}</td>
                        </tr>
                        
                        {selectedBooking.pricing?.extraServices?.map((service, index) => (
                          <tr key={`service-${index}`}>
                            <td>
                              {service.service} (x{service.quantity})
                            </td>
                            <td className="text-end">
                              ₹{(service.price * service.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        
                        {selectedBooking.pricing?.discount?.amount > 0 && (
                          <tr className="discount-row">
                            <td>
                              Discount {selectedBooking.pricing.discount.couponCode && `(${selectedBooking.pricing.discount.couponCode})`}
                            </td>
                            <td className="text-end">
                              -₹{selectedBooking.pricing.discount.amount.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        
                        <tr className="total-row">
                          <td>
                            <strong>Total Amount</strong>
                          </td>
                          <td className="text-end">
                            <strong>₹{getTotalPrice(selectedBooking)}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading booking details...</span>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="d-print-none">
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrintBooking}>
            <Printer size={16} className="me-1" /> Print
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default BookingManagement;