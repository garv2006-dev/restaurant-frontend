import React from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { useLocation, Link } from 'react-router-dom';

const OrderSuccess: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const orderId = params.get('orderId');

  return (
    <Container className="py-5 text-center">
      <Alert variant="success">
        <Alert.Heading>Thank you for your order!</Alert.Heading>
        <p>Your order has been placed successfully.</p>
        {orderId && <p>Order Number: <strong>{orderId}</strong></p>}
      </Alert>

      <Button as={Link as any} to="/menu" variant="primary" className="me-2">
        Back to Menu
      </Button>
      <Button as={Link as any} to="/bookings" variant="outline-secondary">
        View My Bookings
      </Button>
    </Container>
  );
};

export default OrderSuccess;
