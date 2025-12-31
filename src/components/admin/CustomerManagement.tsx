import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { Search, UserPlus, Trash2, User } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { User as UserType } from '../../types';
import { toast } from 'react-toastify';
import '../../styles/admin-panel.css';

// Extend the User type with additional customer statistics
interface Customer extends UserType {
  _id?: string; // MongoDB ID field
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
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

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
        toast.success('Customer added successfully!');
        // Reset form
        e.currentTarget.reset();
      } else {
        setError(response.message || 'Failed to add customer');
        toast.error(response.message || 'Failed to add customer');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add customer';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    console.log('DELETE BUTTON CLICKED!', customer);
    alert('Delete button clicked for: ' + customer.name);
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    console.log('Deleting customer:', customerToDelete);
    
    try {
      setDeleteLoading(true);
      setError(''); // Clear any previous errors
      
      // Use id first, then _id as fallback (MongoDB uses _id)
      const customerId = customerToDelete.id || customerToDelete._id;
      console.log('Customer ID to delete:', customerId);
      
      if (!customerId) {
        throw new Error('Customer ID not found');
      }
      
      const response = await adminAPI.deleteCustomer(customerId);
      console.log('Delete response:', response);
      
      if (response && response.success) {
        setShowDeleteModal(false);
        setCustomerToDelete(null);
        toast.success('Customer deleted successfully!');
        await fetchCustomers(); // Refresh customer list
      } else {
        const errorMessage = response?.message || 'Failed to delete customer';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete customer';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setCustomerToDelete(null);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number = 0) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Customer Management</h3>
        </div>
        <div className="admin-card-body">
          <div className="admin-loading">
            <div className="admin-spinner"></div>
            Loading customers...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3 className="admin-card-title">Customer Management</h3>
            <p className="admin-card-subtitle">Manage your restaurant customers</p>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <div className="admin-search">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <UserPlus size={16} />
              Add Customer
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card-body">
        {error && (
          <div className="admin-alert admin-alert-danger" role="alert">
            {error}
          </div>
        )}

        {filteredCustomers.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <User size={48} />
            </div>
            <h4 className="admin-empty-title">
              {searchTerm ? 'No customers found' : 'No customers yet'}
            </h4>
            <p className="admin-empty-description">
              {searchTerm ? 'Try adjusting your search terms.' : 'Start by adding your first customer.'}
            </p>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                  <th>TOTAL BOOKINGS</th>
                  <th>TOTAL SPENT</th>
                  <th>JOINED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id || customer._id}>
                    <td>
                      <div>
                        <strong>{customer.name || 'N/A'}</strong>
                        <br />
                        <small style={{ color: '#64748b' }}>{customer.email || 'N/A'}</small>
                      </div>
                    </td>
                    <td>{customer.phone || '-'}</td>
                    <td>
                      <Badge bg={getRoleBadgeVariant(customer.role)}>
                        {customer.role || 'customer'}
                      </Badge>
                    </td>
                    <td>
                      <div className="admin-status">
                        <span className={`admin-status-dot ${customer.isEmailVerified !== false ? 'active' : 'inactive'}`}></span>
                        {customer.isEmailVerified !== false ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td>
                      <Badge bg="info">
                        {customer.totalBookings || 0}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="success">
                        {formatCurrency(customer.totalSpent || 0)}
                      </Badge>
                    </td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td>
                      <div className="admin-action-buttons">
                        <Button 
                          variant="outline-danger"
                          size="sm"
                          title="Delete Customer"
                          onClick={() => handleDeleteClick(customer)}
                          style={{ 
                            padding: '0.25rem 0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Add Customer Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
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
            <Button type="submit" variant="primary" disabled={addLoading}>
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

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleDeleteCancel}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Customer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this customer?</p>
          {customerToDelete && (
            <Alert variant="warning">
              <strong>{customerToDelete.name}</strong><br />
              <small>{customerToDelete.email}</small>
            </Alert>
          )}
          <p className="text-muted">
            This action cannot be undone. The customer will be permanently removed from the system.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              'Delete Customer'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CustomerManagement;