import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import { Search, UserPlus, Edit, Trash2, User } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { User as UserType } from '../../types';
import '../../styles/admin-panel.css';

// Extend the User type with additional customer statistics
interface Customer extends UserType {
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
                      <strong>{customer.name || 'N/A'}</strong>
                    </td>
                    <td>{customer.email || 'N/A'}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>
                      <span className={`admin-badge admin-badge-${getRoleBadgeVariant(customer.role)}`}>
                        {customer.role || 'user'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-status">
                        <span className={`admin-status-dot ${customer.isEmailVerified !== undefined ? (customer.isEmailVerified ? 'active' : 'inactive') : 'active'}`}></span>
                        {customer.isEmailVerified !== undefined ? (customer.isEmailVerified ? 'Active' : 'Inactive') : 'Active'}
                      </div>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-info">
                        {customer.totalBookings || 0}
                      </span>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-success">
                        {formatCurrency(customer.totalSpent || 0)}
                      </span>
                    </td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td>
                      <div className="admin-action-buttons">
                        <button className="admin-action-btn edit" title="Edit">
                          <Edit size={14} />
                        </button>
                        <button className="admin-action-btn delete" title="Delete">
                          <Trash2 size={14} />
                        </button>
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
      <div className="admin-modal-dialog" style={{ display: showAddModal ? 'block' : 'none' }}>
        <div className="admin-modal">
          <div className="admin-modal-header">
            <h3 className="admin-modal-title">Add New Customer</h3>
            <button
              type="button"
              className="btn-close"
              onClick={() => setShowAddModal(false)}
            />
          </div>
          <form onSubmit={handleAddCustomer}>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  className="admin-form-control"
                  placeholder="Enter customer name"
                  required
                />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="admin-form-control"
                  placeholder="Enter customer email"
                  required
                />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="admin-form-control"
                  placeholder="Enter customer phone"
                  required
                />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="admin-form-control"
                  placeholder="Enter temporary password"
                  required
                  minLength={6}
                />
                <small className="text-muted">
                  Minimum 6 characters. Customer can change this later.
                </small>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn-outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-btn admin-btn-primary"
                disabled={addLoading}
              >
                {addLoading ? (
                  <>
                    <div className="admin-spinner"></div>
                    Adding...
                  </>
                ) : (
                  'Add Customer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;