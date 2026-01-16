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
  Spinner,
  Dropdown,
  ButtonGroup
} from 'react-bootstrap';
import { Plus, Edit2, Trash2, RefreshCw, ExternalLink, Upload } from 'lucide-react';
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
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

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');
      // Use the correct endpoint relative to baseURL (which already includes /api)
      const response = await api.get('/rooms');

      // Handle different response structures
      let roomsData = [];
      if (Array.isArray(response.data)) {
        roomsData = response.data;
      } else if (response.data && Array.isArray(response.data.rooms)) {
        roomsData = response.data.rooms;
      } else if (response.data && Array.isArray(response.data.data)) {
        roomsData = response.data.data;
      }

      setRooms(roomsData);

      if (roomsData.length === 0) {
        setSuccess('No rooms found. Add your first room.');
      }
    } catch (error: any) {
      console.error('Error fetching rooms:', error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch rooms. Please try again.';
      setError(errorMessage);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

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

    // Prevent double submission
    if (submitting) return;

    // Validation
    const requiredFields = ['name', 'type', 'description', 'bedType'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      setSubmitting(true);

      // Create or update room

      if (editingRoom) {
        // For now, keep updates as JSON payloads
        const payload = {
          ...formData,
        };
        // response = await api.put(`/rooms/${editingRoom._id}`, payload);
        await api.put(`/rooms/${editingRoom._id}`, payload);
      } else {
        // Build FormData for creating a new room with optional images
        const formDataToSend = new FormData();

        // Primitive fields
        formDataToSend.append('name', formData.name);
        formDataToSend.append('type', formData.type);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('bedType', formData.bedType);
        formDataToSend.append('status', formData.status);
        formDataToSend.append('isActive', String(formData.isActive));
        formDataToSend.append('area', String(formData.area));
        formDataToSend.append('floor', String(formData.floor));
        formDataToSend.append('totalRooms', String(formData.totalRooms));

        // Nested objects as JSON strings (parsed on backend)
        formDataToSend.append('capacity', JSON.stringify(formData.capacity));
        formDataToSend.append('price', JSON.stringify(formData.price));
        formDataToSend.append('features', JSON.stringify(formData.features));

        // Images - up to 5, enforced by handleImageSelect
        selectedImages.forEach((file) => {
          formDataToSend.append('images', file);
        });

        // response = await api.post('/rooms', formDataToSend, {
        await api.post('/rooms', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      // Show success message and refresh the list
      setSuccess(editingRoom ? 'Room updated successfully!' : 'Room added successfully!');
      handleCloseModal();
      setSelectedImages([]);
      setImagePreview([]);
      fetchRooms();
    } catch (err: any) {
      console.error('Error saving room:', err);

      let errorMessage = 'Failed to save room';

      if (err.response) {
        // Handle different error statuses
        if (err.response.status === 400) {
          errorMessage = 'Invalid data. Please check your inputs.';
        } else if (err.response.status === 401) {
          errorMessage = 'You are not authorized. Please login again.';
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (err.response.status === 413) {
          errorMessage = 'File size is too large. Maximum size is 5MB per image.';
        } else if (err.response.status === 429) {
          errorMessage = 'Too many requests. Please try again later.';
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setSubmitting(false);
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
      setSelectedRooms(rooms.map(room => room._id));
    } else {
      setSelectedRooms([]);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;

    try {
      setDeletingRoomId(roomId);
      setError('');

      await api.delete(`/rooms/${roomId}`);

      setSuccess('Room deleted successfully!');
      setDeletingRoomId(null);
      fetchRooms();
    } catch (err: any) {
      console.error('Error deleting room:', err);

      let errorMessage = 'Failed to delete room';

      if (err.response) {
        if (err.response.status === 400) {
          // This is likely "Cannot delete room with active bookings"
          errorMessage = err.response.data?.message || 'Cannot delete this room. It may have active bookings.';
        } else if (err.response.status === 404) {
          errorMessage = 'Room not found';
        } else if (err.response.status === 401 || err.response.status === 403) {
          errorMessage = 'You do not have permission to delete this room.';
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setDeletingRoomId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRooms.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRooms.length} selected rooms?`)) return;

    try {
      setSubmitting(true);
      setError('');

      const results = await Promise.allSettled(
        selectedRooms.map(roomId => api.delete(`/rooms/${roomId}`))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        // const failedRoomIds = selectedRooms.filter((_, i) => results[i].status === 'rejected');
        const failureReasons = results
          .map((r, i) => r.status === 'rejected' ? r.reason?.response?.data?.message : null)
          .filter(Boolean);

        setError(`Successfully deleted ${successful} room(s). Failed to delete ${failed} room(s): ${failureReasons.join(', ')}`);
      } else {
        setSuccess(`${successful} rooms deleted successfully!`);
      }

      setSelectedRooms([]);
      fetchRooms();
    } catch (error: any) {
      console.error('Error bulk deleting rooms:', error);
      setError(error.response?.data?.message || 'Failed to delete some rooms');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkStatusChange = async (status: Room['status']) => {
    if (selectedRooms.length === 0) return;

    try {
      // Use Promise.all to update all selected rooms
      await Promise.all(selectedRooms.map(roomId =>
        api.put(`/rooms/${roomId}`, { status })
      ));
      setSuccess(`${selectedRooms.length} rooms status updated to ${status}!`);
      setSelectedRooms([]);
      fetchRooms();
    } catch (error) {
      console.error('Error bulk updating status:', error);
      setError('Failed to update some rooms status');
    }
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

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Room Management</h5>
        <div className="d-flex gap-2">
          {selectedRooms.length > 0 && (
            <div className="d-flex gap-2 align-items-center">
              <span className="text-muted">{selectedRooms.length} selected</span>
              <Button variant="outline-danger" size="sm" onClick={handleBulkDelete}>
                <Trash2 size={14} className="me-1" />
                Delete Selected
              </Button>
              <Dropdown as={ButtonGroup} className="me-2">
                <Dropdown.Toggle variant="outline-primary" size="sm" id="dropdown-status">
                  Change Status
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => handleBulkStatusChange('Available')}>
                    Mark as Available
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkStatusChange('Occupied')}>
                    Mark as Occupied
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkStatusChange('Maintenance')}>
                    Mark as Maintenance
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleBulkStatusChange('Out of Order')}>
                    Mark as Out of Order
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          )}
          <Button variant="outline-secondary" onClick={fetchRooms} disabled={loading}>
            <RefreshCw size={16} className={`me-1 ${loading ? 'spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={handleAddRoom}
            type="button"
            disabled={showModal || submitting}
            className="position-relative"
          >
            <Plus size={16} className="me-1" />
            Add Room
            {showModal && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                Modal Open
              </span>
            )}
          </Button>
        </div>
      </Card.Header>

      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
            {success.includes('added successfully') && (
              <div className="mt-2">
                <Button
                  variant="outline-success"
                  size="sm"
                  href="/"
                  target="_blank"
                  className="me-2"
                >
                  <ExternalLink size={14} className="me-1" />
                  View on Home Page
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  href="/rooms"
                  target="_blank"
                >
                  <ExternalLink size={14} className="me-1" />
                  View on Rooms Page
                </Button>
              </div>
            )}
          </Alert>
        )}

        {loading ? (
          <DataLoader type="table" count={5} columns={7} />
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>
                  <Form.Check
                    type="checkbox"
                    checked={selectedRooms.length === rooms.length && rooms.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Base Price</th>
                <th>Room Numbers</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    No rooms found. <Button variant="link" onClick={handleAddRoom}>Add your first room</Button>
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room._id}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={selectedRooms.includes(room._id)}
                        onChange={(e) => handleSelectRoom(room._id, e.target.checked)}
                      />
                    </td>
                    <td>{room.name}</td>
                    <td>
                      <Badge bg="secondary">{room.type}</Badge>
                    </td>
                    <td>{room.capacity.adults} Adults, {room.capacity.children} Children</td>
                    <td>₹{room.price.basePrice}</td>
                    <td>
                      {room.totalRoomNumbers !== undefined ? (
                        <span>
                          <Badge bg={room.availableCount && room.availableCount > 0 ? 'success' : 'secondary'}>
                            {room.availableCount || 0} Available
                          </Badge>
                          {' / '}
                          <Badge bg="info">{room.totalRoomNumbers} Total</Badge>
                        </span>
                      ) : (
                        <Badge bg="warning">Not Created</Badge>
                      )}
                    </td>
                    <td>{getStatusBadge(room.status)}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleEditRoom(room)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="me-1"
                        onClick={() => handleOpenImageUploadModal(room)}
                        title="Upload images"
                      >
                        <Upload size={14} />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteRoom(room._id)}
                        disabled={deletingRoomId === room._id}
                      >
                        {deletingRoomId === room._id ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-1" />
                            Deleting...
                          </>
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>

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
              <Form.Label>Room Images</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="mb-2"
              />
              <div className="text-muted small mb-3">You can upload up to 5 images</div>

              {/* Image preview */}
              <div className="d-flex flex-wrap gap-2">
                {imagePreview.map((src, index) => (
                  <div key={index} className="position-relative" style={{ width: '100px', height: '80px' }}>
                    <img
                      src={src}
                      alt={`Preview ${index + 1}`}
                      className="img-thumbnail h-100 w-100"
                      style={{ objectFit: 'cover' }}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      className="position-absolute top-0 end-0 m-1 rounded-circle p-0"
                      style={{ width: '24px', height: '24px' }}
                      onClick={() => removeImage(index)}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Room'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Image Upload Modal */}
      {roomForImageUpload && (
        <ImageUploadModal
          show={showImageUploadModal}
          onHide={handleCloseImageUploadModal}
          type="room"
          itemId={roomForImageUpload._id}
          itemName={roomForImageUpload.name}
          onUploadSuccess={() => {
            fetchRooms();
            handleCloseImageUploadModal();
          }}
          maxFiles={5}
        />
      )}
    </Card>
  );
};

export default RoomManagement;