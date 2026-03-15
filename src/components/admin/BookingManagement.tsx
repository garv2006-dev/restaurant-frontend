import React, { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Modal } from 'react-bootstrap';
import { adminAPI, roomsAPI } from '../../services/api';
import { Booking, Room } from '../../types';
import { toast } from 'react-toastify';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import isSameDay from 'date-fns/isSameDay';
import isAfter from 'date-fns/isAfter';
import startOfDay from 'date-fns/startOfDay';
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
  PlusCircle,
  Key
} from 'lucide-react';
import DataLoader from '../common/DataLoader';
import OfflineBookingModal from './OfflineBookingModal';
import { useSocket } from '../../contexts/SocketContext';

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchBookings = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);

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
      toast.error(errorMessage);
      setBookings([]);
    } finally {
      if (!silent) setLoading(false);
      setSearchLoading(false);
    }
  }, [filters.status, filters.date, debouncedSearchTerm, pagination.page, pagination.limit]);

  // Socket listeners for real-time updates
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleRefresh = () => {
      fetchBookings(true);
    };

    socket.on('new-booking', handleRefresh);
    socket.on('booking-status-change', handleRefresh);
    socket.on('booking-update', handleRefresh);

    return () => {
      socket.off('new-booking', handleRefresh);
      socket.off('booking-status-change', handleRefresh);
      socket.off('booking-update', handleRefresh);
    };
  }, [socket, fetchBookings]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.search.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchBookings(false);
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

  const handleStatusUpdate = async (bookingId: string, status: 'Pending' | 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'NoShow' | 'PartiallyCancelled') => {
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

        // Show success toast
        toast.success(`Booking status updated to ${status}`);
      } else {
        throw new Error(response.message || 'Failed to update booking status');
      }
    } catch (err: any) {
      console.error('Failed to update booking status:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update booking status';
      toast.error(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleAutoAllocate = async (bookingId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: true }));

      const response = await adminAPI.autoAllocate(bookingId);

      if (response.success) {
        // Success: the socket might already trigger a refresh, 
        // but let's do it manually just in case
        fetchBookings(true);
        toast.success('Rooms allocated successfully!');
      } else {
        toast.error(response.message || 'Failed to allocate rooms');
      }
    } catch (err: any) {
      console.error('Auto-allocation failed:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to allocate rooms');
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



  const getStatusBadge = (status: Booking['status'], isPartiallyCancelled?: boolean) => {
    // Priority to Partial Cancel flag for label
    if (isPartiallyCancelled || status === 'PartiallyCancelled') {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 600,
            letterSpacing: '0.3px',
            textTransform: 'uppercase' as const,
            backgroundColor: '#ffedd5',
            color: '#9a3412',
            lineHeight: '1.4',
            whiteSpace: 'nowrap' as const
          }}
        >
          Partial Cancel
        </span>
      );
    }

    const statusStyles: { [key: string]: { bg: string; color: string; label: string } } = {
      'Pending': { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      'Confirmed': { bg: '#d1fae5', color: '#065f46', label: 'Confirmed' },
      'CheckedIn': { bg: '#dbeafe', color: '#1e40af', label: 'Checked In' },
      'CheckedOut': { bg: '#e2e8f0', color: '#334155', label: 'Checked Out' },
      'Cancelled': { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
      'NoShow': { bg: '#fce7f3', color: '#9d174d', label: 'No Show' },
      'PartiallyCancelled': { bg: '#ffedd5', color: '#9a3412', label: 'Partial Cancel' }
    };
    const style = statusStyles[status] || { bg: '#f1f5f9', color: '#475569', label: status };
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '5px 12px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: 600,
          letterSpacing: '0.3px',
          textTransform: 'uppercase' as const,
          backgroundColor: style.bg,
          color: style.color,
          lineHeight: '1.4',
          whiteSpace: 'nowrap' as const
        }}
      >
        {style.label}
      </span>
    );
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
      toast.error("Failed to load room types. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineSuccess = () => {
    fetchBookings(); // Refresh list
    toast.success('Offline booking created successfully!');
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
          {/* Replaced local error Alert with toast notifications */}

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
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && bookings.length === 0 ? (
                  <DataLoader type="table" count={5} columns={10} />
                ) : bookings.length > 0 ? (
                  bookings.map((booking) => {
                    const guestName = booking.guestDetails?.primaryGuest?.name || 'Unknown';
                    let roomLabel = 'No Rooms';
                    let roomNumbersDisplay: string[] = [];

                    if (booking.rooms && booking.rooms.length > 0) {
                      const roomTypes = new Set<string>();
                      const activeRooms = booking.rooms.filter(r => r.status !== 'Cancelled');
                      activeRooms.forEach(r => {
                        const type = typeof r.roomType === 'object' && r.roomType !== null ? (r.roomType as any).name || '' : 'Room';
                        roomTypes.add(type);
                        roomNumbersDisplay.push(r.roomNumberInfo ? r.roomNumberInfo.number : r.roomNumber);
                      });
                      roomLabel = Array.from(roomTypes).join(', ') + (activeRooms.length > 0 ? ` (${activeRooms.length})` : '');
                    } else if ((booking as any).room) {
                      const room = typeof (booking as any).room === 'object' && (booking as any).room !== null ? (booking as any).room : null;
                      roomLabel = room ? `${room.name || ''}`.trim() : '-';
                      if ((booking as any).roomNumberInfo?.number) roomNumbersDisplay.push((booking as any).roomNumberInfo.number);
                    }

                    // Strict Validation Logic for Admin Actions
                    const now = new Date();
                    const today = startOfDay(now);
                    const checkInDate = startOfDay(parseISO(booking.bookingDates.checkInDate));
                    const checkOutDate = startOfDay(parseISO(booking.bookingDates.checkOutDate));

                    // 1. Confirm: Only for Pending
                    const isCheckInDateReached = isSameDay(today, checkInDate) || isAfter(today, checkInDate);
                    const canCheckIn = (booking.status === 'Confirmed' || booking.status === 'PartiallyCancelled') && isCheckInDateReached;

                    const isCheckOutDateReached = isSameDay(today, checkOutDate) || isAfter(today, checkOutDate);
                    const canCheckOut = booking.status === 'CheckedIn' && isCheckOutDateReached;

                    const isLoading = actionLoading[booking.id] || actionLoading[booking._id];

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
                          {roomNumbersDisplay.length > 0 ? (
                            <div className="d-flex flex-wrap gap-1">
                              {roomNumbersDisplay.map((num, i) => (
                                <span
                                  key={i}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    backgroundColor: '#eef2ff',
                                    color: '#4338ca',
                                    border: '1px solid #c7d2fe',
                                    minWidth: '36px'
                                  }}
                                >
                                  {num}
                                </span>
                              ))}
                            </div>
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
                        <td>
                          {(() => {
                            const method = (booking as any).paymentDetails?.method || '';
                            const isCash = method.toLowerCase() === 'cash';
                            const isOnline = ['Razorpay', 'UPI', 'Online', 'Card', 'CreditCard', 'DebitCard', 'netbanking', 'wallet', 'PayPal', 'Stripe', 'BankTransfer', 'emi', 'cardless_emi', 'paylater'].some(
                              m => m.toLowerCase() === method.toLowerCase()
                            );

                            if (isCash) {
                              return (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                    letterSpacing: '0.3px',
                                    textTransform: 'uppercase' as const
                                  }}
                                >
                                  Cash
                                </span>
                              );
                            } else if (isOnline) {
                              return (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    backgroundColor: '#d1fae5',
                                    color: '#065f46',
                                    letterSpacing: '0.3px',
                                    textTransform: 'uppercase' as const
                                  }}
                                >
                                  Online
                                </span>
                              );
                            } else {
                              return <span className="text-muted small">—</span>;
                            }
                          })()}
                        </td>
                        <td>{getStatusBadge(booking.status, booking.isPartiallyCancelled)}</td>
                        <td className="text-end">
                          <div className="admin-action-buttons justify-content-end">
                            {/* 👁 View Detail - Always Show */}
                            <button
                              className="admin-action-btn view"
                              onClick={() => handleViewDetails(booking)}
                              title="View Details"
                              disabled={isLoading}
                            >
                              <Eye size={16} />
                            </button>

                            {/* ✅ Confirm Button: Show if Pending or for older PartiallyCancelled records */}
                            {(booking.status === 'Pending' || (booking.status === 'PartiallyCancelled' && !booking.isPartiallyCancelled)) && (
                              <button
                                className="admin-action-btn confirm"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'Confirmed')}
                                disabled={isLoading}
                                title="Confirm this booking"
                              >
                                {isLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                              </button>
                            )}

                            {/* 🔑 Allocate Button: Show for Confirmed with missing allocations */}
                            {booking.status === 'Confirmed' && booking.rooms?.some(r => !r.roomNumber) && (
                              <button
                                className="admin-action-btn allocate"
                                onClick={() => handleAutoAllocate(booking.id || booking._id)}
                                disabled={isLoading}
                                title="Auto-allocate rooms"
                                style={{
                                  color: '#059669',
                                  backgroundColor: 'rgba(5, 150, 105, 0.1)',
                                  borderColor: 'rgba(5, 150, 105, 0.2)'
                                }}
                              >
                                {isLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Key size={16} />
                                )}
                              </button>
                            )}

                            {/* ✔ Check-In Button: Show only for Confirmed */}
                            {booking.status === 'Confirmed' && (
                              <button
                                className="admin-action-btn checkin"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'CheckedIn')}
                                disabled={!canCheckIn || isLoading}
                                title={
                                  isCheckInDateReached
                                    ? "Check in guest"
                                    : `Check-in allowed from ${format(checkInDate, 'MMM dd, yyyy')}`
                                }
                              >
                                {isLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <LogIn size={16} />
                                )}
                              </button>
                            )}

                            {/* 🚪 Check-Out Button: Show only for Checked-In */}
                            {booking.status === 'CheckedIn' && (
                              <button
                                className="admin-action-btn checkout"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'CheckedOut')}
                                disabled={!canCheckOut || isLoading}
                                title={
                                  isCheckOutDateReached
                                    ? "Check out guest"
                                    : `Check-out allowed from ${format(checkOutDate, 'MMM dd, yyyy')}`
                                }
                              >
                                {isLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <LogOut size={16} />
                                )}
                              </button>
                            )}

                            {/* ⛔ Cancel Button: Show for Pending or Confirmed */}
                            {['Pending', 'Confirmed'].includes(booking.status) && (
                              <button
                                className="admin-action-btn delete"
                                onClick={() => handleStatusUpdate(booking.id || booking._id, 'Cancelled')}
                                disabled={isLoading}
                                title="Cancel this booking"
                              >
                                {isLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <XCircle size={16} />
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
                    <td colSpan={10} className="text-center py-5">
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
                  {selectedBooking.rooms && selectedBooking.rooms.length > 0 ? (
                    selectedBooking.rooms.map((roomItem, idx) => (
                      <tr key={`room-${idx}`}>
                        <td>{roomItem.roomNumberInfo?.number || roomItem.roomNumber || '-'}</td>
                        <td className="text-left">
                          Room Charges ({typeof roomItem.roomType === 'object' && roomItem.roomType !== null ? (roomItem.roomType as any).name : 'Standard Room'})
                          {roomItem.status === 'Cancelled' && <span className="text-danger ms-2">(Cancelled)</span>}
                        </td>
                        <td>{selectedBooking.bookingDates.nights}</td>
                        <td>₹{(roomItem.price / selectedBooking.bookingDates.nights).toFixed(2)}</td>
                        <td>₹{roomItem.price.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td>{(selectedBooking as any).roomNumberInfo?.number || '-'}</td>
                      <td className="text-left">Room Charges ({(selectedBooking as any).room && typeof (selectedBooking as any).room === 'object' ? (selectedBooking as any).room.name : 'Standard Room'})</td>
                      <td>{selectedBooking.bookingDates.nights}</td>
                      <td>₹{selectedBooking.pricing?.roomPrice ? (selectedBooking.pricing.roomPrice / selectedBooking.bookingDates.nights).toFixed(2) : '0.00'}</td>
                      <td>₹{selectedBooking.pricing?.roomPrice?.toFixed(2)}</td>
                    </tr>
                  )}

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