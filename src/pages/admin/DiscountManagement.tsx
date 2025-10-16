import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Badge,
  Alert,
  Spinner,
  InputGroup
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../services/api';

interface DiscountFormData {
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'buy_one_get_one';
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  usageLimit: {
    total: number | null;
    perUser: number;
  };
  userLimit: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  applicableFor: 'all' | 'food' | 'rooms' | 'events';
  restrictions: {
    firstTimeOnly: boolean;
    loyaltyTierRequired: string;
    dayOfWeekRestrictions: string[];
  };
}

interface Discount {
  _id: string;
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'buy_one_get_one';
  value: number;
  minOrderAmount: number;
  maxDiscount: number;
  usageLimit: {
    total: number | null;
    perUser: number;
  };
  userLimit: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  applicableFor: 'all' | 'food' | 'rooms' | 'events';
  restrictions: {
    firstTimeOnly: boolean;
    loyaltyTierRequired: string;
    dayOfWeekRestrictions: string[];
  };
  usedCount?: number;
}

const DiscountManagement: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<DiscountFormData>({
    code: '',
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    minOrderAmount: 0,
    maxDiscount: 0,
    usageLimit: {
      total: 100,
      perUser: 1
    },
    userLimit: 1,
    isActive: true,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    applicableFor: 'all',
    restrictions: {
      firstTimeOnly: false,
      loyaltyTierRequired: '',
      dayOfWeekRestrictions: [],
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      minOrderAmount: 0,
      maxDiscount: 0,
      usageLimit: {
        total: 100,
        perUser: 1
      },
      userLimit: 1,
      isActive: true,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      applicableFor: 'all',
      restrictions: {
        firstTimeOnly: false,
        loyaltyTierRequired: '',
        dayOfWeekRestrictions: [],
      },
    });
    setEditingDiscount(null);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code: result });
  };

  const fetchDiscounts = async () => {
    try {
      const { data } = await api.get('/discounts');
      setDiscounts(data.discounts || data.data || []);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      // Don't show toast error, just log it
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDiscount) {
        await api.put(`/discounts/${editingDiscount._id}`, formData);
      } else {
        await api.post('/discounts', formData);
      }
      setShowModal(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error saving discount:', error);
      // Don't show toast error, just log it
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      name: discount.name,
      description: discount.description || '',
      type: discount.type,
      value: discount.value,
      minOrderAmount: discount.minOrderAmount || 0,
      maxDiscount: discount.maxDiscount || 0,
      usageLimit: discount.usageLimit || { total: 100, perUser: 1 },
      userLimit: discount.userLimit || 1,
      isActive: !!discount.isActive,
      validFrom: discount.validFrom ? discount.validFrom.split('T')[0] : new Date().toISOString().split('T')[0],
      validUntil: discount.validUntil ? discount.validUntil.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      applicableFor: discount.applicableFor || 'all',
      restrictions: {
        firstTimeOnly: discount.restrictions?.firstTimeOnly || false,
        loyaltyTierRequired: discount.restrictions?.loyaltyTierRequired || '',
        dayOfWeekRestrictions: discount.restrictions?.dayOfWeekRestrictions || [],
      },
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) return;
    try {
      await api.delete(`/discounts/${id}`);
      fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      // Don't show toast error, just log it
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.put(`/discounts/${id}`, { isActive: !currentStatus });
      fetchDiscounts();
    } catch (error) {
      console.error('Error updating discount status:', error);
      // Don't show toast error, just log it
    }
  };

  const filteredDiscounts = discounts.filter(discount =>
    discount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading discount management...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Discount Management</h2>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Create New Discount
            </Button>
          </div>

          <Card>
            <Card.Header>
              <Row>
                <Col md={6}>
                  <h5 className="mb-0">Discount Codes</h5>
                </Col>
                <Col md={6}>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Search discounts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              {filteredDiscounts.length === 0 ? (
                <Alert variant="info">
                  {searchTerm ? 'No discounts found matching your search.' : 'No discount codes found. Create your first discount!'}
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Usage</th>
                      <th>Valid Until</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDiscounts.map((discount) => (
                      <tr key={discount._id}>
                        <td>
                          <strong>{discount.code}</strong>
                        </td>
                        <td>
                          <div>
                            <strong>{discount.name}</strong>
                            <br />
                            <small className="text-muted">{discount.description}</small>
                          </div>
                        </td>
                        <td>
                          <Badge bg="info">
                            {discount.type === 'percentage' && `${discount.value}% OFF`}
                            {discount.type === 'fixed' && `₹${discount.value} OFF`}
                            {discount.type === 'buy_one_get_one' && 'BOGO'}
                          </Badge>
                        </td>
                        <td>
                          {discount.type === 'percentage' && `${discount.value}%`}
                          {discount.type === 'fixed' && `₹${discount.value}`}
                          {discount.type === 'buy_one_get_one' && 'BOGO'}
                          {discount.minOrderAmount > 0 && (
                            <><br /><small className="text-muted">Min: ₹{discount.minOrderAmount}</small></>
                          )}
                        </td>
                        <td>
                          {discount.usedCount}/{discount.usageLimit.total === null ? '∞' : discount.usageLimit.total}
                          <br />
                          <small className="text-muted">Per user: {discount.usageLimit.perUser}</small>
                        </td>
                        <td>
                          {new Date(discount.validUntil).toLocaleDateString()}
                          <br />
                          <small className={`text-${new Date(discount.validUntil) > new Date() ? 'success' : 'danger'}`}>
                            {new Date(discount.validUntil) > new Date() ? 'Active' : 'Expired'}
                          </small>
                        </td>
                        <td>
                          <Badge bg={discount.isActive ? 'success' : 'danger'}>
                            {discount.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(discount)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={discount.isActive ? 'outline-warning' : 'outline-success'}
                            size="sm"
                            className="me-2"
                            onClick={() => toggleStatus(discount._id, discount.isActive)}
                          >
                            {discount.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(discount._id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingDiscount ? 'Edit' : 'Create'} Discount</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount Code</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="DISCOUNT10"
                      required
                    />
                    <Button variant="outline-secondary" onClick={generateCode}>
                      Generate
                    </Button>
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount Type</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="buy_one_get_one">Buy One Get One</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Discount Value 
                    {formData.type === 'percentage' && ' (%)'}
                    {formData.type === 'fixed' && ' (₹)'}
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step={formData.type === 'percentage' ? '0.01' : '1'}
                    min="0"
                    max={formData.type === 'percentage' ? '100' : undefined}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                    disabled={formData.type === 'buy_one_get_one'}
                    required={formData.type !== 'buy_one_get_one'}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Minimum Order Amount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Maximum Discount (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) })}
                    disabled={formData.type === 'fixed' || formData.type === 'buy_one_get_one'}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Applicable For</Form.Label>
                  <Form.Select
                    value={formData.applicableFor}
                    onChange={(e) => setFormData({ ...formData, applicableFor: e.target.value as any })}
                  >
                    <option value="all">All Services</option>
                    <option value="food">Food Only</option>
                    <option value="rooms">Rooms Only</option>
                    <option value="events">Events Only</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Total Usage Limit</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.usageLimit.total === null ? '' : formData.usageLimit.total.toString()}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      usageLimit: { 
                        ...formData.usageLimit, 
                        total: e.target.value === '' ? null : parseInt(e.target.value) 
                      } 
                    })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Per User Limit</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.usageLimit.perUser.toString()}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      usageLimit: { 
                        ...formData.usageLimit, 
                        perUser: parseInt(e.target.value) 
                      } 
                    })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Loyalty Tier Required</Form.Label>
                  <Form.Select
                    value={formData.restrictions.loyaltyTierRequired}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      restrictions: { 
                        ...formData.restrictions, 
                        loyaltyTierRequired: e.target.value 
                      } 
                    })}
                  >
                    <option value="">No Requirement</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valid From</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valid Until</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="First-time customers only"
                checked={formData.restrictions.firstTimeOnly}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  restrictions: { 
                    ...formData.restrictions, 
                    firstTimeOnly: e.target.checked 
                  } 
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingDiscount ? 'Update' : 'Create'} Discount
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default DiscountManagement;