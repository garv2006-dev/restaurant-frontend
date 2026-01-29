import React, { useState, useEffect } from 'react';
import {
    Button,
    Modal,
    Form,
    Row,
    Col,
    Badge,
    Alert,
    Spinner
} from 'react-bootstrap';
import { Plus, Filter, RefreshCw, Home, User, Calendar, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import DataLoader from '../common/DataLoader';
import { toast } from 'react-toastify';

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
    totalRooms: number;
    totalRoomNumbers: number;
}

const RoomNumberManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Custom styles for the dropdown to ensure it stays clean
    const dropdownStyles = `
        .admin-form-select-sm:focus {
            border-color: #dee2e6 !important;
            box-shadow: none !important;
            background-color: white !important;
            outline: none !important;
        }
        .admin-form-select-sm:hover {
            border-color: #ced4da !important;
            background-color: white !important;
        }
    `;

    // Filters
    const [filters, setFilters] = useState(() => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

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

    const [debouncedFilters, setDebouncedFilters] = useState(filters);

    // Debounce effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilters(filters);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    // Data Fetching
    const { data: roomTypes = [] } = useQuery({
        queryKey: ['roomTypes'],
        queryFn: async () => {
            const response = await api.get('/rooms?limit=100');
            return response.data.data;
        }
    });

    const {
        data: roomNumbers = [],
        isLoading,
        isError,
        error: queryError
    } = useQuery({
        queryKey: ['roomNumbers', debouncedFilters],
        queryFn: async () => {
            const queryParams = new URLSearchParams();
            Object.entries(debouncedFilters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });
            const response = await api.get(`/room-numbers?${queryParams.toString()}`);
            return response.data.data;
        },
        enabled: !!(debouncedFilters.checkInDate && debouncedFilters.checkOutDate)
    });

    // Socket listeners
    useEffect(() => {
        const socket = getSocket();
        const handleRefresh = () => {
            queryClient.invalidateQueries({ queryKey: ['roomNumbers'] });
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] }); // Refresh counts
        };

        socket.on('booking-status-change', handleRefresh);
        socket.on('new-booking', handleRefresh);
        socket.on('booking-update', handleRefresh);

        return () => {
            socket.off('booking-status-change', handleRefresh);
            socket.off('new-booking', handleRefresh);
            socket.off('booking-update', handleRefresh);
        };
    }, [queryClient]);

    // Mutations
    const bulkCreateMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.post('/room-numbers/bulk-create', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roomNumbers'] });
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
            setSuccess('Room numbers created successfully!');
            setShowBulkModal(false);
            setBulkForm({
                roomTypeId: '',
                startNumber: '',
                endNumber: '',
                floor: '',
                prefix: ''
            });
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to create room numbers');
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            return api.put(`/room-numbers/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roomNumbers'] });
            toast.success('Room status updated successfully!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update room status');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/room-numbers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roomNumbers'] });
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
            toast.success('Room number deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete room number');
        }
    });

    const [bulkForm, setBulkForm] = useState({
        roomTypeId: '',
        startNumber: '',
        endNumber: '',
        floor: '',
        prefix: ''
    });

    const handleBulkCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (bulkForm.startNumber && bulkForm.endNumber) {
            const start = parseInt(bulkForm.startNumber);
            const end = parseInt(bulkForm.endNumber);

            if (end < start) {
                setError('End number must be greater than or equal to start number');
                return;
            }

            const count = end - start + 1;
            const roomType = roomTypes.find((r: RoomType) => r._id === bulkForm.roomTypeId);

            if (roomType) {
                const currentCount = roomType.totalRoomNumbers || 0;
                const limit = roomType.totalRooms || 0;

                if (currentCount + count > limit) {
                    setError(`Cannot add ${count} rooms. Room Type "${roomType.name}" allows ${limit} rooms in total, and already has ${currentCount}. You can only add ${limit - currentCount} more.`);
                    return;
                }
            }
        }

        bulkCreateMutation.mutate(bulkForm);
    };

    const handleStatusChange = (id: string, status: string) => {
        updateStatusMutation.mutate({ id, status });
    };

    const handleDeleteRoomNumber = (id: string, roomNum: string) => {
        if (!window.confirm(`Are you sure you want to delete Room ${roomNum}?`)) return;
        deleteMutation.mutate(id);
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

    if (isError) {
        return (
            <div className="admin-card p-5 text-center">
                <Alert variant="danger">
                    {(queryError as any)?.message || 'Failed to fetch room numbers'}
                </Alert>
                <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['roomNumbers'] })}>Retry</Button>
            </div>
        )
    }

    return (
        <div className="room-number-management">
            <style>{dropdownStyles}</style>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
                <div>
                    <h2 className="h4 fw-bold text-dark mb-1">Room Number Management</h2>
                    <p className="text-muted mb-0">Manage individual room instances and allocations</p>
                </div>
                <div className="d-flex gap-2">
                    <button
                        className="admin-btn admin-btn-outline"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                    >
                        {viewMode === 'grid' ? 'Table View' : 'Grid View'}
                    </button>
                    <button className="admin-btn admin-btn-primary" onClick={() => setShowBulkModal(true)}>
                        <Plus size={16} className="me-2" />
                        Bulk Create Rooms
                    </button>
                    <button
                        className="admin-btn admin-btn-outline"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['roomNumbers'] })}
                        disabled={isLoading}
                    >
                        <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

            {/* Filters */}
            <div className="admin-card mb-4">
                <div className="admin-card-header">
                    <h5 className="admin-card-title mb-0">
                        <Filter size={18} className="me-2" />
                        Filters
                    </h5>
                </div>
                <div className="admin-card-body">
                    <Row>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-semibold text-muted">Room Type</Form.Label>
                                <Form.Select
                                    value={filters.roomType}
                                    onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
                                    className="admin-form-control"
                                >
                                    <option value="">All Types</option>
                                    {roomTypes.map((type: RoomType) => (
                                        <option key={type._id} value={type._id}>
                                            {type.name} ({type.type})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-semibold text-muted">Status</Form.Label>
                                <Form.Select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="admin-form-control"
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
                                <Form.Label className="small fw-semibold text-muted">Room Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Search..."
                                    value={filters.roomNumber}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFilters({ ...filters, roomNumber: value });
                                    }}
                                    className="admin-form-control"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-semibold text-muted">Customer Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Search..."
                                    value={filters.customerName}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                        setFilters({ ...filters, customerName: value });
                                    }}
                                    className="admin-form-control"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end">
                            <button className="admin-btn admin-btn-outline w-100 mb-3" onClick={clearFilters}>
                                Clear
                            </button>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-semibold text-muted">Check-In Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={filters.checkInDate}
                                    onChange={(e) => {
                                        const newDate = e.target.value;
                                        setFilters(prev => ({
                                            ...prev,
                                            checkInDate: newDate,
                                            checkOutDate: (prev.checkOutDate && prev.checkOutDate < newDate) ? '' : prev.checkOutDate
                                        }));
                                    }}
                                    className="admin-form-control"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-semibold text-muted">Check-Out Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={filters.checkOutDate}
                                    min={filters.checkInDate}
                                    disabled={!filters.checkInDate}
                                    onChange={(e) => setFilters({ ...filters, checkOutDate: e.target.value })}
                                    className="admin-form-control"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </div>
            </div>

            {/* Room Numbers Display */}
            {isLoading ? (
                viewMode === 'grid' ? (
                    <div className="row g-3">
                        <DataLoader type="card" count={8} className="col-xl-3 col-lg-4 col-md-6" />
                    </div>
                ) : (
                    <div className="admin-card">
                        <div className="admin-card-body p-0">
                            <div className="table-responsive">
                                <table className="admin-table table-hover mb-0">
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
                                        <DataLoader type="table" count={5} columns={8} />
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            ) : viewMode === 'grid' ? (
                <div className="row g-3">
                    {roomNumbers.map((room: RoomNumber) => {
                        const displayStatus = room.dateWiseStatus || room.status;
                        return (
                            <div key={room._id} className="col-xl-3 col-lg-4 col-md-6 mb-3">
                                <div
                                    className="admin-card h-100 position-relative transition-hover"
                                    style={{
                                        borderLeft: `4px solid ${getStatusColor(displayStatus)}`,
                                        cursor: 'pointer'
                                    }}
                                >

                                    <div className="admin-card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <h4 className="mb-0 fw-bold">{room.roomNumber}</h4>
                                            <div className="d-flex align-items-center gap-2">
                                                {getStatusBadge(displayStatus)}

                                            </div>
                                        </div>
                                        <div className="text-muted small mb-2">
                                            <div><Home size={14} className="me-1" />{room.roomType?.name || 'N/A'}</div>
                                            <div>Floor {room.floor}</div>
                                        </div>
                                        {room.currentAllocation && room.currentAllocation.customerName && (
                                            <div className="mt-3 pt-3 border-top border-light">
                                                <div className="d-flex align-items-center mb-1">
                                                    <div className="bg-light rounded-circle p-1 me-2 text-primary">
                                                        <User size={12} />
                                                    </div>
                                                    <span className="fw-medium small text-dark">{room.currentAllocation.customerName}</span>
                                                </div>
                                                {room.currentAllocation.checkInDate && (
                                                    <div className="small text-muted ps-1">
                                                        <Calendar size={12} className="me-1" />
                                                        {new Date(room.currentAllocation.checkInDate).toLocaleDateString()} -
                                                        {room.currentAllocation.checkOutDate && new Date(room.currentAllocation.checkOutDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {(displayStatus === 'Available' || displayStatus === 'Maintenance' || displayStatus === 'Out of Service') && (
                                            <div className="mt-3">
                                                <Form.Select
                                                    size="sm"
                                                    value=""
                                                    onChange={(e) => handleStatusChange(room._id, e.target.value)}
                                                    className="admin-form-select-sm shadow-none border-secondary"
                                                    style={{ fontSize: '0.85rem' }}
                                                    disabled={updateStatusMutation.isPending}
                                                >
                                                    <option value="" disabled hidden>Change Status...</option>
                                                    <option value="Available">Available</option>
                                                    <option value="Maintenance">Maintenance</option>
                                                    <option value="Out of Service">Out of Service</option>
                                                </Form.Select>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {roomNumbers.length === 0 && (
                        <div className="col-12">
                            <div className="admin-card p-5 text-center">
                                <div className="text-muted mb-3">No room numbers found based on your filters.</div>
                                <button className="admin-btn admin-btn-primary" onClick={() => setShowBulkModal(true)}>
                                    <Plus size={16} className="me-1" /> Bulk Create Rooms
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="admin-card">
                    <div className="admin-card-body p-0">
                        <div className="table-responsive">
                            <table className="admin-table table-hover mb-0">
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
                                    {roomNumbers.map((room: RoomNumber) => {
                                        const displayStatus = room.dateWiseStatus || room.status;
                                        return (
                                            <tr key={room._id}>
                                                <td><span className="fw-bold text-dark">{room.roomNumber}</span></td>
                                                <td><span className="badge bg-light text-dark border fw-normal">{room.roomType?.name || 'N/A'}</span></td>
                                                <td>{room.floor}</td>
                                                <td>{getStatusBadge(displayStatus)}</td>
                                                <td>{room.currentAllocation?.customerName ? (
                                                    <div className="d-flex align-items-center">
                                                        <User size={14} className="me-1 text-muted" />
                                                        {room.currentAllocation.customerName}
                                                    </div>
                                                ) : '-'}</td>
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
                                                    <div className="d-flex align-items-center gap-2">
                                                        {(displayStatus === 'Available' || displayStatus === 'Maintenance' || displayStatus === 'Out of Service') && (
                                                            <div style={{ width: '150px' }}>
                                                                <Form.Select
                                                                    size="sm"
                                                                    value=""
                                                                    onChange={(e) => handleStatusChange(room._id, e.target.value)}
                                                                    className="admin-form-select-sm shadow-none border-secondary text-muted"
                                                                    style={{ fontSize: '0.85rem' }}
                                                                    disabled={updateStatusMutation.isPending}
                                                                >
                                                                    <option value="" disabled hidden>Status...</option>
                                                                    <option value="Available">Available</option>
                                                                    <option value="Maintenance">Maintenance</option>
                                                                    <option value="Out of Service">Out of Service</option>
                                                                </Form.Select>
                                                            </div>
                                                        )}
                                                        {displayStatus !== 'Allocated' && displayStatus !== 'Occupied' && (
                                                            <button
                                                                className="admin-action-btn delete"
                                                                onClick={() => handleDeleteRoomNumber(room._id, room.roomNumber)}
                                                                title="Delete Room"
                                                                disabled={deleteMutation.isPending}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {roomNumbers.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="text-center py-5 text-muted">
                                                No room numbers found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
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
                                        {roomTypes.map((type: RoomType) => (
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
                        <Button variant="primary" type="submit" disabled={bulkCreateMutation.isPending}>
                            {bulkCreateMutation.isPending ? <Spinner animation="border" size="sm" /> : 'Create Room Numbers'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default RoomNumberManagement;
