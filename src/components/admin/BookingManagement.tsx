import React, { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Modal } from 'react-bootstrap';
import { adminAPI, roomsAPI } from '../../services/api';
import { Booking, Room } from '../../types';
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
  Search,
  Loader2,
  PlusCircle
} from 'lucide-react';
import DataLoader from '../common/DataLoader';
import OfflineBookingModal from './OfflineBookingModal';
import { getSocket } from '../../services/socket';

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
  const [searchLoading, setSearchLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(filters.search);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching bookings with filters:', { status: filters.status, date: filters.date, search: debouncedSearchTerm }); // Debug log

      const response = await adminAPI.getAllBookings({
        status: filters.status !== 'all' ? filters.status : undefined,
        date: filters.date || undefined,
        search: debouncedSearchTerm || undefined,
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
      setSearchLoading(false);
    }
  }, [filters.status, filters.date, debouncedSearchTerm, pagination.page, pagination.limit]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const socket = getSocket();

    const handleRefresh = () => {
      fetchBookings();
    };

    socket.on('new-booking', handleRefresh);
    socket.on('booking-status-change', handleRefresh);
    socket.on('booking-update', handleRefresh);

    return () => {
      socket.off('new-booking', handleRefresh);
      socket.off('booking-status-change', handleRefresh);
      socket.off('booking-update', handleRefresh);
    };
  }, [fetchBookings]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.search.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);



  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    let { value } = e.target;

    // Special validation for search input
    if (name === 'search') {
      // Prevent double spaces
      if (value.includes('  ')) {
        value = value.replace(/\s\s+/g, ' ');
      }
    }

    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));

    // Handle search loading state
    if (name === 'search') {
      setSearchLoading(true);
    }
  };

  const handleClearSearch = () => {
    setFilters(prev => ({ ...prev, search: '' }));
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
    // STRICT CSS ISOLATION via class toggle
    document.body.classList.add('printing-active');

    // Store original title
    const originalTitle = document.title;

    // Set print-friendly title
    if (selectedBooking) {
      document.title = `Booking Details - ${selectedBooking.bookingId}`;
    }

    // Wait for repaint then print
    setTimeout(() => {
      window.print();
      // Remove class after print dialog closes
      document.body.classList.remove('printing-active');
      document.title = originalTitle;
    }, 100);
  };



  const getStatusBadge = (status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'NoShow') => {
    const variants: { [key: string]: string } = {
      'Confirmed': 'success',
      'Pending': 'warning',
      'Cancelled': 'danger',
      'CheckedIn': 'info',
      'CheckedOut': 'dark',
      'NoShow': 'dark'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const handleOpenOfflineModal = async () => {
    try {
      setLoading(true);
      const response = await roomsAPI.getAllRooms();
      if (response.success && response.data) {
        setAvailableRooms(response.data.rooms);
        setShowOfflineModal(true);
      }
    } catch (err) {
      console.error("Failed to fetch rooms for offline booking", err);
      setError("Failed to load room types. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineSuccess = () => {
    fetchBookings(); // Refresh list
    // show success toast or message
  };

  return (
    <>
      <div className="admin-card mb-4">
        <div className="admin-card-header d-flex justify-content-between align-items-center">
          <h5 className="admin-card-title mb-0">Booking Management</h5>
          <div className="d-flex gap-2">
            <button className="admin-btn admin-btn-success admin-btn-sm" onClick={handleOpenOfflineModal} title="Create Walk-in/Offline Booking">
              <PlusCircle size={16} className="me-1" /> New Offline Booking
            </button>
          </div>
        </div>
        <div className="admin-card-body">
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
          <div className="row g-3 mb-4 align-items-end">
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted mb-1">Status</label>
              <select
                name="status"
                className="admin-form-select w-100"
                value={filters.status}
                onChange={(e) => handleFilterChange(e as any)}
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="CheckedIn">Checked In</option>
                <option value="CheckedOut">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
                <option value="NoShow">No Show</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold text-muted mb-1">Date</label>
              <input
                type="date"
                name="date"
                className="admin-form-control w-100"
                value={filters.date}
                onChange={(e) => handleFilterChange(e as any)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold text-muted mb-1">Search Booking</label>
              <div className="position-relative">
                <Search size={18} className="text-muted position-absolute top-50 start-0 translate-middle-y ms-3" style={{ zIndex: 5 }} />
                <input
                  type="search"
                  name="search"
                  value={filters.search}
                  onChange={(e) => handleFilterChange(e as any)}
                  placeholder="Search by booking ID, guest name or phone..."
                  disabled={loading}
                  className="admin-form-control ps-5 pe-5 w-100"
                />
                {filters.search && !searchLoading && !loading && (
                  <button
                    className="btn btn-sm text-muted position-absolute top-50 end-0 translate-middle-y me-2 border-0 p-0"
                    onClick={handleClearSearch}
                    style={{ background: 'transparent', zIndex: 5 }}
                    type="button"
                  >
                    <XCircle size={16} />
                  </button>
                )}
                {(searchLoading || loading) && (
                  <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                    <Loader2 size={16} className="animate-spin text-muted" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="admin-table table-hover align-middle">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Room Number</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && bookings.length === 0 ? (
                  <DataLoader type="table" count={5} columns={9} />
                ) : bookings.length > 0 ? (
                  bookings.map((booking) => {
                    const room = typeof booking.room === 'object' && booking.room !== null ? booking.room : null;
                    const guestName = booking.guestDetails?.primaryGuest?.name || 'Unknown';
                    const roomLabel = room ? `${room.name || ''}`.trim() : '-';

                    return (
                      <tr key={booking.id || booking._id}>
                        <td>
                          <div className="fw-semibold text-dark">{booking.bookingId}</div>
                          <div className="small text-muted">
                            {formatDate(booking.createdAt)}
                          </div>
                        </td>
                        <td>
                          <div className="fw-medium text-dark">{guestName}</div>
                          <div className="small text-muted">
                            {booking.guestDetails?.primaryGuest?.phone}
                          </div>
                        </td>
                        <td><span className="badge bg-light text-dark border fw-normal">{roomLabel}</span></td>
                        <td>
                          {booking.roomNumberInfo?.number ? (
                            <Badge bg="info" className="fw-normal">{booking.roomNumberInfo.number}</Badge>
                          ) : (
                            ['Cancelled', 'NoShow'].includes(booking.status) ? (
                              <span className="text-muted small">-</span>
                            ) : (
                              <Badge bg="secondary" className="fw-normal">Not Allocated</Badge>
                            )
                          )}
                        </td>
                        <td>
                          <div className="fw-medium text-dark">{formatDate(booking.bookingDates.checkInDate)}</div>
                          <div className="small text-muted">
                            {booking.bookingDates.nights} nights
                          </div>
                        </td>
                        <td><div className="text-dark">{formatDate(booking.bookingDates.checkOutDate)}</div></td>
                        <td><span className="fw-bold text-dark">₹{getTotalPrice(booking)}</span></td>
                        <td>{getStatusBadge(booking.status)}</td>
                        <td className="text-end">
                          <div className="admin-action-buttons justify-content-end">
                            <button
                              className="admin-action-btn view"
                              onClick={() => handleViewDetails(booking)}
                              title="View Details"
                              disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                            >
                              <Eye size={16} />
                            </button>

                            {booking.status === 'Pending' && (
                              <button
                                className="admin-action-btn confirm"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'Confirmed')}
                                disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                                title="Confirm this booking"
                              >
                                {(actionLoading[booking.id] || actionLoading[booking._id]) ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                              </button>
                            )}

                            {['Pending', 'Confirmed'].includes(booking.status) && (
                              <button
                                className="admin-action-btn delete"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'Cancelled')}
                                disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                                title="Cancel this booking"
                              >
                                {(actionLoading[booking.id] || actionLoading[booking._id]) ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <XCircle size={16} />
                                )}
                              </button>
                            )}

                            {booking.status === 'Confirmed' && (
                              <button
                                className="admin-action-btn checkin"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'CheckedIn')}
                                disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                                title="Check in guest"
                              >
                                {(actionLoading[booking.id] || actionLoading[booking._id]) ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <LogIn size={16} />
                                )}
                              </button>
                            )}

                            {booking.status === 'CheckedIn' && (
                              <button
                                className="admin-action-btn checkout"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'CheckedOut')}
                                disabled={actionLoading[booking.id] || actionLoading[booking._id]}
                                title="Check out guest"
                              >
                                {(actionLoading[booking.id] || actionLoading[booking._id]) ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <LogOut size={16} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-5">
                      {loading ? (
                        <div className="d-flex justify-content-center align-items-center">
                          <Loader2 size={24} className="animate-spin text-primary me-2" />
                          <span>Loading bookings...</span>
                        </div>
                      ) : (
                        <div className="text-muted">No bookings found matching your criteria</div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="admin-card-footer mt-0">
              <div className="d-flex justify-content-between align-items-center w-100">
                <div className="d-flex align-items-center gap-2 pagination-controls">
                  <span className="text-muted small pagination-label">Items per page:</span>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto', borderColor: 'var(--admin-border)' }}
                    value={pagination.limit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small me-2 pagination-info">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                  </span>

                  <div className="d-flex gap-1">
                    <button
                      className="admin-btn admin-btn-sm admin-btn-outline pagination-prev"
                      disabled={pagination.page === 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      <ChevronLeft size={16} /> <span className="d-none d-sm-inline ms-1">Previous</span>
                    </button>

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
                        <button
                          key={pageNum}
                          className={`admin-btn admin-btn-sm pagination-number ${pagination.page === pageNum ? 'admin-btn-primary' : 'admin-btn-outline'}`}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      className="admin-btn admin-btn-sm admin-btn-outline pagination-next"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      <span className="d-none d-sm-inline me-1">Next</span> <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
            <div id="printable-receipt-section" className="invoice-container">
              {/* Header */}
              <div className="invoice-header-bar">
                Hotel Bill
              </div>

              {/* Hotel Info & Logo */}
              <div className="hotel-info-grid">
                <div className="hotel-details">
                  <div className="hotel-row">
                    <span className="hotel-label">Name Of The Hotel :</span>
                    <span>Luxury Hotel</span>
                  </div>
                  <div className="hotel-row">
                    <span className="hotel-label">Address :</span>
                    <span>123 Resort Drive, Paradise City, 400001</span>
                  </div>
                  <div className="hotel-row mt-3">
                    <span className="hotel-label">Hotel Phone No :</span>
                    <span>+91 98765 43210</span>
                  </div>
                  <div className="hotel-row">
                    <span className="hotel-label">Email Id :</span>
                    <span>info@luxuryhotel.com</span>
                  </div>
                </div>
                <div className="hotel-logo-box" style={{ borderLeft: '2px solid #ccc', paddingLeft: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src="/favicon.svg"
                    alt="Hotel Logo"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '150px',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              </div>

              {/* Billing To Section */}
              <div className="invoice-section-header">
                Billing To
              </div>

              {/* Customer Details */}
              <div className="customer-info-grid">
                <div>
                  <div className="customer-row">
                    <span className="customer-label">Customer Name :</span>
                    <span className="customer-value">{selectedBooking.guestDetails?.primaryGuest?.name}</span>
                  </div>
                  <div className="customer-row">
                    <span className="customer-label">Phone No :</span>
                    <span className="customer-value">{selectedBooking.guestDetails?.primaryGuest?.phone}</span>
                  </div>
                </div>
                <div>
                  <div className="customer-row">
                    <span className="customer-label">Checkin Date :</span>
                    <span className="customer-value">
                      {(() => {
                        try {
                          return format(parseISO(selectedBooking.bookingDates.checkInDate), 'MMM dd, yyyy');
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </span>
                  </div>
                  <div className="customer-row">
                    <span className="customer-label">Check in Time :</span>
                    <span className="customer-value">
                      {(() => {
                        try {
                          return format(parseISO(selectedBooking.bookingDates.checkInDate), 'hh:mm a');
                        } catch (e) {
                          return 'Invalid Time';
                        }
                      })()}
                    </span>
                  </div>
                  <div className="customer-row">
                    <span className="customer-label">Checkout Date :</span>
                    <span className="customer-value">
                      {(() => {
                        try {
                          return format(parseISO(selectedBooking.bookingDates.checkOutDate), 'MMM dd, yyyy');
                        } catch (e) {
                          return 'Invalid Date';
                        }
                      })()}
                    </span>
                  </div>
                  <div className="customer-row">
                    <span className="customer-label">Check out Time :</span>
                    <span className="customer-value">
                      {/* Assuming standard checkout time or using actual checkout time if available, 
                          but typically just date is stored. If times are in the ISO string, this works. 
                          If defaulting to 11:00 AM standard: */}
                      {(() => {
                        try {
                          // If checkOutDate has time, use it, else default to standard 11:00 AM?
                          // Let's assume the date string might have time or we default to 11:00 AM for now if it's just a date.
                          // Actually the user probably wants the checkout time from the booking if present.
                          return format(parseISO(selectedBooking.bookingDates.checkOutDate), 'hh:mm a');
                        } catch (e) {
                          return '11:00 AM'; // Fallback
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill Details Table */}
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Room No</th>
                    <th>Particulars</th>
                    <th>No. Of Days</th>
                    <th>Price Per Day</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Room Charges */}
                  <tr>
                    <td>{selectedBooking.roomNumberInfo?.number || '-'}</td>
                    <td className="text-left">Room Charges ({selectedBooking.room && typeof selectedBooking.room === 'object' ? selectedBooking.room.name : 'Standard Room'})</td>
                    <td>{selectedBooking.bookingDates.nights}</td>
                    <td>₹{selectedBooking.pricing?.roomPrice ? (selectedBooking.pricing.roomPrice / selectedBooking.bookingDates.nights).toFixed(2) : '0.00'}</td>
                    <td>₹{selectedBooking.pricing?.roomPrice?.toFixed(2)}</td>
                  </tr>

                  {/* Extra Services */}
                  {selectedBooking.pricing?.extraServices?.map((service, index) => (
                    <tr key={index}>
                      <td>-</td>
                      <td className="text-left">{service.service}</td>
                      <td>{service.quantity}</td>
                      <td>₹{service.price.toFixed(2)}</td>
                      <td>₹{(service.price * service.quantity).toFixed(2)}</td>
                    </tr>
                  ))}

                  {/* Empty rows to fill space matching template */}
                  {[...Array(3)].map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={{ height: '40px' }}></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer Totals */}
              <div className="invoice-footer-grid">
                <div className="amount-words-section">
                  <strong>Amount in Words</strong>
                  <div style={{ marginTop: '10px', fontStyle: 'italic' }}>
                    {/* Placeholder for now logic to convert number to words */}
                    {/* One Thousand Four Hundred Only */}
                  </div>
                </div>
                <div className="totals-section">
                  <div className="total-row">
                    <div className="total-label">Total :</div>
                    <div className="total-value">₹{selectedBooking.pricing?.roomPrice?.toFixed(2)}</div>
                  </div>
                  <div className="total-row">
                    <div className="total-label">GST :</div>
                    <div className="total-value">
                      {selectedBooking.pricing?.taxes?.gst ? `₹${selectedBooking.pricing.taxes.gst.toFixed(2)}` : '₹0.00'}
                    </div>
                  </div>
                  <div className="total-row" style={{ backgroundColor: '#e0e7ff' }}>
                    <div className="total-label">Grand Total :</div>
                    <div className="total-value">₹{getTotalPrice(selectedBooking)}</div>
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                Note : __________________________________________________________________________________
              </div>

              {/* Signatures */}
              <div className="signature-section">
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-label">Customer Signature</div>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-label">Checked By</div>
                </div>
                <div className="signature-box">
                  <div className="signature-line"></div>
                  <div className="signature-label">Manager</div>
                </div>
              </div>
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

      <OfflineBookingModal
        show={showOfflineModal}
        onHide={() => setShowOfflineModal(false)}
        onSuccess={handleOfflineSuccess}
        rooms={availableRooms}
      />
    </>
  );
}

export default BookingManagement;