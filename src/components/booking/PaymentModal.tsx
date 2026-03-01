import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Card, Row, Col, Spinner } from 'react-bootstrap';
import type { Room, BookingFormData } from '../../types';
import DiscountCode from './DiscountCode';

interface PaymentModalProps {
  show: boolean;
  selectedRoom: Room | null;
  bookingForm: BookingFormData;
  totalNights: number;
  subtotalAmount: number;
  finalAmount: number;
  totalAmount: number;
  appliedDiscount: any;
  selectedPaymentMethod: 'Cash' | 'Razorpay';
  processingPayment: boolean;
  bookingError: string | null;
  onHide: () => void;
  onPaymentMethodChange: (method: 'Cash' | 'Razorpay') => void;
  onConfirmPayment: () => Promise<void>;
  onDiscountApplied: (discount: any) => void;
  onBackClick: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  selectedRoom,
  bookingForm,
  totalNights,
  subtotalAmount,
  finalAmount,
  totalAmount,
  appliedDiscount,
  selectedPaymentMethod,
  processingPayment,
  bookingError,
  onHide,
  onPaymentMethodChange,
  onConfirmPayment,
  onDiscountApplied,
  onBackClick
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirmPayment();
    } finally {
      setIsConfirming(false);
    }
  };

  const amountDisplay = appliedDiscount ? finalAmount : totalAmount;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Complete Your Booking</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {bookingError && (
          <Alert variant="danger" className="mb-3">
            {bookingError}
          </Alert>
        )}

        {/* Booking Summary Card */}
        {selectedRoom && (
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Booking Summary</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p className="mb-1">
                    <strong>Room:</strong> {selectedRoom.name} ({bookingForm.roomCount} room{bookingForm.roomCount > 1 ? 's' : ''})
                  </p>
                  {bookingForm.roomNumbers.length > 0 && bookingForm.roomNumbers.some(rn => rn !== '') && (
                    <p className="mb-1">
                      <strong>Room Numbers:</strong> {bookingForm.roomNumbers.filter(rn => rn !== '').join(', ')}
                    </p>
                  )}
                  <p className="mb-1">
                    <strong>Check-in:</strong> {bookingForm.checkInDate}
                  </p>
                  <p className="mb-1">
                    <strong>Check-out:</strong> {bookingForm.checkOutDate}
                  </p>
                  <p className="mb-0">
                    <strong>Nights:</strong> {totalNights}
                  </p>
                </Col>
                <Col md={6}>
                  <p className="mb-1">
                    <strong>Guests:</strong> {bookingForm.guests.adults} Adults
                    {bookingForm.guests.children > 0 && `, ${bookingForm.guests.children} Children`}
                  </p>
                  <p className="mb-1">
                    <strong>Rate:</strong> {bookingForm.roomCount} room(s) × ₹{selectedRoom.price.basePrice}/night
                  </p>
                  <p className="mb-1">
                    <strong>Subtotal:</strong> ₹{subtotalAmount.toFixed(2)}
                  </p>
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
        <Card className="mb-4 discount-card">
          <Card.Body>
            <DiscountCode
              subtotal={subtotalAmount}
              onDiscountApplied={onDiscountApplied}
              disabled={processingPayment}
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
                <Form.Label>Select Payment Method *</Form.Label>
                <Form.Select
                  value={selectedPaymentMethod}
                  onChange={(e) => {
                    onPaymentMethodChange(e.target.value as 'Cash' | 'Razorpay');
                  }}
                  disabled={processingPayment}
                  required
                >
                  <option value="Cash">💰 Cash on Arrival - Pay at hotel during check-in</option>
                  <option value="Razorpay">💳 Razorpay - Pay online securely via Razorpay</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  {selectedPaymentMethod === 'Cash' && '✓ Your booking will be confirmed immediately. Pay at the hotel during check-in.'}
                  {selectedPaymentMethod === 'Razorpay' && '✓ Secure payment via Razorpay gateway. Booking confirmed after successful payment.'}
                </Form.Text>
              </Form.Group>

              {selectedPaymentMethod === 'Cash' && (
                <Alert variant="info" className="mb-0">
                  <strong>Cash Payment Information:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Your booking will be confirmed immediately</li>
                    <li>No online payment required</li>
                    <li>Pay the full amount at the hotel during check-in</li>
                    <li>Cancellation policy applies as per terms</li>
                  </ul>
                </Alert>
              )}

              {selectedPaymentMethod === 'Razorpay' && (
                <Alert variant="success" className="mb-0">
                  <strong>Razorpay Payment:</strong>
                  <p className="mb-0">You will be redirected to Razorpay to complete your payment securely. Razorpay supports all major credit/debit cards, UPI, net banking, and wallet payments.</p>
                </Alert>
              )}
            </Form>
          </Card.Body>
        </Card>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onBackClick}
          disabled={isConfirming}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={isConfirming}
          size="lg"
        >
          {isConfirming ? (
            <>
              <Spinner size="sm" className="me-2" animation="border" />
              Processing...
            </>
          ) : selectedPaymentMethod === 'Cash' ? (
            `Confirm Booking - Pay ₹${amountDisplay.toFixed(2)} at Hotel`
          ) : (
            `Proceed to ${selectedPaymentMethod} Payment`
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PaymentModal;
