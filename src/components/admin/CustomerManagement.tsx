import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Alert, Modal, Form, Spinner } from 'react-bootstrap';
import { Search, UserPlus, Trash2, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { User as UserType } from '../../types';
import { toast } from 'react-toastify';
import '../../styles/admin-panel.css';
import DataLoader from '../common/DataLoader';

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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addLoading, setAddLoading] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Client-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all customers for client-side pagination
      const response = await adminAPI.getCustomers({
        limit: 1000,
        search: debouncedSearchTerm || undefined
      });

      console.log('Customer API Response:', response);

      if (response && response.success) {
        // Handle potentially different response structures
        let customerData: Customer[] = [];
        if (Array.isArray(response.data)) {
          customerData = response.data;
        } else if (response.data?.customers && Array.isArray(response.data.customers)) {
          customerData = response.data.customers;
        } else if (Array.isArray((response.data as any).data)) {
          customerData = (response.data as any).data;
        }

        setCustomers(customerData);
        // Reset to first page when data changes (e.g. search)
        setCurrentPage(1);
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
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Prevent double spaces
    if (value.includes('  ')) {
      value = value.replace(/\s\s+/g, ' ');
    }

    setSearchTerm(value);
    // Debounce will trigger fetch
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
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      setDeleteLoading(true);
      setError(''); // Clear any previous errors

      // Use id first, then _id as fallback (MongoDB uses _id)
      const customerId = customerToDelete.id || customerToDelete._id;

      if (!customerId) {
        throw new Error('Customer ID not found');
      }

      const response = await adminAPI.deleteCustomer(customerId);

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

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = customers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(customers.length / itemsPerPage);

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3 className="admin-card-title">Customer Management</h3>
            <p className="admin-card-subtitle">Manage your restaurant customers</p>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <div className="admin-search position-relative">
              <Search size={16} className="admin-search-icon" />
              <input
                type="text"
                className="admin-search-input pe-5"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <button
                  className="btn btn-sm text-muted position-absolute top-50 end-0 translate-middle-y me-2 border-0 p-0"
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  style={{ background: 'transparent' }}
                >
                  ×
                </button>
              )}
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

        {loading ? (
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
                <DataLoader type="table" count={5} columns={8} />
              </tbody>
            </table>
          </div>
        ) : customers.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              <User size={48} />
            </div>
            <h4 className="admin-empty-title">
              {debouncedSearchTerm ? 'No customers found' : 'No customers yet'}
            </h4>
            <p className="admin-empty-description">
              {debouncedSearchTerm ? `No results for "${debouncedSearchTerm}"` : 'Start by adding your first customer.'}
            </p>
          </div>
        ) : (
          <>
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
                  {currentCustomers.map((customer) => (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">Show</span>
                  <Form.Select
                    size="sm"
                    style={{ width: 'auto' }}
                    value={itemsPerPage}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </Form.Select>
                  <span className="text-muted small">entries</span>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted small">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, customers.length)} of {customers.length} entries
                  </span>
                </div>

                <div className="d-flex gap-1">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="d-flex align-items-center"
                  >
                    <ChevronLeft size={14} /> Previous
                  </Button>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "primary" : "outline-secondary"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="d-flex align-items-center"
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
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