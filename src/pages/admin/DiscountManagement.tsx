import React, { useState, useEffect } from 'react';
import { Badge, Modal, Form } from 'react-bootstrap';
import { Plus, Search, Tag, Trash2, Edit2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import DataLoader from '../../components/common/DataLoader';
import '../../styles/admin-panel.css';

interface UsageLimit {
  total: number | null;
  perUser: number;
}

interface Restrictions {
  minOrderAmount: number;
  maxDiscountAmount: number;
  applicableFor: 'all' | 'food' | 'rooms' | 'events';
  firstTimeOnly: boolean;
  validFrom?: string;
  validUntil?: string;
}

interface Discount {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'buy_one_get_one';
  value: number;
  description: string;
  isActive: boolean;
  minimumOrderAmount: number;
  name: string;
  usageLimit: UsageLimit;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  maxDiscount?: number;
  applicableFor?: string;
  restrictions?: Restrictions; // To handle potential backend differences
}

interface DiscountFormData {
  code: string;
  type: 'percentage' | 'fixed' | 'buy_one_get_one';
  value: number;
  name: string;
  description: string;
  minimumOrderAmount: number;
  maxDiscount: number | undefined;
  applicableFor: 'all' | 'food' | 'rooms' | 'events';
  usageLimit: UsageLimit;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  restrictions: {
    firstTimeOnly: boolean;
  };
}

const DiscountManagement: React.FC = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [formData, setFormData] = useState<DiscountFormData>({
    code: '',
    type: 'percentage',
    value: 0,
    name: '',
    description: '',
    minimumOrderAmount: 0,
    maxDiscount: undefined,
    applicableFor: 'all',
    usageLimit: { total: null, perUser: 1 },
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
    restrictions: { firstTimeOnly: false }
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDiscounts();
      if (response.success && response.data) {
        // Handle different response structures gracefully
        const discountsData = Array.isArray(response.data) ? response.data :
          (response.data.discounts ? response.data.discounts : []);
        setDiscounts(discountsData);
      }
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast.error('Failed to load discounts');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      name: discount.name || '',
      description: discount.description || '',
      minimumOrderAmount: discount.minimumOrderAmount || 0,
      maxDiscount: discount.maxDiscount,
      applicableFor: (discount.applicableFor as any) || 'all',
      usageLimit: discount.usageLimit || { total: null, perUser: 1 },
      validFrom: discount.validFrom ? new Date(discount.validFrom).toISOString().split('T')[0] : '',
      validUntil: discount.validUntil ? new Date(discount.validUntil).toISOString().split('T')[0] : '',
      isActive: discount.isActive,
      restrictions: discount.restrictions ? { firstTimeOnly: discount.restrictions.firstTimeOnly } : { firstTimeOnly: false }
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this discount?')) {
      try {
        const response = await adminAPI.deleteDiscount(id);
        if (response.success) {
          toast.success('Discount deleted successfully');
          fetchDiscounts();
        } else {
          toast.error(response.message || 'Failed to delete discount');
        }
      } catch (error) {
        console.error('Error deleting discount:', error);
        toast.error('Failed to delete discount');
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      // Assuming there's an endpoint or we use update for this.
      // If specific toggle endpoint exists, use it. Otherwise use edit.
      // For now, let's assume we update the specific field if patch exists, or full update.
      // We'll use the generic update since specific toggle isn't in standard CRUD usually unless specified.
      // Actually, let's assume updateDiscount handles partial updates or we fetch the full object.
      // Ideally backend supports PATCH /:id/status. Implementing via full update for safety if API is unknown.

      // Re-finding the discount to make sure we have latest data
      const discountToUpdate = discounts.find(d => d._id === id);
      if (!discountToUpdate) return;

      const updatedData = { ...discountToUpdate, isActive: !currentStatus };
      // We need to map it back to the format API expects if it differs from Discount type
      // But usually update endpoints accept the same body.
      const response = await adminAPI.updateDiscount(id, updatedData);

      if (response.success) {
        toast.success(`Discount ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchDiscounts();
      } else {
        toast.error(response.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating discount status:', error);
      toast.error('Failed to status');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 0,
      name: '',
      description: '',
      minimumOrderAmount: 0,
      maxDiscount: undefined,
      applicableFor: 'all',
      usageLimit: { total: null, perUser: 1 },
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      restrictions: { firstTimeOnly: false }
    });
    setEditingDiscount(null);
  };

  const generateCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setFormData({ ...formData, code: result });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDiscount) {
        const response = await adminAPI.updateDiscount(editingDiscount._id, formData);
        if (response.success) {
          toast.success('Discount updated successfully');
          setShowModal(false);
          resetForm();
          fetchDiscounts();
        } else {
          toast.error(response.message || 'Failed to update discount');
        }
      } else {
        const response = await adminAPI.createDiscount(formData);
        if (response.success) {
          toast.success('Discount created successfully');
          setShowModal(false);
          resetForm();
          fetchDiscounts();
        } else {
          toast.error(response.message || 'Failed to create discount');
        }
      }
    } catch (error) {
      console.error('Error saving discount:', error);
      toast.error('Failed to save discount');
    }
  };

  const filteredDiscounts = discounts.filter(discount =>
    discount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
        <div>
          <h2 className="admin-page-title mb-1">Discount Management</h2>
          <p className="text-muted mb-0">Manage coupons and promotional offers</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} className="me-2" />
          Create New Discount
        </button>
      </div>

      <div className="admin-card mb-4">
        <div className="admin-card-header d-flex justify-content-between align-items-center">
          <h5 className="admin-card-title mb-0">Discount Codes</h5>
          <div className="admin-search position-relative">
            <Search size={18} className="admin-search-icon text-muted position-absolute top-50 start-0 translate-middle-y ms-3" />
            <input
              type="text"
              className="admin-form-control ps-5"
              placeholder="Search discounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="admin-card-body p-0">
          {!loading && filteredDiscounts.length === 0 ? (
            <div className="text-center py-5">
              <Tag size={48} className="text-muted mb-3 opacity-25" />
              <h5 className="text-muted">{searchTerm ? 'No discounts found matching your search.' : 'No discount codes found'}</h5>
              {!searchTerm && <p className="text-muted">Create your first discount to get started!</p>}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Usage</th>
                    <th>Valid Until</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-5 text-center">
                        <DataLoader type="spinner" />
                      </td>
                    </tr>
                  ) : (
                    filteredDiscounts.map((discount) => (
                      <tr key={discount._id}>
                        <td>
                          <span className="badge bg-light text-dark border fw-bold font-monospace px-2 py-1">
                            {discount.code}
                          </span>
                        </td>
                        <td>
                          <div>
                            <div className="fw-medium text-dark">{discount.name}</div>
                            {discount.description && <div className="small text-muted text-truncate" style={{ maxWidth: '200px' }}>{discount.description}</div>}
                          </div>
                        </td>
                        <td>
                          <Badge bg="info" className="fw-normal bg-opacity-10 text-info border border-info border-opacity-25">
                            {discount.type === 'percentage' && 'Percentage'}
                            {discount.type === 'fixed' && 'Fixed Amount'}
                            {discount.type === 'buy_one_get_one' && 'BOGO'}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-bold text-success">
                            {discount.type === 'percentage' && `${discount.value}% OFF`}
                            {discount.type === 'fixed' && `₹${discount.value} OFF`}
                            {discount.type === 'buy_one_get_one' && 'Buy 1 Get 1'}
                          </div>
                          {discount.minimumOrderAmount > 0 && (
                            <div className="small text-muted">Min: ₹{discount.minimumOrderAmount}</div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex flex-column small">
                            <span><strong>{discount.usedCount}</strong> / {discount.usageLimit.total === null ? '∞' : discount.usageLimit.total} total</span>
                            <span className="text-muted">Max {discount.usageLimit.perUser} per user</span>
                          </div>
                        </td>
                        <td>
                          <div className={new Date(discount.validUntil) < new Date() ? 'text-danger fw-medium' : 'text-dark'}>
                            {new Date(discount.validUntil).toLocaleDateString()}
                          </div>
                          {new Date(discount.validUntil) < new Date() && <span className="badge bg-danger">Expired</span>}
                        </td>
                        <td>
                          {discount.isActive ? (
                            <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 fw-normal px-2">Active</span>
                          ) : (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 fw-normal px-2">Inactive</span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="admin-action-buttons justify-content-end">
                            <button
                              className="admin-action-btn view"
                              onClick={() => handleEdit(discount)}
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className={`admin-action-btn ${discount.isActive ? 'edit' : 'confirm'}`}
                              onClick={() => toggleStatus(discount._id, discount.isActive)}
                              title={discount.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {discount.isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                            <button
                              className="admin-action-btn delete"
                              onClick={() => handleDelete(discount._id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingDiscount ? 'Edit' : 'Create'} Discount</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="p-4">
            <div className="row g-3 mb-3">
              <div className="col-md-8">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Discount Code</Form.Label>
                  <div className="input-group">
                    <Form.Control
                      className="admin-form-control"
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="DISCOUNT10"
                      required
                    />
                    <button className="btn btn-outline-secondary text-muted bg-light border-start-0" type="button" onClick={generateCode}>
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Discount Type</Form.Label>
                  <Form.Select
                    className="admin-form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                    <option value="buy_one_get_one">Buy One Get One</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Discount Name</Form.Label>
                  <Form.Control
                    className="admin-form-control"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Summer Sale"
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">
                    Discount Value
                    {formData.type === 'percentage' && ' (%)'}
                    {formData.type === 'fixed' && ' (₹)'}
                  </Form.Label>
                  <Form.Control
                    className="admin-form-control"
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
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-muted">Description</Form.Label>
              <Form.Control
                className="admin-form-control"
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the discount..."
              />
            </Form.Group>

            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Min Order Amount (₹)</Form.Label>
                  <Form.Control
                    className="admin-form-control"
                    type="number"
                    min="0"
                    value={formData.minimumOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minimumOrderAmount: parseFloat(e.target.value) })}
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Max Discount (₹)</Form.Label>
                  <Form.Control
                    className="admin-form-control"
                    type="number"
                    min="0"
                    value={formData.maxDiscount || ''}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined })}
                    disabled={formData.type === 'fixed' || formData.type === 'buy_one_get_one'}
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Applicable For</Form.Label>
                  <Form.Select
                    className="admin-form-select"
                    value={formData.applicableFor}
                    onChange={(e) => setFormData({ ...formData, applicableFor: e.target.value as any })}
                  >
                    <option value="all">All Services</option>
                    <option value="food">Food Only</option>
                    <option value="rooms">Rooms Only</option>
                    <option value="events">Events Only</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Total Usage Limit</Form.Label>
                  <Form.Control
                    className="admin-form-control"
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
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Per User Limit</Form.Label>
                  <Form.Control
                    className="admin-form-control"
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
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Valid From</Form.Label>
                  <Form.Control
                    className="admin-form-control"
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="small fw-semibold text-muted">Valid Until</Form.Label>
                  <Form.Control
                    className="admin-form-control"
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="d-flex gap-4 p-3 bg-light rounded-3">
              <Form.Check
                type="checkbox"
                id="firstTimeOnly"
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
              <Form.Check
                type="checkbox"
                id="isActive"
                label="Active immediately"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </div>

          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="admin-btn admin-btn-primary">
              {editingDiscount ? 'Update' : 'Create'} Discount
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default DiscountManagement;