import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ordersAPI } from '../services/api';

const Checkout: React.FC = () => {
  const { items, subtotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'upi'>('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const taxes = subtotal * 0.1;
  const total = subtotal + taxes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const response = await ordersAPI.createOrder({
        items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        subtotal,
        taxes,
        total,
        paymentMethod,
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to place order');
      }

      clearCart();
      navigate(`/order-success?orderId=${response.data.orderId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to complete checkout');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <Container className="py-5">
        <Alert variant="info">Your cart is empty.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row>
        <Col md={7} className="mb-4">
          <h2>Checkout</h2>

          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="paymentMethod">
              <Form.Label>Payment Method</Form.Label>
              <Form.Select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as 'cod' | 'card' | 'upi')}
              >
                <option value="cod">Cash on Delivery</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
              </Form.Select>
            </Form.Group>

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Processing...
                </>
              ) : (
                'Place Order'
              )}
            </Button>
          </Form>
        </Col>

        <Col md={5}>
          <div className="p-3 border rounded">
            <h5>Order Summary</h5>
            <ul className="list-unstyled mt-3 mb-3">
              {items.map(item => (
                <li key={item.id} className="d-flex justify-content-between small mb-1">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="d-flex justify-content-between mt-2">
              <span>Subtotal</span>
              <strong>₹{subtotal.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between mt-2">
              <span>Taxes (10%)</span>
              <strong>₹{taxes.toFixed(2)}</strong>
            </div>
            <hr />
            <div className="d-flex justify-content-between">
              <span>Total</span>
              <strong>₹{total.toFixed(2)}</strong>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Checkout;
