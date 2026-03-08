import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Badge, Modal, Alert } from 'react-bootstrap';
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
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import isSameDay from 'date-fns/isSameDay';
import isAfter from 'date-fns/isAfter';
import startOfDay from 'date-fns/startOfDay';
import { adminAPI } from '../../services/api';
import api from '../../services/api';
import '../../styles/admin-panel.css';
import DataLoader from '../common/DataLoader';
import { useSocket } from '../../contexts/SocketContext';

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
  room?: {
    _id: string;
    name: string;
    type: string;
  };
  rooms?: any[];
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
  const fetchBookings = useCallback(async (search?: string, silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
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
        const totalRevenue = bookings
          .filter((b: any) => b.status !== 'Cancelled')
          .reduce((sum: number, b: any) => sum + (b.pricing?.totalAmount || 0), 0);
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
      if (!silent) setLoading(false);
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

  // Socket Integration
  const { socket } = useSocket();

  useEffect(() => {
    fetchBookings();
    fetchRoomMetrics();
  }, [fetchBookings]);

  // Handle Real-time Updates
  useEffect(() => {
    if (!socket) return;

    const handleNewBooking = (data: any) => {
      console.log('🔔 New booking received via socket:', data);
      // Refresh data to show new booking
      fetchBookings(searchTerm, true);
      fetchRoomMetrics();
    };

    const handleBookingStatusChange = (data: any) => {
      console.log('🔔 Booking status changed via socket:', data);
      // Refresh data to reflect status change
      fetchBookings(searchTerm, true);
      fetchRoomMetrics();
    };

    const handleDashboardUpdate = (data: any) => {
      console.log('🔔 Dashboard update received via socket:', data);
      // Refresh stats
      fetchBookings(searchTerm, true);
      fetchRoomMetrics();
    };

    const handleRoomUpdate = (data: any) => {
      console.log('🔔 Room update received via socket:', data);
      fetchRoomMetrics();
    };

    const handleRoomNumbersChange = () => {
      console.log('🔔 Room numbers change received via socket');
      fetchRoomMetrics();
    };

    const handleRoomsChange = () => {
      console.log('🔔 Rooms change received via socket');
      fetchRoomMetrics();
    };

    // Listen for events
    socket.on('new-booking', handleNewBooking);
    socket.on('new_booking_confirmed', handleNewBooking); // Also listen for confirmed bookings
    socket.on('booking-status-change', handleBookingStatusChange);
    socket.on('booking_cancelled', handleBookingStatusChange); // Also listen for cancellations
    socket.on('dashboard-update', handleDashboardUpdate);
    socket.on('room_updated', handleRoomUpdate);
    socket.on('room-numbers-change', handleRoomNumbersChange);
    socket.on('rooms-change', handleRoomsChange);

    // Cleanup listeners
    return () => {
      socket.off('new-booking', handleNewBooking);
      socket.off('new_booking_confirmed', handleNewBooking);
      socket.off('booking-status-change', handleBookingStatusChange);
      socket.off('booking_cancelled', handleBookingStatusChange);
      socket.off('dashboard-update', handleDashboardUpdate);
      socket.off('room_updated', handleRoomUpdate);
      socket.off('room-numbers-change', handleRoomNumbersChange);
      socket.off('rooms-change', handleRoomsChange);
    };
  }, [socket, fetchBookings, searchTerm]);

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
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6 col-12">
          <div className="admin-card h-100 no-hover">
            <div className="admin-card-body d-flex align-items-center">
              <div className="d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-3 p-3 me-3" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                <Book size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h6 className="text-uppercase text-muted small fw-semibold mb-1">Total Bookings</h6>
                <h5 className="mb-0 fw-bold text-dark">{data?.totalBookings || 0}</h5>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 col-12">
          <div className="admin-card h-100 no-hover">
            <div className="admin-card-body d-flex align-items-center">
              <div className="d-flex align-items-center justify-content-center bg-success bg-opacity-10 text-success rounded-3 p-3 me-3" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                <DollarSign size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h6 className="text-uppercase text-muted small fw-semibold mb-1">Total Revenue</h6>
                <h5 className="mb-0 fw-bold text-dark text-nowrap">₹{data?.totalRevenue.toLocaleString() || 0}</h5>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 col-12">
          <div className="admin-card h-100 no-hover">
            <div className="admin-card-body d-flex align-items-center">
              <div className="d-flex align-items-center justify-content-center bg-info bg-opacity-10 text-info rounded-3 p-3 me-3" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                <TrendingUp size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h6 className="text-uppercase text-muted small fw-semibold mb-1">Occupancy Rate</h6>
                <h5 className="mb-0 fw-bold text-dark">
                  {roomMetrics && roomMetrics.total > 0
                    ? Math.round(((roomMetrics.occupied + roomMetrics.allocated) / roomMetrics.total) * 100)
                    : 0}%
                </h5>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 col-12">
          <div className="admin-card h-100 no-hover">
            <div className="admin-card-body d-flex align-items-center">
              <div className="d-flex align-items-center justify-content-center bg-warning bg-opacity-10 text-warning rounded-3 p-3 me-3" style={{ width: '48px', height: '48px', minWidth: '48px' }}>
                <Calendar size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h6 className="text-uppercase text-muted small fw-semibold mb-1">Pending Check-ins</h6>
                <h5 className="mb-0 fw-bold text-dark">{data?.pendingCheckins || 0}</h5>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Room Availability Metrics */}
      {roomMetrics && (
        <div className="row g-4 mb-4">
          <div className="col-12">
            <div className="admin-card no-hover">
              <div className="admin-card-header">
                <h5 className="admin-card-title mb-0">Room Availability Overview</h5>
              </div>
              <div className="admin-card-body">
                <div className="row text-center">
                  <div className="col">
                    <div className="p-3 rounded-3 border border-light bg-light bg-opacity-50">
                      <h3 className="fw-bold text-primary mb-1">{roomMetrics.total}</h3>
                      <span className="text-muted small text-uppercase fw-semibold">Total Rooms</span>
                    </div>
                  </div>
                  <div className="col">
                    <div className="p-3 rounded-3 border border-light bg-light bg-opacity-50">
                      <h3 className="fw-bold text-success mb-1">{roomMetrics.available}</h3>
                      <span className="text-muted small text-uppercase fw-semibold">Available</span>
                    </div>
                  </div>
                  <div className="col">
                    <div className="p-3 rounded-3 border border-light bg-light bg-opacity-50">
                      <h3 className="fw-bold text-warning mb-1">{roomMetrics.allocated}</h3>
                      <span className="text-muted small text-uppercase fw-semibold">Allocated</span>
                    </div>
                  </div>
                  <div className="col">
                    <div className="p-3 rounded-3 border border-light bg-light bg-opacity-50">
                      <h3 className="fw-bold text-danger mb-1">{roomMetrics.occupied}</h3>
                      <span className="text-muted small text-uppercase fw-semibold">Occupied</span>
                    </div>
                  </div>
                  <div className="col">
                    <div className="p-3 rounded-3 border border-light bg-light bg-opacity-50">
                      <h3 className="fw-bold text-secondary mb-1">{roomMetrics.maintenance}</h3>
                      <span className="text-muted small text-uppercase fw-semibold">Maintenance</span>
                    </div>
                  </div>
                  <div className="col">
                    <div className="p-3 rounded-3 border border-light bg-light bg-opacity-50">
                      <h3 className="fw-bold text-info mb-1">
                        {roomMetrics.total > 0 ? Math.round(((roomMetrics.occupied + roomMetrics.allocated) / roomMetrics.total) * 100) : 0}%
                      </h3>
                      <span className="text-muted small text-uppercase fw-semibold">Occupancy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-header d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-3">
              <h5 className="admin-card-title mb-0">Recent Bookings</h5>
              <div className="live-indicator">
                <span className="pulsing-dot"></span>
                LIVE
              </div>
            </div>
            {searchTerm && (
              <Badge bg="info" className="fw-normal rounded-pill px-3">
                {data?.recentBookings?.length || 0} found
              </Badge>
            )}
          </div>

          <div className="admin-search position-relative" style={{ minWidth: '300px' }}>
            <Search size={18} className="admin-search-icon text-muted position-absolute top-50 start-0 translate-middle-y ms-3" />
            <input
              type="text"
              className="admin-form-control ps-5"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && !searchLoading && (
              <button
                className="btn btn-sm text-muted position-absolute top-50 end-0 translate-middle-y me-2 border-0 p-0"
                onClick={handleClearSearch}
                style={{ background: 'transparent' }}
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

        <div className="admin-card-body p-0">
          {error && (
            <div className="m-4">
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                <strong>Error:</strong> {error}
              </Alert>
            </div>
          )}

          <div className="table-responsive">
            <table className="admin-table table-hover mb-0">
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Contact</th>
                  <th>Room Info</th>
                  <th>Dates</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(loading || searchLoading) ? (
                  <tr>
                    <td colSpan={7} className="p-5 text-center">
                      <div className="d-flex justify-content-center">
                        <DataLoader type="spinner" />
                      </div>
                    </td>
                  </tr>
                ) : currentItems.length > 0 ? (
                  currentItems.map((booking) => (
                    <tr key={booking._id}>
                      <td>
                        <div className="fw-semibold text-dark">{booking.guestDetails.primaryGuest.name}</div>
                        <div className="small text-muted">ID: #{booking.bookingId}</div>
                      </td>
                      <td>
                        <div className="d-flex flex-column small">
                          <span className="text-dark">{booking.guestDetails.primaryGuest.phone}</span>
                          <span className="text-muted">{booking.guestDetails.primaryGuest.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          {booking.rooms && (booking as any).rooms.length > 0 ? (
                            (booking as any).rooms.map((r: any, idx: number) => (
                              <div key={idx} className="d-flex align-items-center gap-1">
                                <span className="badge bg-light text-dark border">
                                  {typeof r.roomType === 'object' ? r.roomType.name : 'Room'} #{r.roomNumberInfo ? r.roomNumberInfo.number : r.roomNumber}
                                </span>
                              </div>
                            ))
                          ) : (
                            <>
                              <span className="badge bg-light text-dark border">{booking?.room?.name}</span>
                              <span className="small text-muted">{booking?.room?.type || 'Room'}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column small">
                          {(() => {
                            try {
                              const checkIn = parseISO(booking.bookingDates.checkInDate);
                              const checkOut = parseISO(booking.bookingDates.checkOutDate);
                              return (
                                <>
                                  <div><span className="text-muted w-25 d-inline-block">In:</span> <span className="fw-medium">{format(checkIn, 'MMM dd, yyyy')}</span></div>
                                  <div><span className="text-muted w-25 d-inline-block">Out:</span> <span className="fw-medium">{format(checkOut, 'MMM dd, yyyy')}</span></div>
                                </>
                              );
                            } catch (e) {
                              return (
                                <>
                                  <div><span className="text-muted w-25 d-inline-block">In:</span> <span className="fw-medium">{new Date(booking.bookingDates.checkInDate).toLocaleDateString()}</span></div>
                                  <div><span className="text-muted w-25 d-inline-block">Out:</span> <span className="fw-medium">{new Date(booking.bookingDates.checkOutDate).toLocaleDateString()}</span></div>
                                </>
                              );
                            }
                          })()}
                        </div>
                      </td>
                      <td>
                        <span className="fw-bold text-dark">₹{booking.pricing?.totalAmount?.toFixed(2) || '0.00'}</span>
                      </td>
                      <td>
                        {(() => {
                          const status = booking.status;
                          let style: { bg: string; color: string } = { bg: '#f1f5f9', color: '#475569' };

                          if (status === 'Confirmed') style = { bg: '#d1fae5', color: '#065f46' };
                          else if (status === 'Pending') style = { bg: '#fef3c7', color: '#92400e' };
                          else if (status === 'CheckedIn') style = { bg: '#dbeafe', color: '#1e40af' };
                          else if (status === 'CheckedOut') style = { bg: '#e2e8f0', color: '#334155' };
                          else if (status === 'Cancelled') style = { bg: '#fee2e2', color: '#991b1b' };

                          return (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                letterSpacing: '0.2px',
                                textTransform: 'uppercase',
                                backgroundColor: style.bg,
                                color: style.color,
                                lineHeight: '1.4'
                              }}
                            >
                              {status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="text-end">
                        <div className="admin-action-buttons justify-content-end">
                          {/* 👁 View Detail - Always Show */}
                          <button
                            className="admin-action-btn view"
                            onClick={() => handleViewDetails(booking)}
                            title="View Details"
                            disabled={actionLoading[booking._id]}
                          >
                            <Eye size={16} />
                          </button>

                          {(() => {
                            const now = new Date();
                            const today = startOfDay(now);
                            const checkInDate = startOfDay(parseISO(booking.bookingDates.checkInDate));
                            const checkOutDate = startOfDay(parseISO(booking.bookingDates.checkOutDate));
                            const isLoading = actionLoading[booking._id];
                            const isCheckInDay = isSameDay(today, checkInDate) || isAfter(today, checkInDate);
                            const isCheckOutDay = isSameDay(today, checkOutDate) || isAfter(today, checkOutDate);

                            return (
                              <>
                                {/* ✅ Confirm: Only for Pending */}
                                {booking.status === 'Pending' && (
                                  <button
                                    className="admin-action-btn confirm"
                                    onClick={() => handleStatusUpdate(booking._id, 'Confirmed')}
                                    disabled={isLoading}
                                    title="Confirm Booking"
                                  >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                  </button>
                                )}

                                {/* ✔ Check-In: Only for Confirmed + Date reached */}
                                {booking.status === 'Confirmed' && (
                                  <button
                                    className="admin-action-btn checkin"
                                    onClick={() => handleStatusUpdate(booking._id, 'CheckedIn')}
                                    disabled={!isCheckInDay || isLoading}
                                    title={
                                      isCheckInDay
                                        ? "Check In"
                                        : `Check-in allowed from ${format(checkInDate, 'MMM dd, yyyy')}`
                                    }
                                  >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                                  </button>
                                )}

                                {/* 🚪 Check-Out: Only for Checked-In + Date reached */}
                                {booking.status === 'CheckedIn' && (
                                  <button
                                    className="admin-action-btn checkout"
                                    onClick={() => handleStatusUpdate(booking._id, 'CheckedOut')}
                                    disabled={!isCheckOutDay || isLoading}
                                    title={
                                      isCheckOutDay
                                        ? "Check Out"
                                        : `Check-out allowed from ${format(checkOutDate, 'MMM dd, yyyy')}`
                                    }
                                  >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                                  </button>
                                )}

                                {/* ⛔ Cancel: For Pending or Confirmed */}
                                {['Pending', 'Confirmed'].includes(booking.status) && (
                                  <button
                                    className="admin-action-btn delete"
                                    onClick={() => handleStatusUpdate(booking._id, 'Cancelled')}
                                    disabled={isLoading}
                                    title="Cancel Booking"
                                  >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-5">
                      <div className="mb-2"><Search size={24} className="text-muted opacity-50" /></div>
                      {searchTerm ? `No bookings found matching "${searchTerm}"` : 'No bookings available yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-card-footer d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small">Items per page:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: '70px', borderColor: 'var(--admin-border)' }}
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
                </select>
              </div>

              <div className="d-flex align-items-center gap-2">
                <span className="text-muted small me-2 d-none d-sm-inline">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="d-flex gap-1">
                  <button
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    <ChevronLeft size={16} /> <span className="d-none d-sm-inline ms-1">Previous</span>
                  </button>
                  <button
                    className="admin-btn admin-btn-sm admin-btn-outline"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    <span className="d-none d-sm-inline me-1">Next</span> <ChevronRight size={16} />
                  </button>
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
                      <hr />
                      <h6>Rooms Allocated</h6>
                      {(selectedBooking as any).rooms && (selectedBooking as any).rooms.length > 0 ? (
                        (selectedBooking as any).rooms.map((r: any, idx: number) => (
                          <div key={idx} className="mb-2 p-2 border rounded bg-light bg-opacity-50">
                            <div className="d-flex justify-content-between align-items-center">
                              <strong>Room {r.roomNumberInfo ? r.roomNumberInfo.number : r.roomNumber}</strong>
                              <Badge bg={r.status === 'Cancelled' ? 'danger' : 'success'}>{r.status}</Badge>
                            </div>
                            <div className="small text-muted">
                              {typeof r.roomType === 'object' ? r.roomType.name : 'Standard Room'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="info-item">
                          <span className="info-label">Room:</span>
                          <span className="info-value">{selectedBooking.room?.name} ({selectedBooking.room?.type})</span>
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
    </div >
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