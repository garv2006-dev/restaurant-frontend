import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Row, Col, Badge, Modal } from 'react-bootstrap';
import { adminAPI } from '../../services/api';
import { Booking, BookingFormData } from '../../types';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';

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
        const response = await adminAPI.getAllBookings({
          status: filters.status !== 'all' ? filters.status : undefined,
          date: filters.date || undefined,
          search: filters.search || undefined,
          page: pagination.page,
          limit: pagination.limit
        });
        setBookings(response.data?.bookings || []);
        setPagination(prev => ({
          ...prev,
          total: response.data?.pagination?.total || 0,
          pages: response.data?.pagination?.pages || 0
        }));
      } catch (err: any) {
        setError(
          err?.response?.data?.message || err?.message || 'Failed to load bookings'
        );
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
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: true }));
      await adminAPI.updateBookingStatus(bookingId, status);
      
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status } 
          : booking
      ));
      
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      console.error('Failed to update booking status:', err);
      // Handle error (e.g., show toast)
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
              <i className="bi bi-printer me-1"></i> Print
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
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
                      <tr key={booking.id}>
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
                            >
                              <i className="bi bi-eye"></i>
                            </Button>
                            
                            {booking.status === 'Pending' && (
                              <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking.id, 'Confirmed')}
                                disabled={actionLoading[booking.id]}
                                title="Confirm Booking"
                              >
                                {actionLoading[booking.id] ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-check-lg"></i>
                                )}
                              </Button>
                            )}
                            
                            {['Pending', 'Confirmed'].includes(booking.status) && (
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking.id, 'Cancelled')}
                                disabled={actionLoading[booking.id]}
                                title="Cancel Booking"
                              >
                                {actionLoading[booking.id] ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-x-lg"></i>
                                )}
                              </Button>
                            )}
                            
                            {booking.status === 'Confirmed' && (
                              <Button 
                                variant="outline-info" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking.id, 'CheckedIn')}
                                disabled={actionLoading[booking.id]}
                                title="Check In"
                              >
                                {actionLoading[booking.id] ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-box-arrow-in-right"></i>
                                )}
                              </Button>
                            )}
                            
                            {booking.status === 'CheckedIn' && (
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => handleStatusUpdate(booking.id, 'CheckedOut')}
                                disabled={actionLoading[booking.id]}
                                title="Check Out"
                              >
                                {actionLoading[booking.id] ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                  <i className="bi bi-box-arrow-right"></i>
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
                  <i className="bi bi-chevron-left"></i> Previous
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
                  Next <i className="bi bi-chevron-right"></i>
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
      >
        <Modal.Header closeButton>
          <Modal.Title>Booking Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking ? (
            <div>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h5>Booking #{selectedBooking.bookingId}</h5>
                  <div className="text-muted">
                    Created on {formatDate(selectedBooking.createdAt)}
                  </div>
                </div>
                <div className="text-end">
                  <div className="h4 mb-0">
                    ₹{getTotalPrice(selectedBooking)}
                  </div>
                  <div>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                </div>
              </div>

              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Card>
                    <Card.Body>
                      <h6 className="mb-3">Guest Information</h6>
                      <div className="mb-2">
                        <strong>Name:</strong> {selectedBooking.guestDetails?.primaryGuest?.name}
                      </div>
                      <div className="mb-2">
                        <strong>Email:</strong> {selectedBooking.guestDetails?.primaryGuest?.email}
                      </div>
                      <div className="mb-2">
                        <strong>Phone:</strong> {selectedBooking.guestDetails?.primaryGuest?.phone}
                      </div>
                      {selectedBooking.guestDetails?.additionalGuests?.length > 0 && (
                        <div className="mt-3">
                          <strong>Additional Guests:</strong>
                          <ul className="mb-0 mt-2">
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
                  <Card>
                    <Card.Body>
                      <h6 className="mb-3">Booking Details</h6>
                      <div className="mb-2">
                        <strong>Check-in:</strong> {formatDate(selectedBooking.bookingDates.checkInDate)}
                      </div>
                      <div className="mb-2">
                        <strong>Check-out:</strong> {formatDate(selectedBooking.bookingDates.checkOutDate)}
                      </div>
                      <div className="mb-2">
                        <strong>Nights:</strong> {selectedBooking.bookingDates.nights}
                      </div>
                      <div className="mb-2">
                        <strong>Guests:</strong> {selectedBooking.guestDetails?.totalAdults || 1} Adults, {selectedBooking.guestDetails?.totalChildren || 0} Children
                      </div>
                      {selectedBooking.specialRequests && (
                        <div className="mt-3">
                          <strong>Special Requests:</strong>
                          <div className="text-muted">
                            {selectedBooking.specialRequests}
                          </div>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card className="mb-4">
                <Card.Body>
                  <h6 className="mb-3">Pricing Breakdown</h6>
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
                          <tr className="table-success">
                            <td>
                              Discount {selectedBooking.pricing.discount.couponCode && `(${selectedBooking.pricing.discount.couponCode})`}
                            </td>
                            <td className="text-end text-danger">
                              -₹{selectedBooking.pricing.discount.amount.toFixed(2)}
                            </td>
                          </tr>
                        )}
                        
                        <tr className="border-top">
                          <td className="pt-2">
                            <strong>Total Amount</strong>
                          </td>
                          <td className="text-end pt-2">
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
            <div>Loading booking details...</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <i className="bi bi-printer me-1"></i> Print
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default BookingManagement;