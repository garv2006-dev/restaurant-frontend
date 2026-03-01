import React, { useRef, useState } from 'react';
import { Modal, Form, Row, Col, Alert, Button } from 'react-bootstrap';
import { Calendar, XCircle, AlertTriangle } from 'lucide-react';
import type { Room, BookingFormData } from '../../types';

interface BookingFormModalProps {
  show: boolean;
  selectedRoom: Room | null;
  bookingForm: BookingFormData;
  errors: Record<string, string>;
  bookingError: string | null;
  totalNights: number;
  subtotalAmount: number;
  finalAmount: number;
  appliedDiscount: any;
  onHide: () => void;
  onFormChange: (field: string, value: string | number | boolean | string[]) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  availableRoomCount?: number;
  availableRoomNumbers?: any[];
  fetchingRoomNumbers?: boolean;
}

const BookingFormModal: React.FC<BookingFormModalProps> = ({
  show,
  selectedRoom,
  bookingForm,
  errors,
  bookingError,
  totalNights,
  subtotalAmount,
  finalAmount,
  appliedDiscount,
  onHide,
  onFormChange,
  onSubmit,
  availableRoomCount = 5,
  availableRoomNumbers = [],
  fetchingRoomNumbers = false
}) => {
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Book {selectedRoom?.name}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Body ref={modalBodyRef}>
          {bookingError && (
            <Alert variant="danger" className="mb-4">
              <XCircle size={20} className="me-2" />
              {bookingError}
            </Alert>
          )}
          {/* room availability errors are shown inline next to the selector; remove duplicate alert above */}

          {/* Check-in and Check-out Dates */}
          <Row>
            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>
                  <Calendar size={16} className="me-1" />
                  Check-in Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={bookingForm.checkInDate}
                  onChange={(e) => onFormChange('checkInDate', e.target.value)}
                  isInvalid={!!errors.checkInDate}
                  min={new Date().toISOString().split('T')[0]}
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
                  Check-out Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={bookingForm.checkOutDate}
                  onChange={(e) => onFormChange('checkOutDate', e.target.value)}
                  isInvalid={!!errors.checkOutDate}
                  min={bookingForm.checkInDate || new Date().toISOString().split('T')[0]}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.checkOutDate}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Select Rooms */}
          <Row>
            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Select Rooms <span className="text-danger">*</span></Form.Label>
                {!bookingForm.checkInDate || !bookingForm.checkOutDate ? (
                  <Form.Control
                    disabled
                    placeholder="Select dates first to see available rooms"
                  />
                ) : fetchingRoomNumbers ? (
                  <Form.Control disabled placeholder="Checking availability..." />
                ) : availableRoomNumbers.length === 0 ? (
                  <Form.Control
                    disabled
                    placeholder="No rooms available for selected dates"
                    isInvalid={true}
                  />
                ) : (
                  <>
                    <div style={{ border: '1px solid #ccc', borderRadius: '0.375rem', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                      {availableRoomNumbers.map((room: any) => (
                        <Form.Check
                          key={room.id}
                          type="checkbox"
                          id={`room-${room.id}`}
                          label={`Room ${room.roomNumber} - Floor ${room.floor}`}
                          checked={bookingForm.roomNumbers?.includes(room.roomNumber) || false}
                          onChange={(e) => {
                            const newRoomNumbers = e.target.checked
                              ? [...(bookingForm.roomNumbers || []), room.roomNumber]
                              : (bookingForm.roomNumbers || []).filter((num: string) => num !== room.roomNumber);
                            onFormChange('roomNumbers', newRoomNumbers);
                          }}
                          className="mb-2"
                        />
                      ))}
                    </div>
                    <Form.Text className="text-muted d-block mt-2">
                      {bookingForm.roomNumbers?.length || 0} room(s) selected
                    </Form.Text>
                  </>
                )}
                {errors.roomAvailability && (
                  <Form.Control.Feedback type="invalid" style={{ display: 'block' }} className="mt-1">
                    {errors.roomAvailability}
                  </Form.Control.Feedback>
                )}
              </Form.Group>
            </Col>
          </Row>

          {/* Guest Count - Adults and Children */}
          <Row>
            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Adults</Form.Label>
                <Form.Select
                  value={bookingForm.guests.adults}
                  onChange={(e) => onFormChange('guests.adults', parseInt(e.target.value))}
                  isInvalid={!!errors.guests}
                >
                  {Array.from(
                    { length: (selectedRoom?.capacity.adults || 4) * bookingForm.roomCount },
                    (_, i) => i + 1
                  ).map(num => (
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
                  onChange={(e) => onFormChange('guests.children', parseInt(e.target.value))}
                  isInvalid={!!errors.guests}
                >
                  {Array.from(
                    { length: ((selectedRoom?.capacity.children || 3) * bookingForm.roomCount) + 1 },
                    (_, i) => i
                  ).map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {errors.guests && (
            <Alert variant="danger" className="mb-3">
              <AlertTriangle size={16} className="me-1" />
              {errors.guests}
            </Alert>
          )}

          {/* Guest Details */}
          <Row>
            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  value={bookingForm.guestDetails.name}
                  onChange={(e) => onFormChange('guestDetails.name', e.target.value)}
                  isInvalid={!!errors['guestDetails.name']}
                />
                <Form.Control.Feedback type="invalid">
                  {errors['guestDetails.name']}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="email"
                  value={bookingForm.guestDetails.email}
                  onChange={(e) => onFormChange('guestDetails.email', e.target.value)}
                  isInvalid={!!errors['guestDetails.email']}
                />
                <Form.Control.Feedback type="invalid">
                  {errors['guestDetails.email']}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Phone */}
          <Row>
            <Col md={6} className="mb-3">
              <Form.Group>
                <Form.Label>Phone <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="tel"
                  value={bookingForm.guestDetails.phone}
                  onChange={(e) => onFormChange('guestDetails.phone', e.target.value)}
                  isInvalid={!!errors['guestDetails.phone']}
                />
                <Form.Control.Feedback type="invalid">
                  {errors['guestDetails.phone']}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          {/* Price Summary */}
          {selectedRoom && bookingForm.checkInDate && bookingForm.checkOutDate && (
            <Alert variant="info">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Subtotal: ₹{subtotalAmount.toFixed(2)}</strong>
                  <br />
                  <small>
                    {totalNights} nights × {bookingForm.roomCount} room(s) × ₹{selectedRoom.price.basePrice}/night
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
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting || fetchingRoomNumbers}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting || fetchingRoomNumbers || Object.keys(errors).length > 0}
          >
            Continue to Payment
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default BookingFormModal;
