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
  Tab,
  Tabs
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { loyaltyAPI } from '../../services/api';

interface LoyaltyProgram {
  _id: string;
  name: string;
  description: string;
  pointsPerRupee: number;
  isActive: boolean;
  rewards: {
    name: string;
    pointsRequired: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    description: string;
  }[];
  tiers: {
    name: string;
    minimumPoints: number;
    benefits: {
      extraPointsMultiplier: number;
      priorityBooking: boolean;
      specialOffers: boolean;
    };
  }[];
  createdAt: string;
  updatedAt: string;
}

interface UserLoyalty {
  _id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
  tier: string;
  totalEarned: number;
  totalRedeemed: number;
  joinDate: string;
}

const LoyaltyManagement: React.FC = () => {
  const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);
  const [userLoyaltyData, setUserLoyaltyData] = useState<UserLoyalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null);
  const [activeTab, setActiveTab] = useState('programs');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointsPerRupee: 1,
    isActive: true,
    rewards: [{ name: '', pointsRequired: 0, discountType: 'percentage', discountValue: 0, description: '' }],
    tiers: [{ name: 'Bronze', minimumPoints: 0, benefits: { extraPointsMultiplier: 1, priorityBooking: false, specialOffers: false } }]
  });

  useEffect(() => {
    fetchLoyaltyPrograms();
    fetchUserLoyaltyData();
  }, []);

  const fetchLoyaltyPrograms = async () => {
    try {
      const response = await loyaltyAPI.getPrograms();
      setLoyaltyPrograms(response.data || []);
    } catch (error: any) {
      console.error('Error fetching loyalty programs:', error);
      setLoyaltyPrograms([]);
    }
  };

  const fetchUserLoyaltyData = async () => {
    try {
      const response = await loyaltyAPI.getUserLoyaltyDataAll();
      setUserLoyaltyData(response.data || []);
    } catch (error: any) {
      console.error('Error fetching user loyalty data:', error);
      setUserLoyaltyData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProgram) {
        await loyaltyAPI.updateProgram(editingProgram._id, formData);
        toast.success('Loyalty program updated successfully');
      } else {
        await loyaltyAPI.createProgram(formData);
        toast.success('Loyalty program created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchLoyaltyPrograms();
    } catch (error: any) {
      console.error('Error saving program:', error);
      toast.error(error.response?.data?.message || 'Failed to save loyalty program');
    }
  };

  const handleEdit = (program: LoyaltyProgram) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      description: program.description,
      pointsPerRupee: program.pointsPerRupee,
      isActive: program.isActive,
      rewards: program.rewards.length > 0 ? program.rewards : [{ name: '', pointsRequired: 0, discountType: 'percentage', discountValue: 0, description: '' }],
      tiers: program.tiers.length > 0 ? program.tiers : [{ name: 'Bronze', minimumPoints: 0, benefits: { extraPointsMultiplier: 1, priorityBooking: false, specialOffers: false } }]
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this loyalty program?')) return;

    try {
      await loyaltyAPI.deleteProgram(id);
      toast.success('Loyalty program deleted successfully');
      fetchLoyaltyPrograms();
    } catch (error: any) {
      console.error('Error deleting program:', error);
      toast.error(error.response?.data?.message || 'Failed to delete loyalty program');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pointsPerRupee: 1,
      isActive: true,
      rewards: [{ name: '', pointsRequired: 0, discountType: 'percentage', discountValue: 0, description: '' }],
      tiers: [{ name: 'Bronze', minimumPoints: 0, benefits: { extraPointsMultiplier: 1, priorityBooking: false, specialOffers: false } }]
    });
    setEditingProgram(null);
  };

  const addReward = () => {
    setFormData({
      ...formData,
      rewards: [...formData.rewards, { name: '', pointsRequired: 0, discountType: 'percentage', discountValue: 0, description: '' }]
    });
  };

  const removeReward = (index: number) => {
    const newRewards = formData.rewards.filter((_, i) => i !== index);
    setFormData({ ...formData, rewards: newRewards });
  };

  const addTier = () => {
    setFormData({
      ...formData,
      tiers: [...formData.tiers, { name: '', minimumPoints: 0, benefits: { extraPointsMultiplier: 1, priorityBooking: false, specialOffers: false } }]
    });
  };

  const removeTier = (index: number) => {
    const newTiers = formData.tiers.filter((_, i) => i !== index);
    setFormData({ ...formData, tiers: newTiers });
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading loyalty management...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">Loyalty Program Management</h2>
          
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'programs')} className="mb-4">
            <Tab eventKey="programs" title="Loyalty Programs">
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Loyalty Programs</h5>
                  <Button variant="primary" onClick={() => setShowModal(true)}>
                    Create New Program
                  </Button>
                </Card.Header>
                <Card.Body>
                  {loyaltyPrograms.length === 0 ? (
                    <Alert variant="info">No loyalty programs found. Create your first program!</Alert>
                  ) : (
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Points per ₹</th>
                          <th>Status</th>
                          <th>Rewards</th>
                          <th>Tiers</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loyaltyPrograms.map((program) => (
                          <tr key={program._id}>
                            <td>
                              <strong>{program.name}</strong>
                              <br />
                              <small className="text-muted">{program.description}</small>
                            </td>
                            <td>{program.pointsPerRupee}</td>
                            <td>
                              <Badge bg={program.isActive ? 'success' : 'danger'}>
                                {program.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td>{program.rewards?.length || 0}</td>
                            <td>{program.tiers?.length || 0}</td>
                            <td>{new Date(program.createdAt).toLocaleDateString()}</td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleEdit(program)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDelete(program._id)}
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
            </Tab>

            <Tab eventKey="users" title="User Loyalty Data">
              <Card>
                <Card.Header>
                  <h5 className="mb-0">User Loyalty Statistics</h5>
                </Card.Header>
                <Card.Body>
                  {userLoyaltyData.length === 0 ? (
                    <Alert variant="info">No user loyalty data available.</Alert>
                  ) : (
                    <Table responsive hover>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Current Points</th>
                          <th>Tier</th>
                          <th>Total Earned</th>
                          <th>Total Redeemed</th>
                          <th>Join Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userLoyaltyData.map((user) => (
                          <tr key={user._id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>
                              <Badge bg="primary">{user.loyaltyPoints} pts</Badge>
                            </td>
                            <td>
                              <Badge bg="success">{user.tier || 'Bronze'}</Badge>
                            </td>
                            <td>{user.totalEarned || 0}</td>
                            <td>{user.totalRedeemed || 0}</td>
                            <td>{new Date(user.joinDate).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => { setShowModal(false); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingProgram ? 'Edit' : 'Create'} Loyalty Program</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Program Name</Form.Label>
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
                  <Form.Label>Points per Rupee</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.pointsPerRupee}
                    onChange={(e) => setFormData({ ...formData, pointsPerRupee: parseFloat(e.target.value) })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Active Program"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </Form.Group>

            {/* Rewards Section */}
            <h6>Rewards</h6>
            {formData.rewards.map((reward, index) => (
              <Card key={index} className="mb-3">
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-2">
                        <Form.Label>Reward Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={reward.name}
                          onChange={(e) => {
                            const newRewards = [...formData.rewards];
                            newRewards[index].name = e.target.value;
                            setFormData({ ...formData, rewards: newRewards });
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-2">
                        <Form.Label>Points Required</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={reward.pointsRequired}
                          onChange={(e) => {
                            const newRewards = [...formData.rewards];
                            newRewards[index].pointsRequired = parseInt(e.target.value);
                            setFormData({ ...formData, rewards: newRewards });
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-2">
                        <Form.Label>Discount Type</Form.Label>
                        <Form.Select
                          value={reward.discountType}
                          onChange={(e) => {
                            const newRewards = [...formData.rewards];
                            newRewards[index].discountType = e.target.value as 'percentage' | 'fixed';
                            setFormData({ ...formData, rewards: newRewards });
                          }}
                        >
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed Amount</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group className="mb-2">
                        <Form.Label>Value</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          value={reward.discountValue}
                          onChange={(e) => {
                            const newRewards = [...formData.rewards];
                            newRewards[index].discountValue = parseFloat(e.target.value);
                            setFormData({ ...formData, rewards: newRewards });
                          }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={10}>
                      <Form.Group className="mb-2">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          type="text"
                          value={reward.description}
                          onChange={(e) => {
                            const newRewards = [...formData.rewards];
                            newRewards[index].description = e.target.value;
                            setFormData({ ...formData, rewards: newRewards });
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeReward(index)}
                        disabled={formData.rewards.length === 1}
                      >
                        Remove
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
            <Button variant="outline-primary" size="sm" onClick={addReward} className="mb-3">
              Add Reward
            </Button>

            {/* Tiers Section */}
            <h6>Tiers</h6>
            {formData.tiers.map((tier, index) => (
              <Card key={index} className="mb-3">
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-2">
                        <Form.Label>Tier Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={tier.name}
                          onChange={(e) => {
                            const newTiers = [...formData.tiers];
                            newTiers[index].name = e.target.value;
                            setFormData({ ...formData, tiers: newTiers });
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-2">
                        <Form.Label>Minimum Points</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          value={tier.minimumPoints}
                          onChange={(e) => {
                            const newTiers = [...formData.tiers];
                            newTiers[index].minimumPoints = parseInt(e.target.value);
                            setFormData({ ...formData, tiers: newTiers });
                          }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-2">
                        <Form.Label>Points Multiplier</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.1"
                          min="1"
                          value={tier.benefits.extraPointsMultiplier}
                          onChange={(e) => {
                            const newTiers = [...formData.tiers];
                            newTiers[index].benefits.extraPointsMultiplier = parseFloat(e.target.value);
                            setFormData({ ...formData, tiers: newTiers });
                          }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={5}>
                      <Form.Check
                        type="checkbox"
                        label="Priority Booking"
                        checked={tier.benefits.priorityBooking}
                        onChange={(e) => {
                          const newTiers = [...formData.tiers];
                          newTiers[index].benefits.priorityBooking = e.target.checked;
                          setFormData({ ...formData, tiers: newTiers });
                        }}
                      />
                    </Col>
                    <Col md={5}>
                      <Form.Check
                        type="checkbox"
                        label="Special Offers"
                        checked={tier.benefits.specialOffers}
                        onChange={(e) => {
                          const newTiers = [...formData.tiers];
                          newTiers[index].benefits.specialOffers = e.target.checked;
                          setFormData({ ...formData, tiers: newTiers });
                        }}
                      />
                    </Col>
                    <Col md={2} className="d-flex justify-content-end">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeTier(index)}
                        disabled={formData.tiers.length === 1}
                      >
                        Remove
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
            <Button variant="outline-primary" size="sm" onClick={addTier}>
              Add Tier
            </Button>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingProgram ? 'Update' : 'Create'} Program
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default LoyaltyManagement;