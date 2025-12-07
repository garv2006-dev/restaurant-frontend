import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { Search, UserPlus, Edit, Trash2 } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { User } from '../../types';

// Extend the User type with additional customer statistics
interface Customer extends User {
  totalBookings?: number;
  totalSpent?: number;
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addLoading, setAddLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getCustomers();
      console.log('Customer API Response:', response);
      
      if (response && response.success && response.data) {
        // The data structure is { customers: Customer[], pagination: any }
        const customerData = response.data.customers || response.data || [];
        console.log('Fetched customers:', customerData);
        setCustomers(customerData);
      } else {
        setError(response?.message || 'No customer data available');
        setCustomers([]);
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      setError(error.response?.data?.message || 'Failed to load customers. Please try again.');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      password: formData.get('password') as string,
    };

    try {
      setAddLoading(true);
      const response = await adminAPI.addCustomer(customerData);
      
      if (response.success) {
        setShowAddModal(false);
        fetchCustomers(); // Refresh customer list
        // Reset form
        e.currentTarget.reset();
      } else {
        setError(response.message || 'Failed to add customer');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add customer');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'staff': return 'warning';
      default: return 'primary';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean = true) => {
    return isActive ? 'success' : 'secondary';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number = 0) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">Customer Management</h5>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-4">
            <Spinner animation="border" />
            <p className="mt-2">Loading customers...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Customer Management</h5>
        <div className="d-flex gap-2">
          <div className="position-relative">
            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" />
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <UserPlus size={16} className="me-1" />
            Add Customer
          </Button>
        </div>
      </Card.Header>

      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted">
              {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
            </p>
          </div>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Total Bookings</th>
                <th>Total Spent</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div>
                      <strong>{customer.name || 'N/A'}</strong>
                    </div>
                  </td>
                  <td>{customer.email || 'N/A'}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>
                    <Badge bg={getRoleBadgeVariant(customer.role)}>
                      {customer.role || 'customer'}
                    </Badge>
                  </td>
                  <td>
                    <Badge bg={getStatusBadgeVariant(customer.isEmailVerified !== undefined ? customer.isEmailVerified : true)}>
                      {customer.isEmailVerified !== undefined ? (customer.isEmailVerified ? 'Active' : 'Inactive') : 'Active'}
                    </Badge>
                  </td>
                  <td>
                    <Badge bg="info">{customer.totalBookings || 0}</Badge>
                  </td>
                  <td>
                    <Badge bg="success">{formatCurrency(customer.totalSpent || 0)}</Badge>
                  </td>
                  <td>{formatDate(customer.createdAt)}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="me-1">
                      <Edit size={14} />
                    </Button>
                    <Button variant="outline-danger" size="sm">
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
      
      {/* Add Customer Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add New Customer</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddCustomer}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder="Enter customer name"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                placeholder="Enter customer email"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                placeholder="Enter customer phone"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                placeholder="Enter temporary password"
                required
                minLength={6}
              />
              <Form.Text className="text-muted">
                Minimum 6 characters. Customer can change this later.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={addLoading}>
              {addLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Adding...
                </>
              ) : (
                'Add Customer'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Card>
  );
};

export default CustomerManagement;