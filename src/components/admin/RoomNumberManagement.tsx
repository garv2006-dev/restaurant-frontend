import React, { useState, useEffect } from 'react';
import {
    Card,
    Table,
    Button,
    Modal,
    Form,
    Row,
    Col,
    Badge,
    Alert,
    Spinner
} from 'react-bootstrap';
import { Plus, Filter, RefreshCw, Home, User, Calendar, UserPlus } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import DataLoader from '../common/DataLoader';

interface RoomNumber {
    _id: string;
    roomNumber: string;
    roomType: {
        _id: string;
        name: string;
        type: string;
        price: {
            basePrice: number;
        };
    };
    floor: number;
    status: 'Available' | 'Allocated' | 'Occupied' | 'Maintenance' | 'Out of Service';
    dateWiseStatus?: 'Available' | 'Allocated' | 'Occupied' | 'Maintenance' | 'Out of Service';
    showCustomerDetails?: boolean;
    currentAllocation?: {
        booking?: string;
        customer?: {
            _id: string;
            name: string;
        };
        customerName?: string;
        checkInDate?: string;
        checkOutDate?: string;
        allocatedAt?: string;
    };
    notes?: string;
}

interface RoomType {
    _id: string;
    name: string;
    type: string;
}

const RoomNumberManagement: React.FC = () => {
    const [roomNumbers, setRoomNumbers] = useState<RoomNumber[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filters
    const [filters, setFilters] = useState(() => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Helper to format as YYYY-MM-DD in local time
        const formatDate = (date: Date) => {
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().split('T')[0];
        };

        return {
            roomType: '',
            status: '',
            floor: '',
            roomNumber: '',
            customerName: '',
            checkInDate: formatDate(today),
            checkOutDate: formatDate(tomorrow)
        };
    });

    // Bulk creation modal
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkForm, setBulkForm] = useState({
        roomTypeId: '',
        startNumber: '',
        endNumber: '',
        floor: '',
        prefix: ''
    });

    // Manual allocation modal
    const [showAllocationModal, setShowAllocationModal] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<RoomNumber | null>(null);
    const [pendingBookings, setPendingBookings] = useState<any[]>([]);
    const [selectedBooking, setSelectedBooking] = useState('');

    // View mode
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Initial load
    useEffect(() => {
        fetchRoomTypes();
    }, []);

    // Debounced filters to prevent excessive API calls
    const [debouncedFilters, setDebouncedFilters] = useState(filters);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilters(filters);
        }, 500); // 500ms delay

        return () => clearTimeout(timer);
    }, [filters]);



    // Socket listeners

    // Ideally fetchRoomNumbers should access the latest state. 
    // Since we're in a functional component, we might have closure staleness.
    // For now, keeping it simpler.

    const fetchRoomNumbers = React.useCallback(async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();

            // Use debouncedFilters for the API call
            Object.entries(debouncedFilters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const response = await api.get(`/room-numbers?${queryParams.toString()}`);
            setRoomNumbers(response.data.data);
            setError('');
        } catch (err: any) {
            console.error('Error fetching room numbers:', err);
            setError(err.response?.data?.message || 'Failed to fetch room numbers');
        } finally {
            setLoading(false);
        }
    }, [debouncedFilters]);

    useEffect(() => {
        const datesValid = debouncedFilters.checkInDate && debouncedFilters.checkOutDate;
        if (datesValid) {
            fetchRoomNumbers();
        }
    }, [debouncedFilters, fetchRoomNumbers]);

    // Socket listeners
    useEffect(() => {
        const socket = getSocket();

        const handleRefresh = () => {
            // Only refresh if current filters are valid
            fetchRoomNumbers();
        };

        socket.on('bookingStatusChange', handleRefresh);
        socket.on('newBooking', handleRefresh);
        socket.on('bookingUpdated', handleRefresh);

        return () => {
            socket.off('bookingStatusChange', handleRefresh);
            socket.off('newBooking', handleRefresh);
            socket.off('bookingUpdated', handleRefresh);
        };
    }, [fetchRoomNumbers]);

    const fetchRoomTypes = async () => {
        try {
            const response = await api.get('/rooms?limit=100');
            setRoomTypes(response.data.data);
        } catch (err) {
            console.error('Error fetching room types:', err);
        }
    };

    const handleBulkCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/room-numbers/bulk-create', bulkForm);
            setSuccess('Room numbers created successfully!');
            setShowBulkModal(false);
            setBulkForm({
                roomTypeId: '',
                startNumber: '',
                endNumber: '',
                floor: '',
                prefix: ''
            });
            fetchRoomNumbers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create room numbers');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (roomNumberId: string, newStatus: string) => {
        try {
            await api.put(`/room-numbers/${roomNumberId}/status`, { status: newStatus });
            setSuccess('Room status updated successfully!');
            fetchRoomNumbers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update room status');
        }
    };

    const fetchPendingBookings = async (roomTypeId: string) => {
        try {
            const response = await api.get('/admin/bookings', {
                params: { status: 'Pending,Confirmed', limit: 100 }
            });
            console.log('Bookings response:', response.data);
            if (response.data?.data?.bookings) {
                // Filter bookings that match the room type and don't have a room number
                const filtered = response.data.data.bookings.filter((booking: any) => {
                    const matches = (booking.room?._id === roomTypeId || booking.room === roomTypeId) && !booking.roomNumber;
                    console.log('Booking:', booking.bookingId, 'Room:', booking.room, 'Matches:', matches);
                    return matches;
                });
                console.log('Filtered bookings:', filtered);
                setPendingBookings(filtered);
            }
        } catch (err) {
            console.error('Error fetching pending bookings:', err);
        }
    };

    const handleAllocateClick = (room: RoomNumber) => {
        setSelectedRoom(room);
        setSelectedBooking('');
        fetchPendingBookings(room.roomType._id);
        setShowAllocationModal(true);
    };

    const handleAllocateRoom = async () => {
        if (!selectedRoom || !selectedBooking) {
            setError('Please select a booking');
            return;
        }

        try {
            setLoading(true);
            const booking = pendingBookings.find(b => b._id === selectedBooking);
            if (!booking) return;

            await api.post(`/room-numbers/${selectedRoom._id}/allocate`, {
                bookingId: booking._id,
                customerId: booking.user?._id || booking.user,
                customerName: booking.guestDetails?.primaryGuest?.name,
                checkInDate: booking.bookingDates?.checkInDate,
                checkOutDate: booking.bookingDates?.checkOutDate
            });

            setSuccess(`Room ${selectedRoom.roomNumber} allocated successfully!`);
            setShowAllocationModal(false);
            fetchRoomNumbers();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to allocate room');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: string; label: string }> = {
            Available: { variant: 'success', label: 'Available' },
            Allocated: { variant: 'warning', label: 'Allocated' },
            Occupied: { variant: 'danger', label: 'Occupied' },
            Maintenance: { variant: 'secondary', label: 'Maintenance' },
            'Out of Service': { variant: 'dark', label: 'Out of Service' }
        };

        const config = statusConfig[status] || { variant: 'secondary', label: status };
        return <Badge bg={config.variant}>{config.label}</Badge>;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            Available: '#28a745',
            Allocated: '#ffc107',
            Occupied: '#dc3545',
            Maintenance: '#6c757d',
            'Out of Service': '#343a40'
        };
        return colors[status] || '#6c757d';
    };

    const clearFilters = () => {
        setFilters({
            roomType: '',
            status: '',
            floor: '',
            roomNumber: '',
            customerName: '',
            checkInDate: '',
            checkOutDate: ''
        });
    };

    return (
        <div className="room-number-management">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Room Number Management</h2>
                    <p className="text-muted mb-0">Manage individual room instances and allocations</p>
                </div>
                <div className="d-flex gap-2">
                    <Button
                        variant="outline-secondary"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                    >
                        {viewMode === 'grid' ? 'Table View' : 'Grid View'}
                    </Button>
                    <Button variant="primary" onClick={() => setShowBulkModal(true)}>
                        <Plus size={16} className="me-2" />
                        Bulk Create Rooms
                    </Button>
                    <Button variant="outline-primary" onClick={fetchRoomNumbers}>
                        <RefreshCw size={16} />
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

            {/* Filters */}
            <Card className="mb-4">
                <Card.Body>
                    <h5 className="mb-3">
                        <Filter size={18} className="me-2" />
                        Filters
                    </h5>
                    <Row>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Room Type</Form.Label>
                                <Form.Select
                                    value={filters.roomType}
                                    onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
                                >
                                    <option value="">All Types</option>
                                    {roomTypes.map((type) => (
                                        <option key={type._id} value={type._id}>
                                            {type.name} ({type.type})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Available">Available</option>
                                    <option value="Allocated">Allocated</option>
                                    <option value="Occupied">Occupied</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Out of Service">Out of Service</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label>Room Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Search..."
                                    value={filters.roomNumber}
                                    onChange={(e) => {
                                        // Numeric only validation
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFilters({ ...filters, roomNumber: value });
                                    }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label>Customer Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Search..."
                                    value={filters.customerName}
                                    onChange={(e) => {
                                        // Alphabet only validation (no numbers/symbols)
                                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                        setFilters({ ...filters, customerName: value });
                                    }}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Check-In Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]} // Prevent past dates
                                    value={filters.checkInDate}
                                    onChange={(e) => {
                                        const newDate = e.target.value;
                                        setFilters(prev => ({
                                            ...prev,
                                            checkInDate: newDate,
                                            // Reset check-out if it becomes invalid (less than new check-in)
                                            checkOutDate: (prev.checkOutDate && prev.checkOutDate < newDate) ? '' : prev.checkOutDate
                                        }));
                                    }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Check-Out Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={filters.checkOutDate}
                                    min={filters.checkInDate}
                                    disabled={!filters.checkInDate}
                                    onChange={(e) => setFilters({ ...filters, checkOutDate: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6} className="d-flex align-items-end">
                            <Button variant="outline-secondary" onClick={clearFilters} className="mb-3">
                                Clear Filters
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Room Numbers Display */}
            {loading ? (
                <DataLoader />
            ) : viewMode === 'grid' ? (
                <Row>
                    {roomNumbers.map((room) => {
                        // Use dateWiseStatus if dates are filtered, otherwise use regular status
                        const displayStatus = room.dateWiseStatus || room.status;
                        return (
                            <Col key={room._id} md={3} className="mb-3">
                                <Card
                                    className="room-number-card h-100"
                                    style={{
                                        borderLeft: `4px solid ${getStatusColor(displayStatus)}`,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h4 className="mb-0">{room.roomNumber}</h4>
                                            <div className="d-flex align-items-center gap-2">
                                                {getStatusBadge(displayStatus)}
                                                {displayStatus === 'Available' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={() => handleAllocateClick(room)}
                                                        title="Allocate to Booking"
                                                        style={{ padding: '2px 6px' }}
                                                    >
                                                        <UserPlus size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-muted small mb-2">
                                            <div><Home size={14} className="me-1" />{room.roomType?.name || 'N/A'}</div>
                                            <div>Floor {room.floor}</div>
                                        </div>
                                        {room.currentAllocation && room.currentAllocation.customerName && (
                                            <div className="mt-2 pt-2 border-top">
                                                <div className="small">
                                                    <User size={14} className="me-1" />
                                                    <strong>{room.currentAllocation.customerName}</strong>
                                                </div>
                                                {room.currentAllocation.checkInDate && (
                                                    <div className="small text-muted">
                                                        <Calendar size={12} className="me-1" />
                                                        {new Date(room.currentAllocation.checkInDate).toLocaleDateString()} -
                                                        {room.currentAllocation.checkOutDate && new Date(room.currentAllocation.checkOutDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {(displayStatus === 'Available' || displayStatus === 'Maintenance' || displayStatus === 'Out of Service') && (
                                            <div className="mt-2">
                                                <Form.Select
                                                    size="sm"
                                                    onChange={(e) => handleStatusChange(room._id, e.target.value)}
                                                    defaultValue=""
                                                >
                                                    <option value="">Change Status...</option>
                                                    <option value="Available">Available</option>
                                                    <option value="Maintenance">Maintenance</option>
                                                    <option value="Out of Service">Out of Service</option>
                                                </Form.Select>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                    {roomNumbers.length === 0 && (
                        <Col>
                            <Alert variant="info">No room numbers found. Create some using the "Bulk Create Rooms" button.</Alert>
                        </Col>
                    )}
                </Row>
            ) : (
                <Card>
                    <Card.Body>
                        <Table responsive hover>
                            <thead>
                                <tr>
                                    <th>Room Number</th>
                                    <th>Room Type</th>
                                    <th>Floor</th>
                                    <th>Status</th>
                                    <th>Customer</th>
                                    <th>Check-In</th>
                                    <th>Check-Out</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roomNumbers.map((room) => {
                                    // Use dateWiseStatus if dates are filtered, otherwise use regular status
                                    const displayStatus = room.dateWiseStatus || room.status;
                                    return (
                                        <tr key={room._id}>
                                            <td><strong>{room.roomNumber}</strong></td>
                                            <td>{room.roomType?.name || 'N/A'}</td>
                                            <td>{room.floor}</td>
                                            <td>{getStatusBadge(displayStatus)}</td>
                                            <td>{room.currentAllocation?.customerName || '-'}</td>
                                            <td>
                                                {room.currentAllocation?.checkInDate
                                                    ? new Date(room.currentAllocation.checkInDate).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                            <td>
                                                {room.currentAllocation?.checkOutDate
                                                    ? new Date(room.currentAllocation.checkOutDate).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                            <td>
                                                {(displayStatus === 'Available' || displayStatus === 'Maintenance' || displayStatus === 'Out of Service') && (
                                                    <Form.Select
                                                        size="sm"
                                                        onChange={(e) => handleStatusChange(room._id, e.target.value)}
                                                        defaultValue=""
                                                    >
                                                        <option value="">Change Status...</option>
                                                        <option value="Available">Available</option>
                                                        <option value="Maintenance">Maintenance</option>
                                                        <option value="Out of Service">Out of Service</option>
                                                    </Form.Select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {roomNumbers.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center">
                                            No room numbers found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Bulk Create Modal */}
            <Modal show={showBulkModal} onHide={() => setShowBulkModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Bulk Create Room Numbers</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleBulkCreate}>
                    <Modal.Body>
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Room Type *</Form.Label>
                                    <Form.Select
                                        required
                                        value={bulkForm.roomTypeId}
                                        onChange={(e) => setBulkForm({ ...bulkForm, roomTypeId: e.target.value })}
                                    >
                                        <option value="">Select Room Type</option>
                                        {roomTypes.map((type) => (
                                            <option key={type._id} value={type._id}>
                                                {type.name} ({type.type})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Start Number *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        required
                                        placeholder="e.g., 101"
                                        value={bulkForm.startNumber}
                                        onChange={(e) => setBulkForm({ ...bulkForm, startNumber: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>End Number *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        required
                                        placeholder="e.g., 110"
                                        value={bulkForm.endNumber}
                                        onChange={(e) => setBulkForm({ ...bulkForm, endNumber: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Floor *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        required
                                        placeholder="e.g., 1"
                                        value={bulkForm.floor}
                                        onChange={(e) => setBulkForm({ ...bulkForm, floor: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Prefix (Optional)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="e.g., A, B"
                                        value={bulkForm.prefix}
                                        onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value })}
                                    />
                                    <Form.Text className="text-muted">
                                        Will create: {bulkForm.prefix}{bulkForm.startNumber} to {bulkForm.prefix}{bulkForm.endNumber}
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowBulkModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? <Spinner animation="border" size="sm" /> : 'Create Room Numbers'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Manual Allocation Modal */}
            <Modal show={showAllocationModal} onHide={() => setShowAllocationModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Allocate Room {selectedRoom?.roomNumber}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Select Booking</Form.Label>
                        <Form.Select
                            value={selectedBooking}
                            onChange={(e) => setSelectedBooking(e.target.value)}
                        >
                            <option value="">Choose a booking...</option>
                            {pendingBookings.map((booking) => (
                                <option key={booking._id} value={booking._id}>
                                    {booking.guestDetails?.primaryGuest?.name} -
                                    {' '}{new Date(booking.bookingDates?.checkInDate).toLocaleDateString()} to{' '}
                                    {new Date(booking.bookingDates?.checkOutDate).toLocaleDateString()}
                                    {' '}(₹{booking.pricing?.totalAmount})
                                </option>
                            ))}
                        </Form.Select>
                        {pendingBookings.length === 0 && (
                            <Form.Text className="text-muted">
                                No pending bookings found for this room type
                            </Form.Text>
                        )}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAllocationModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAllocateRoom}
                        disabled={!selectedBooking || loading}
                    >
                        {loading ? <Spinner animation="border" size="sm" /> : 'Allocate Room'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default RoomNumberManagement;
