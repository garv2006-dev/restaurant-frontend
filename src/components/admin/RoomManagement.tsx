import React, { useState } from 'react';
import {
  Button,
  Modal,
  Form,
  Row,
  Col,
  Badge,
  Alert,
  Spinner,
  Dropdown,
  ButtonGroup
} from 'react-bootstrap';
import { Plus, Edit2, Trash2, RefreshCw, ExternalLink, Upload } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import ImageUploadModal from './ImageUploadModal';
import DataLoader from '../common/DataLoader';

interface Room {
  _id: string;
  name: string;
  type: 'Standard' | 'Deluxe' | 'Suite';
  description: string;
  capacity: {
    adults: number;
    children: number;
  };
  bedType: 'Single' | 'Double' | 'Queen' | 'King' | 'Twin';
  area: number;
  price: {
    basePrice: number;
  };
  features: {
    airConditioning: boolean;
    wifi: boolean;
    television: boolean;
    breakfast: boolean;
    parkingIncluded: boolean;
  };
  images?: Array<{
    url: string;
    altText?: string;
    isPrimary: boolean;
  }>;
  status: 'Available' | 'Occupied' | 'Maintenance' | 'Out of Order';
  floor: number;
  totalRooms: number;
  totalRoomNumbers?: number;
  availableCount?: number;
  isActive: boolean;
}

const RoomManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [roomForImageUpload, setRoomForImageUpload] = useState<Room | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    type: 'Standard' | 'Deluxe' | 'Suite';
    description: string;
    capacity: { adults: number; children: number };
    price: { basePrice: number };
    features: {
      airConditioning: boolean;
      wifi: boolean;
      television: boolean;
      breakfast: boolean;
      parkingIncluded: boolean;
    };
    status: 'Available' | 'Occupied' | 'Maintenance' | 'Out of Order';
    isActive: boolean;
    bedType: 'Single' | 'Double' | 'Queen' | 'King' | 'Twin';
    area: number;
    floor: number;
    totalRooms: number;
  }>({
    name: '',
    type: 'Standard',
    description: '',
    capacity: { adults: 2, children: 1 },
    price: { basePrice: 0 },
    features: {
      airConditioning: true,
      wifi: true,
      television: true,
      breakfast: false,
      parkingIncluded: false,
    },
    status: 'Available',
    isActive: true,
    bedType: 'Double',
    area: 200,
    floor: 1,
    totalRooms: 1,
  });

  // Fetch Rooms Query
  const { data: rooms = [], isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await api.get('/rooms');
      // Handle different response structures
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.rooms)) return response.data.rooms;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    }
  });

  // Create/Update Room Mutation
  const saveRoomMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingRoom) {
        return api.put(`/rooms/${editingRoom._id}`, data);
      } else {
        return api.post('/rooms', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSuccess(editingRoom ? 'Room updated successfully!' : 'Room added successfully!');
      handleCloseModal();
      setSelectedImages([]);
      setImagePreview([]);
    },
    onError: (err: any) => {
      console.error('Error saving room:', err);
      let errorMessage = 'Failed to save room';
      if (err.response) {
        if (err.response.status === 400) errorMessage = 'Invalid data. Please check your inputs.';
        else if (err.response.status === 413) errorMessage = 'File size is too large. Maximum size is 5MB per image.';
        else if (err.response.data?.message) errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    }
  });

  // Delete Room Mutation
  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      await api.delete(`/rooms/${roomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSuccess('Room deleted successfully!');
      setSelectedRooms(prev => prev.filter(id => !deleteRoomMutation.variables));
    },
    onError: (err: any) => {
      console.error('Error deleting room:', err);
      let errorMessage = 'Failed to delete room';
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Cannot delete this room. It may have active bookings.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    }
  });

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (roomIds: string[]) => {
      const results = await Promise.allSettled(
        roomIds.map(roomId => api.delete(`/rooms/${roomId}`))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        const failureReasons = results
          .map((r, i) => r.status === 'rejected' ? r.reason?.response?.data?.message : null)
          .filter(Boolean);
        throw new Error(`Successfully deleted ${successful} room(s). Failed to delete ${failed} room(s): ${failureReasons.join(', ')}`);
      }
      return successful;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSuccess(`${count} rooms deleted successfully!`);
      setSelectedRooms([]);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to delete some rooms');
    }
  });

  // Bulk Status Change Mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[], status: Room['status'] }) => {
      await Promise.all(ids.map(roomId => api.put(`/rooms/${roomId}`, { status })));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSuccess(`${variables.ids.length} rooms status updated to ${variables.status}!`);
      setSelectedRooms([]);
    },
    onError: () => {
      setError('Failed to update some rooms status');
    }
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRoom(null);
    setSelectedImages([]);
    setImagePreview([]);
    setError('');
    setSuccess('');
  };

  const handleOpenImageUploadModal = (room: Room) => {
    setRoomForImageUpload(room);
    setShowImageUploadModal(true);
  };

  const handleCloseImageUploadModal = () => {
    setShowImageUploadModal(false);
    setRoomForImageUpload(null);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      type: room.type,
      description: room.description,
      capacity: room.capacity,
      price: room.price,
      features: room.features,
      status: room.status,
      isActive: room.isActive,
      bedType: room.bedType,
      area: room.area,
      floor: room.floor,
      totalRooms: room.totalRooms || 1,
    });
    setSelectedImages([]);
    setImagePreview([]);
    setShowModal(true);
  };

  const handleAddRoom = () => {
    setError('');
    setSuccess('');
    setEditingRoom(null);
    setFormData({
      name: '',
      type: 'Standard',
      description: '',
      capacity: { adults: 2, children: 1 },
      price: { basePrice: 0 },
      features: {
        airConditioning: true,
        wifi: true,
        television: true,
        breakfast: false,
        parkingIncluded: false,
      },
      status: 'Available',
      isActive: true,
      bedType: 'Double',
      area: 200,
      floor: 1,
      totalRooms: 1,
    });
    setSelectedImages([]);
    setImagePreview([]);
    setShowModal(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      setError('You can upload a maximum of 5 images');
      return;
    }
    setSelectedImages(files);
    setImagePreview(files.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreview((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    const requiredFields = ['name', 'type', 'description', 'bedType'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    if (editingRoom) {
      saveRoomMutation.mutate({ ...formData });
    } else {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('bedType', formData.bedType);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('isActive', String(formData.isActive));
      formDataToSend.append('area', String(formData.area));
      formDataToSend.append('floor', String(formData.floor));
      formDataToSend.append('totalRooms', String(formData.totalRooms));
      formDataToSend.append('capacity', JSON.stringify(formData.capacity));
      formDataToSend.append('price', JSON.stringify(formData.price));
      formDataToSend.append('features', JSON.stringify(formData.features));
      selectedImages.forEach((file) => formDataToSend.append('images', file));

      saveRoomMutation.mutate(formDataToSend);
    }
  };

  const handleSelectRoom = (roomId: string, checked: boolean) => {
    if (checked) {
      setSelectedRooms([...selectedRooms, roomId]);
    } else {
      setSelectedRooms(selectedRooms.filter(id => id !== roomId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRooms(rooms.map((room: Room) => room._id));
    } else {
      setSelectedRooms([]);
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    deleteRoomMutation.mutate(roomId);
  };

  const handleBulkDelete = () => {
    if (selectedRooms.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRooms.length} selected rooms?`)) return;
    bulkDeleteMutation.mutate(selectedRooms);
  };

  const handleBulkStatusChange = (status: Room['status']) => {
    if (selectedRooms.length === 0) return;
    bulkStatusMutation.mutate({ ids: selectedRooms, status });
  };

  const getStatusBadge = (status: Room['status']) => {
    const variants: Record<Room['status'], string> = {
      Available: 'success',
      Occupied: 'warning',
      Maintenance: 'info',
      'Out of Order': 'danger',
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (isError) {
    // Show error state if initial load fails
    return (
      <div className="admin-card text-center p-5">
        <h4 className="text-danger">Failed to load rooms</h4>
        <p className="text-muted">{(queryError as any)?.message || 'Unknown error occured'}</p>
        <Button variant="primary" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <h5 className="admin-card-title mb-0">Room Management</h5>
        <div className="d-flex flex-wrap gap-2 justify-content-end">
          {selectedRooms.length > 0 && (
            <div className="d-flex gap-2 align-items-center bg-light p-1 rounded border">
              <span className="text-muted small fw-medium px-2">{selectedRooms.length} selected</span>
              <button className="admin-btn admin-btn-sm admin-btn-danger" onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending}>
                <Trash2 size={14} className="me-1" />
                Delete
              </button>
              <Dropdown as={ButtonGroup}>
                <Dropdown.Toggle as="button" className="admin-btn admin-btn-sm admin-btn-outline dropdown-toggle" id="dropdown-status" disabled={bulkStatusMutation.isPending}>
                  Change Status
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow-sm border-0">
                  <Dropdown.Item onClick={() => handleBulkStatusChange('Available')}>
                    <Badge bg="success" className="me-2">●</Badge> Available
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkStatusChange('Occupied')}>
                    <Badge bg="warning" className="me-2">●</Badge> Occupied
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkStatusChange('Maintenance')}>
                    <Badge bg="info" className="me-2">●</Badge> Maintenance
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkStatusChange('Out of Order')}>
                    <Badge bg="danger" className="me-2">●</Badge> Out of Order
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          )}

          <button className="admin-btn admin-btn-outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={16} className={`me-1 ${isLoading ? 'spin' : ''}`} />
            Refresh
          </button>

          <button
            className="admin-btn admin-btn-primary position-relative"
            onClick={handleAddRoom}
            type="button"
            disabled={showModal || saveRoomMutation.isPending}
          >
            <Plus size={16} className="me-1" />
            Add Room
            {showModal && (
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                <span className="visually-hidden">New alerts</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="admin-card-body p-0">
        {error && (
          <div className="m-4">
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        {success && (
          <div className="m-4">
            <Alert variant="success" dismissible onClose={() => setSuccess('')}>
              {success}
              {success.includes('added successfully') && (
                <div className="mt-2 d-flex gap-2">
                  <a href="/" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success d-flex align-items-center">
                    <ExternalLink size={14} className="me-1" /> View Home
                  </a>
                  <a href="/rooms" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-success d-flex align-items-center">
                    <ExternalLink size={14} className="me-1" /> View Rooms
                  </a>
                </div>
              )}
            </Alert>
          </div>
        )}

        {isLoading ? (
          <div className="p-5">
            <DataLoader type="table" count={5} columns={7} />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={selectedRooms.length === rooms.length && rooms.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th style={{ width: '30%' }}>Room Name</th>
                  <th style={{ width: '12%' }}>Type</th>
                  <th style={{ width: '15%' }}>Capacity</th>
                  <th style={{ width: '12%' }}>Price</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th className="text-end" style={{ width: '14%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <div className="text-muted mb-3">No rooms found in the system.</div>
                      <button className="admin-btn admin-btn-primary" onClick={handleAddRoom}>
                        <Plus size={16} className="me-1" /> Add Your First Room
                      </button>
                    </td>
                  </tr>
                ) : (
                  rooms.map((room: Room) => (
                    <tr key={room._id}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selectedRooms.includes(room._id)}
                          onChange={(e) => handleSelectRoom(room._id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{room.name}</div>
                        <div className="small text-muted text-truncate" style={{ maxWidth: '350px' }}>{room.description}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border fw-normal">{room.type}</span>
                      </td>
                      <td>
                        <div className="small text-dark">
                          <span className="fw-medium">{room.capacity.adults}</span> Adults
                          {room.capacity.children > 0 && <span>, <span className="fw-medium">{room.capacity.children}</span> Kids</span>}
                        </div>
                      </td>
                      <td>
                        <span className="fw-bold text-dark">₹{room.price.basePrice}</span>
                      </td>
                      <td>{getStatusBadge(room.status)}</td>
                      <td className="text-end">
                        <div className="admin-action-buttons justify-content-end">
                          <button
                            className="admin-action-btn edit"
                            onClick={() => handleEditRoom(room)}
                            title="Edit Room"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="admin-action-btn upload"
                            onClick={() => handleOpenImageUploadModal(room)}
                            title="Manage Images"
                          >
                            <Upload size={16} />
                          </button>
                          <button
                            className="admin-action-btn delete"
                            onClick={() => handleDeleteRoom(room._id)}
                            disabled={deleteRoomMutation.isPending && deleteRoomMutation.variables === room._id}
                            title="Delete Room"
                          >
                            {deleteRoomMutation.isPending && deleteRoomMutation.variables === room._id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Room Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingRoom ? 'Edit Room' : 'Add New Room'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Room Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="E.g., Deluxe Suite"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Room Type *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    required
                  >
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bed Type *</Form.Label>
                  <Form.Select
                    value={formData.bedType}
                    onChange={(e) => setFormData({ ...formData, bedType: e.target.value as any })}
                    required
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Queen">Queen</option>
                    <option value="King">King</option>
                    <option value="Twin">Twin</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Base Price (₹) *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price.basePrice}
                    onChange={(e) => setFormData({
                      ...formData,
                      price: { ...formData.price, basePrice: parseFloat(e.target.value) || 0 }
                    })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Floor *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Area (sq.ft) *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Total Rooms *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.totalRooms}
                    onChange={(e) => setFormData({ ...formData, totalRooms: parseInt(e.target.value) || 1 })}
                    required
                  />
                  <Form.Text className="text-muted">
                    Number of room instances for this room type (create actual room numbers in Room Numbers page)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Adults *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.capacity.adults}
                    onChange={(e) => setFormData({
                      ...formData,
                      capacity: { ...formData.capacity, adults: parseInt(e.target.value) || 1 }
                    })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Children</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.capacity.children}
                    onChange={(e) => setFormData({
                      ...formData,
                      capacity: { ...formData.capacity, children: parseInt(e.target.value) || 0 }
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="Describe the room's features and amenities..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Room Features</Form.Label>
              <div className="d-flex flex-wrap gap-3">
                {Object.entries(formData.features).map(([key, value]) => (
                  <Form.Check
                    key={key}
                    type="checkbox"
                    id={`feature-${key}`}
                    label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    checked={value as boolean}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: { ...formData.features, [key]: e.target.checked }
                    })}
                  />
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Images (Max 5)</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                disabled={selectedImages.length >= 5}
              />
              <Form.Text className="text-muted">
                First image will be the primary image. Each image must be less than 5MB.
              </Form.Text>
            </Form.Group>

            {imagePreview.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {imagePreview.map((src, index) => (
                  <div key={index} className="position-relative">
                    <img
                      src={src}
                      alt={`Preview ${index}`}
                      className="img-thumbnail"
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm position-absolute top-0 start-100 translate-middle rounded-circle p-0 d-flex align-items-center justify-content-center"
                      style={{ width: '20px', height: '20px' }}
                      onClick={() => removeImage(index)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={saveRoomMutation.isPending}>
              {saveRoomMutation.isPending ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Save Room'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Image Upload Modal - Separate component */}
      {roomForImageUpload && (
        <ImageUploadModal
          show={showImageUploadModal}
          onHide={handleCloseImageUploadModal}
          type="room"
          itemId={roomForImageUpload._id}
          itemName={roomForImageUpload.name}
          onUploadSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            handleCloseImageUploadModal();
            setSuccess('Images updated successfully!');
          }}
        />
      )}
    </div>
  );
};

export default RoomManagement;