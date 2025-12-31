import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Modal, Spinner } from 'react-bootstrap';
import { Calendar, Users, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsAPI, roomsAPI } from '../services/api';
import { differenceInDays } from 'date-fns';
import type { Room, Booking as BookingType, BookingFormData } from '../types';
import { triggerBookingNotification } from '../utils/bookingNotification';
import DiscountCode from '../components/booking/DiscountCode';

const Booking: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roomId = searchParams.get('room');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [totalNights, setTotalNights] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Online'>('Cash');
  const [pendingBookingPayload, setPendingBookingPayload] = useState<any | null>(null);
  
  // Discount state
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    name: string;
    type: string;
    value: number;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [subtotalAmount, setSubtotalAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  
  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    roomId: '',
    checkInDate: '',
    checkOutDate: '',
    nights: 1,
    guests: {
      adults: 1,
      children: 0
    },
    guestDetails: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    },
    additionalGuests: [],
    specialRequests: '',
    preferences: {
      earlyCheckIn: false,
      lateCheckOut: false
    },
    extraServices: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when selected room changes
  useEffect(() => {
    if (selectedRoom && bookingForm.roomId !== selectedRoom.id) {
      setBookingForm(prev => ({
        ...prev,
        roomId: selectedRoom.id
      }));
    }
  }, [selectedRoom, bookingForm.roomId]);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setBookingError(null);

        const response = await roomsAPI.getAllRooms({ status: 'Available' });
        console.log('Rooms API response:', response);

        const availableRooms = response?.success && response?.data ? response.data.rooms : [];
        const safeRooms = Array.isArray(availableRooms) ? availableRooms : [];
        setRooms(safeRooms);
        
        // If roomId is provided in URL, select that room
        if (roomId && safeRooms.length > 0) {
          const room = safeRooms.find((r: Room) => r.id === roomId);
          if (room) {
            setSelectedRoom(room);
            setBookingForm(prev => ({
              ...prev,
              roomId: room.id,
              guests: {
                adults: 1,
                children: 0
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setBookingError('Failed to load available rooms. Please try again later.');
        setRooms([]); // Ensure rooms is always an array even on error
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [roomId]);

  const handleBookRoom = (room: Room): void => {
    console.log('Booking room:', room);
    setSelectedRoom(room);
    
    // Set the form data with the selected room
    const newForm: BookingFormData = {
      roomId: room._id || room.id, // Use _id if available, fallback to id
      checkInDate: '',
      checkOutDate: '',
      nights: 1,
      guests: {
        adults: 1,
        children: 0
      },
      guestDetails: {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || ''
      },
      additionalGuests: [],
      specialRequests: '',
      preferences: {
        earlyCheckIn: false,
        lateCheckOut: false
      },
      extraServices: []
    };
    
    console.log('Updated booking form:', newForm);
    setBookingForm(newForm);
    setErrors({});
    setBookingError(null);
    setShowBookingModal(true);
  };

  const handleFormChange = (field: string, value: string | number | boolean): void => {
    if (field.includes('.')) {
      // Handle nested fields like 'guests.adults' or 'guestDetails.name'
      const [parent, child] = field.split('.');
      setBookingForm(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      // Handle top-level fields
      setBookingForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('Validating form:', bookingForm);

    // Validate check-in date
    if (!bookingForm.checkInDate) {
      newErrors.checkInDate = 'Check-in date is required';
    } else {
      const checkInDate = new Date(bookingForm.checkInDate);
      checkInDate.setHours(0, 0, 0, 0);
      
      if (checkInDate < today) {
        newErrors.checkInDate = 'Check-in date cannot be in the past';
      }
    }
    
    // Validate check-out date
    if (!bookingForm.checkOutDate) {
      newErrors.checkOutDate = 'Check-out date is required';
    } else if (bookingForm.checkInDate) {
      const checkInDate = new Date(bookingForm.checkInDate);
      const checkOutDate = new Date(bookingForm.checkOutDate);
      
      // Reset time parts for accurate comparison
      checkInDate.setHours(0, 0, 0, 0);
      checkOutDate.setHours(0, 0, 0, 0);
      
      if (checkOutDate <= checkInDate) {
        newErrors.checkOutDate = 'Check-out date must be after check-in date';
      }
    }
    
    // Check if roomId is set
    if (!bookingForm.roomId) {
      newErrors.room = 'Please select a room';
    }
    
    // Validate guest details
    if (!bookingForm.guestDetails.name?.trim()) {
      newErrors['guestDetails.name'] = 'Name is required';
    }
    
    if (!bookingForm.guestDetails.email?.trim()) {
      newErrors['guestDetails.email'] = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(bookingForm.guestDetails.email)) {
      newErrors['guestDetails.email'] = 'Email is invalid';
    }
    
    if (!bookingForm.guestDetails.phone?.trim()) {
      newErrors['guestDetails.phone'] = 'Phone number is required';
    } else if (!/^[0-9]{10,15}$/.test(bookingForm.guestDetails.phone.replace(/[^0-9]/g, ''))) {
      newErrors['guestDetails.phone'] = 'Please enter a valid phone number';
    }
    
    // Check room capacity
    const roomToCheck = selectedRoom || rooms.find(r => r._id === bookingForm.roomId || r.id === bookingForm.roomId);
    if (roomToCheck) {
      const totalGuests = bookingForm.guests.adults + bookingForm.guests.children;
      const maxCapacity = roomToCheck.capacity.adults + roomToCheck.capacity.children;
      
      if (totalGuests > maxCapacity) {
        newErrors.guests = `Maximum capacity for this room is ${maxCapacity} guests`;
      } else if (bookingForm.guests.adults < 1) {
        newErrors.guests = 'At least one adult is required';
      }
    }

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitBooking = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    console.log('Form submitted');
    console.log('Current form state:', bookingForm);
    console.log('Selected room:', selectedRoom);
    
    // Ensure we have a room selected
    if (!selectedRoom && bookingForm.roomId) {
      const room = rooms.find(r => r._id === bookingForm.roomId || r.id === bookingForm.roomId);
      if (room) {
        setSelectedRoom(room);
      }
    }
    
    // Validate form
    if (!validateForm() || !selectedRoom) {
      console.log('Form validation failed or no room selected');
      console.log('Validation result:', !validateForm());
      console.log('Selected room exists:', !!selectedRoom);
      return;
    }

    // Step 1: build payload and open payment modal instead of calling API directly
    try {
      setBookingError(null);

      const checkInDate = new Date(bookingForm.checkInDate);
      checkInDate.setUTCHours(12, 0, 0, 0);
      const checkOutDate = new Date(bookingForm.checkOutDate);
      checkOutDate.setUTCHours(12, 0, 0, 0);

      const bookingData = {
        roomId: selectedRoom._id || selectedRoom.id, // Use _id if available, fallback to id
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        guestDetails: {
          primaryGuest: {
            name: bookingForm.guestDetails.name.trim(),
            email: bookingForm.guestDetails.email.trim(),
            phone: bookingForm.guestDetails.phone.replace(/[^0-9]/g, '')
          },
          totalAdults: bookingForm.guests.adults,
          totalChildren: bookingForm.guests.children,
          additionalGuests: bookingForm.additionalGuests || []
        }
      };

      setPendingBookingPayload(bookingData);
      setShowBookingModal(false);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('Error preparing booking payload:', error);
      setBookingError('Failed to prepare booking. Please try again.');
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingBookingPayload || !selectedRoom) return;

    try {
      setSubmitting(true);
      setBookingError(null);

      const payload = {
        ...pendingBookingPayload,
        paymentDetails: {
          method: selectedPaymentMethod
        },
        // Include discount code if applied
        ...(appliedDiscount && { discountCode: appliedDiscount.code })
      };

      console.log('Submitting booking with payment:', payload);

      const response = await bookingsAPI.createBooking(payload);
      console.log('Booking API response:', response);

      if (response?.success) {
        setSuccess(true);
        setShowPaymentModal(false);
        alert('Booking confirmed successfully!');
        
        // Trigger notification
        if ((response.data as any)?.notificationTrigger) {
          console.log('Triggering notification:', (response.data as any).notificationTrigger);
          triggerBookingNotification((response.data as any).notificationTrigger);
        } else {
          console.log('No notification trigger in response');
        }
        
        navigate('/bookings');
      } else {
        throw new Error(response?.message || 'Failed to create booking');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      let errorMessage = 'Failed to submit booking. Please try again.';

      // Better error handling for different types of errors
      if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Cannot connect to server. Please check if the backend server is running on port 5000.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused. Please ensure the backend server is running.';
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        if (status === 404) {
          errorMessage = 'Booking service not found. Please contact support.';
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else {
          errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection and ensure the backend server is running on port 5000.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setBookingError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total price when dates or room changes
  useEffect(() => {
    if (selectedRoom && bookingForm.checkInDate && bookingForm.checkOutDate) {
      const nights = differenceInDays(
        new Date(bookingForm.checkOutDate),
        new Date(bookingForm.checkInDate)
      ) || 1;
      
      const basePrice = selectedRoom.price.basePrice;
      const subtotal = basePrice * nights;
      
      setTotalNights(nights);
      setSubtotalAmount(subtotal);
      
      // Calculate final amount with discount
      if (appliedDiscount) {
        setFinalAmount(appliedDiscount.finalAmount);
        setTotalAmount(appliedDiscount.finalAmount);
      } else {
        setFinalAmount(subtotal);
        setTotalAmount(subtotal);
      }
    }
  }, [bookingForm.checkInDate, bookingForm.checkOutDate, selectedRoom, appliedDiscount]);

  const handleDiscountApplied = (discount: {
    code: string;
    name: string;
    type: string;
    value: number;
    discountAmount: number;
    finalAmount: number;
  } | null) => {
    setAppliedDiscount(discount);
    if (discount) {
      setFinalAmount(discount.finalAmount);
      setTotalAmount(discount.finalAmount);
    } else {
      setFinalAmount(subtotalAmount);
      setTotalAmount(subtotalAmount);
    }
  };

  const getRoomPrimaryImageUrl = (room: Room): string => {
    const fallbackUrl = 'https://via.placeholder.com/400x250?text=Room+Image';

    if (!room || !Array.isArray(room.images) || room.images.length === 0) {
      return fallbackUrl;
    }

    const isCloudinaryUrl = (url?: string) => !!url && url.includes('res.cloudinary.com');

    const cloudImages = room.images.filter((img) => isCloudinaryUrl(img.url));
    const primaryCloud = cloudImages.find((img) => img.isPrimary);
    if (primaryCloud?.url) return primaryCloud.url;

    if (cloudImages.length > 0) {
      const lastCloud = cloudImages[cloudImages.length - 1];
      if (lastCloud?.url) return lastCloud.url;
    }

    const primaryAny = room.images.find((img) => img.isPrimary && !!img.url);
    if (primaryAny?.url) return primaryAny.url;

    const lastAny = room.images[room.images.length - 1];
    return lastAny?.url || fallbackUrl;
  };

  return (
    <Container className="py-5">
      {/* Connection Test - Remove this after fixing the issue */}
      
      
      {/* Header */}
      <Row className="mb-5">
        <Col>
          <div className="text-center">
            <h1 className="display-4 mb-3">Book Your Stay</h1>
            <p className="lead text-muted">Choose from our comfortable and luxurious rooms</p>
          </div>
        </Col>
      </Row>

      {/* Rooms Grid */}
      <Row>
        {rooms && rooms.length > 0 ? (
          rooms.map((room: Room) => (
            <Col md={6} lg={4} key={room.id} className="mb-4">
              <Card className="h-100 shadow-sm border-0">
                <div className="position-relative">
                  <Card.Img 
                    variant="top" 
                    src={getRoomPrimaryImageUrl(room)}
                    alt={room.name}
                    style={{ height: '250px', objectFit: 'cover' }}
                  />
                  <div className="position-absolute top-0 end-0 m-2">
                    {room.status === 'Available' ? (
                      <Badge bg="success">Available</Badge>
                    ) : room.status === 'Occupied' ? (
                      <Badge bg="danger">Booked</Badge>
                    ) : (
                      <Badge bg="warning" text="dark">Under Maintenance</Badge>
                    )}
                  </div>
                </div>
                
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="h5 mb-0">{room.name}</Card.Title>
                    <span className="fw-bold text-primary">₹{room.price.basePrice}/night</span>
                  </div>
                  
                  <div className="d-flex align-items-center mb-3">
                    <Badge bg="secondary" className="me-2">
                      {room.type}
                    </Badge>
                    <small className="text-muted">
                      <Users size={14} className="me-1" />
                      {room.capacity.adults} {room.capacity.adults === 1 ? 'Adult' : 'Adults'}
                      {room.capacity.children > 0 && `, ${room.capacity.children} ${room.capacity.children === 1 ? 'Child' : 'Children'}`}
                    </small>
                  </div>
                  
                  <div className="mb-3">
                    <h6 className="small text-muted mb-2">Amenities:</h6>
                    <div className="d-flex flex-wrap gap-1">
                      {room.features ? Object.entries(room.features)
                        .filter(([_, value]) => value)
                        .map(([feature]) => (
                          <Badge key={feature} bg="light" text="dark" className="small me-1 mb-1">
                            {feature.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </Badge>
                        )) : null}
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <Button 
                      variant={room.status === 'Available' ? "primary" : "secondary"} 
                      className="w-100"
                      disabled={room.status !== 'Available'}
                      onClick={() => handleBookRoom(room)}
                    >
                      {room.status === 'Available' ? 'Book Now' : room.status === 'Occupied' ? 'Booked' : 'Not Available'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : loading ? (
          <Col>
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading rooms...</p>
            </div>
          </Col>
        ) : (
          <Col>
            <Alert variant="info">
              <Alert.Heading>No rooms available</Alert.Heading>
              <p>Sorry, there are no rooms available at the moment. Please check back later.</p>
            </Alert>
          </Col>
        )}
      </Row>

      {/* Booking Modal */}
      <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Book {selectedRoom?.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitBooking}>
          <Modal.Body>
            {bookingError ? (
              <Alert variant="danger" className="mb-4">
                <XCircle size={20} className="me-2" />
                {bookingError}
              </Alert>
            ) : null}
            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <Calendar size={16} className="me-1" />
                    Check-in Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={bookingForm.checkInDate}
                    onChange={(e) => handleFormChange('checkInDate', e.target.value)}
                    isInvalid={!!errors.checkInDate}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.checkInDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <Calendar size={16} className="me-1" />
                    Check-out Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={bookingForm.checkOutDate}
                    onChange={(e) => handleFormChange('checkOutDate', e.target.value)}
                    isInvalid={!!errors.checkOutDate}
                    min={bookingForm.checkInDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.checkOutDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Adults</Form.Label>
                  <Form.Select
                    value={bookingForm.guests.adults}
                    onChange={(e) => handleFormChange('guests.adults', parseInt(e.target.value))}
                  >
                    {[1,2,3,4].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Children</Form.Label>
                  <Form.Select
                    value={bookingForm.guests.children}
                    onChange={(e) => handleFormChange('guests.children', parseInt(e.target.value))}
                  >
                    {[0,1,2,3].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={bookingForm.guestDetails.name}
                    onChange={(e) => handleFormChange('guestDetails.name', e.target.value)}
                    isInvalid={!!errors['guestDetails.name']}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['guestDetails.name']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={bookingForm.guestDetails.email}
                    onChange={(e) => handleFormChange('guestDetails.email', e.target.value)}
                    isInvalid={!!errors['guestDetails.email']}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['guestDetails.email']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={bookingForm.guestDetails.phone}
                    onChange={(e) => handleFormChange('guestDetails.phone', e.target.value)}
                    isInvalid={!!errors['guestDetails.phone']}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['guestDetails.phone']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Special Requests (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={bookingForm.specialRequests}
                    onChange={(e) => handleFormChange('specialRequests', e.target.value)}
                    placeholder="Any special requirements..."
                  />
                </Form.Group>
              </Col>
            </Row>

            {selectedRoom && bookingForm.checkInDate && bookingForm.checkOutDate && (
              <Alert variant="info">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Subtotal: ₹{subtotalAmount.toFixed(2)}</strong>
                    <br />
                    <small>
                      {totalNights} nights × ₹{selectedRoom.price.basePrice}/night
                    </small>
                  </div>
                </div>
                {appliedDiscount && (
                  <div className="mt-2 pt-2 border-top">
                    <div className="d-flex justify-content-between">
                      <small>Discount ({appliedDiscount.code}):</small>
                      <small className="text-success">-₹{appliedDiscount.discountAmount.toFixed(2)}</small>
                    </div>
                    <div className="d-flex justify-content-between">
                      <strong>Final Total:</strong>
                      <strong className="text-primary">₹{finalAmount.toFixed(2)}</strong>
                    </div>
                  </div>
                )}
              </Alert>
            )}
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBookingModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Continue to Payment
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Payment Method Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Complete Your Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bookingError && (
            <Alert variant="danger" className="mb-3">
              {bookingError}
            </Alert>
          )}
          
          {/* Booking Summary */}
          {selectedRoom && (
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Booking Summary</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <p className="mb-1"><strong>Room:</strong> {selectedRoom.name}</p>
                    <p className="mb-1"><strong>Check-in:</strong> {bookingForm.checkInDate}</p>
                    <p className="mb-1"><strong>Check-out:</strong> {bookingForm.checkOutDate}</p>
                    <p className="mb-0"><strong>Nights:</strong> {totalNights}</p>
                  </Col>
                  <Col md={6}>
                    <p className="mb-1"><strong>Guests:</strong> {bookingForm.guests.adults} Adults{bookingForm.guests.children > 0 && `, ${bookingForm.guests.children} Children`}</p>
                    <p className="mb-1"><strong>Rate:</strong> ₹{selectedRoom.price.basePrice}/night</p>
                    <p className="mb-1"><strong>Subtotal:</strong> ₹{subtotalAmount.toFixed(2)}</p>
                    {appliedDiscount && (
                      <>
                        <p className="mb-1 text-success">
                          <strong>Discount ({appliedDiscount.code}):</strong> -₹{appliedDiscount.discountAmount.toFixed(2)}
                        </p>
                        <p className="mb-0 text-primary">
                          <strong>Final Total:</strong> ₹{finalAmount.toFixed(2)}
                        </p>
                      </>
                    )}
                    {!appliedDiscount && (
                      <p className="mb-0 text-primary">
                        <strong>Total:</strong> ₹{totalAmount.toFixed(2)}
                      </p>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Discount Code Section */}
          <Card className="mb-4">
            <Card.Body>
              <DiscountCode
                subtotal={subtotalAmount}
                onDiscountApplied={handleDiscountApplied}
                disabled={submitting}
              />
            </Card.Body>
          </Card>

          {/* Payment Method Selection */}
          <Card>
            <Card.Header>
              <h6 className="mb-0">Payment Method</h6>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Select Payment Method</Form.Label>
                  <Form.Select
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value as any)}
                    disabled={submitting}
                  >
                    <option value="Cash">Cash on Arrival</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Online">Online Banking</option>
                  </Form.Select>
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowPaymentModal(false);
              setShowBookingModal(true);
            }}
            disabled={submitting}
          >
            Back
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirmPayment} 
            disabled={submitting}
            size="lg"
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              `Pay ₹${(appliedDiscount ? finalAmount : totalAmount).toFixed(2)} & Confirm`
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Booking;