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
import { Plus, Edit2, Trash2, X, RefreshCw, ExternalLink, ChevronDown, Upload } from 'lucide-react';
import api from '../../services/api';

interface Room {
  _id: string;
  roomNumber: string;
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
    weekendPrice: number;
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
  isActive: boolean;
}

const RoomManagement: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    roomNumber: string;
    name: string;
    type: 'Standard' | 'Deluxe' | 'Suite';
    description: string;
    capacity: { adults: number; children: number };
    price: { basePrice: number; weekendPrice: number };
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
  }>({
    roomNumber: '',
    name: '',
    type: 'Standard',
    description: '',
    capacity: { adults: 2, children: 1 },
    price: { basePrice: 0, weekendPrice: 0 },
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
  });

  const fetchRooms = async () => {
    try {
      setLoading(true);
      // Use the correct endpoint and data structure
      const response = await api.get('/rooms');
      // Handle both possible response structures
      const roomsData = response.data.data || response.data.rooms || [];
      setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setError('Failed to fetch rooms');
      setRooms([]); // Ensure rooms is always an array
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

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
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
      roomNumber: '',
      name: '',
      type: 'Standard',
      description: '',
      capacity: { adults: 2, children: 1 },
      price: { basePrice: 0, weekendPrice: 0 },
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
    if (submitting) return; // prevent double submit

    if (!formData.roomNumber || !formData.name || !formData.price.basePrice) {
      setError('Please fill in all required fields');
      return;
    }

    // Enhanced validation
    if (formData.capacity.adults < 1) {
      setError('Adult capacity must be at least 1');
      return;
    }

    if (formData.price.basePrice < 0 || formData.price.weekendPrice < 0) {
      setError('Prices cannot be negative');
      return;
    }

    if (formData.price.weekendPrice > 0 && formData.price.weekendPrice < formData.price.basePrice) {
      setError('Weekend price should be higher than base price');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        images: selectedImages.length === 0 ? [{
          url: 'https://via.placeholder.com/400x250?text=Room+Image',
          altText: `${formData.name} - Image`,
          isPrimary: true,
        }] : [],
      };

      if (editingRoom) {
        await api.put(`/rooms/${editingRoom._id}`, payload);
      } else {
        // Use the correct endpoint for creating rooms
        await api.post('/rooms', payload);
      }

      setSuccess(editingRoom ? 'Room updated successfully!' : 'Room added successfully!');
      handleCloseModal();
      setSelectedImages([]);
      setImagePreview([]);
      fetchRooms();
    } catch (err: any) {
      console.error('Error saving room:', err);
      // Specific handling for rate limit
      if (err?.response?.status === 429) {
        const msg429 = err?.response?.data?.message || 'Too many requests from this IP, please try again later.';
        setError(msg429);
      } else {
        const msg = err?.response?.data?.message || err?.message || 'Failed to save room';
        setError(msg);
      }
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
      await api.delete(`/rooms/${roomId}`);
      setSuccess('Room deleted successfully!');
      fetchRooms();
    } catch (err) {
      console.error('Error deleting room:', err);
      setError('Failed to delete room');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRooms.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRooms.length} selected rooms?`)) return;

    try {
      // Use Promise.all to delete all selected rooms
      await Promise.all(selectedRooms.map(roomId => api.delete(`/rooms/${roomId}`)));
      setSuccess(`${selectedRooms.length} rooms deleted successfully!`);
      setSelectedRooms([]);
      fetchRooms();
    } catch (error) {
      console.error('Error bulk deleting rooms:', error);
      setError('Failed to delete some rooms');
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
              <div className="dropdown">
                <Button variant="outline-primary" size="sm">
                  Change Status <ChevronDown size={12} className="ms-1" />
                </Button>
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => handleBulkStatusChange('Available')}>
                    Mark as Available
                  </button>
                  <button className="dropdown-item" onClick={() => handleBulkStatusChange('Occupied')}>
                    Mark as Occupied
                  </button>
                  <button className="dropdown-item" onClick={() => handleBulkStatusChange('Maintenance')}>
                    Mark as Maintenance
                  </button>
                  <button className="dropdown-item" onClick={() => handleBulkStatusChange('Out of Order')}>
                    Mark as Out of Order
                  </button>
                </div>
              </div>
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
          <div className="text-center py-4">
            <Spinner animation="border" />
            <p className="mt-2">Loading rooms...</p>
          </div>
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
                <th>Room #</th>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Base Price</th>
                <th>Weekend Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4">
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
                    <td>{room.roomNumber}</td>
                    <td>{room.name}</td>
                    <td>
                      <Badge bg="secondary">{room.type}</Badge>
                    </td>
                    <td>{room.capacity.adults} Adults, {room.capacity.children} Children</td>
                    <td>₹{room.price.basePrice}</td>
                    <td>₹{room.price.weekendPrice}</td>
                    <td>{getStatusBadge(room.status)}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-1" onClick={() => handleEditRoom(room)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteRoom(room._id)}>
                        <Trash2 size={14} />
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
      <Modal
        show={showModal}
        onHide={() => {
          handleCloseModal();
        }}
        size="lg"
        backdrop="static"
        style={{ zIndex: 1055 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingRoom ? 'Edit Room' : 'Add New Room'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Room Number *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({...formData, roomNumber: e.target.value})}
                    placeholder="e.g., 101, A-1"
                    maxLength={20}
                    pattern="[A-Za-z0-9\-]+"
                    title="Room number can only contain letters, numbers, and hyphens"
                  />
                  <Form.Text className="text-muted">
                    Use letters, numbers, and hyphens only
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Room Name *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Deluxe Ocean View"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Bed Type *</Form.Label>
                  <Form.Select
                    required
                    value={formData.bedType}
                    onChange={(e) => setFormData({...formData, bedType: e.target.value as 'Single' | 'Double' | 'Queen' | 'King' | 'Twin'})}
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Queen">Queen</option>
                    <option value="King">King</option>
                    <option value="Twin">Twin</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Area (sq ft) *</Form.Label>
                  <Form.Control
                    type="number"
                    min="100"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Floor *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({...formData, floor: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Room description..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Adult Capacity *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    required
                    value={formData.capacity.adults}
                    onChange={(e) => setFormData({
                      ...formData, 
                      capacity: {...formData.capacity, adults: parseInt(e.target.value)}
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Children Capacity</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.capacity.children}
                    onChange={(e) => setFormData({
                      ...formData, 
                      capacity: {...formData.capacity, children: parseInt(e.target.value)}
                    })}
                  />
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
                    required
                    value={formData.price.basePrice}
                    onChange={(e) => setFormData({
                      ...formData, 
                      price: {...formData.price, basePrice: parseFloat(e.target.value)}
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Weekend Price (₹) *</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    required
                    value={formData.price.weekendPrice}
                    onChange={(e) => setFormData({
                      ...formData, 
                      price: {...formData.price, weekendPrice: parseFloat(e.target.value)}
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Features</Form.Label>
              <Row>
                <Col md={6}>
                  <Form.Check
                    type="checkbox"
                    label="Air Conditioning"
                    checked={formData.features.airConditioning}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {...formData.features, airConditioning: e.target.checked}
                    })}
                  />
                  <Form.Check
                    type="checkbox"
                    label="Wi-Fi"
                    checked={formData.features.wifi}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {...formData.features, wifi: e.target.checked}
                    })}
                  />
                  <Form.Check
                    type="checkbox"
                    label="Television"
                    checked={formData.features.television}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {...formData.features, television: e.target.checked}
                    })}
                  />
                </Col>
                <Col md={6}>
                  <Form.Check
                    type="checkbox"
                    label="Breakfast"
                    checked={formData.features.breakfast}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {...formData.features, breakfast: e.target.checked}
                    })}
                  />
                  <Form.Check
                    type="checkbox"
                    label="Parking Included"
                    checked={formData.features.parkingIncluded}
                    onChange={(e) => setFormData({
                      ...formData,
                      features: {...formData.features, parkingIncluded: e.target.checked}
                    })}
                  />
                </Col>
              </Row>
            </Form.Group>

            {/* Image Upload Section */}
            <Form.Group className="mb-3">
              <Form.Label>
                <Upload size={16} className="me-1" />
                Room Images (Optional - Max 5 images)
              </Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="mb-2"
              />
              <Form.Text className="text-muted">
                Upload high-quality images of the room. Supported formats: JPG, PNG, WebP
              </Form.Text>
              
              {/* Image Preview */}
              {imagePreview.length > 0 && (
                <div className="mt-3">
                  <h6>Image Preview:</h6>
                  <Row>
                    {imagePreview.map((preview, index) => (
                      <Col md={4} key={index} className="mb-2">
                        <div className="position-relative">
                          <img
                            src={preview}
                            alt={`Room preview ${index + 1}`}
                            className="img-fluid rounded"
                            style={{ height: '120px', objectFit: 'cover', width: '100%' }}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="position-absolute top-0 end-0 m-1 rounded-circle"
                            style={{ width: '25px', height: '25px' }}
                            onClick={() => removeImage(index)}
                          >
                            <X size={12} />
                          </Button>
                          {index === 0 && (
                            <Badge bg="primary" className="position-absolute bottom-0 start-0 m-1">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting && <Spinner animation="border" size="sm" className="me-2" />}
              {editingRoom ? (submitting ? 'Saving...' : 'Update Room') : (submitting ? 'Adding...' : 'Add Room')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default RoomManagement;