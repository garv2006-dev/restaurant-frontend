import React from 'react';
import { Container, Row, Col, Table, Button, Form, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart: React.FC = () => {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  const handleQuantityChange = (id: string, value: number) => {
    if (Number.isNaN(value) || value < 0) return;
    updateQuantity(id, value);
  };

  const taxes = subtotal * 0.1; // 10% tax example
  const total = subtotal + taxes;

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigate('/checkout');
  };

  return (
    <Container className="py-5">
      <h1 className="mb-4">Your Cart</h1>

      {items.length === 0 ? (
        <Alert variant="info">
          Your cart is empty. <Alert.Link as={Link as any} to="/menu">Browse the menu</Alert.Link> to add items.
        </Alert>
      ) : (
        <>
          <Row>
            <Col md={8} className="mb-4">
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th style={{ width: 140 }}>Quantity</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{ width: 60, height: 40, objectFit: 'cover', marginRight: 12 }}
                              onError={e => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://via.placeholder.com/60x40?text=Item';
                              }}
                            />
                          )}
                          <div>
                            <div className="fw-semibold">{item.name}</div>
                            {item.category && (
                              <small className="text-muted">{item.category}</small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>₹{item.price.toFixed(2)}</td>
                      <td>
                        <Form.Control
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={e => handleQuantityChange(item.id, parseInt(e.target.value || '0', 10))}
                          size="sm"
                        />
                      </td>
                      <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Col>

            <Col md={4}>
              <div className="p-3 border rounded">
                <h5>Order Summary</h5>
                <div className="d-flex justify-content-between mt-3">
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

                <Button
                  variant="primary"
                  className="w-100 mt-3"
                  onClick={handleCheckout}
                  disabled={items.length === 0}
                >
                  Proceed to Checkout
                </Button>

                <Button
                  variant="link"
                  className="w-100 mt-2"
                  as={Link as any}
                  to="/menu"
                >
                  Continue Shopping
                </Button>
              </div>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default Cart;
