import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ProgressBar, Badge, Modal, Alert } from 'react-bootstrap';
import { Gift, Star, Award, Coins, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loyaltyAPI } from '../services/api';

interface LoyaltyProgram {
  _id: string;
  name: string;
  description: string;
  pointsPerRupee: number;
  rewards: Reward[];
  tiers: Tier[];
}

interface Reward {
  _id: string;
  name: string;
  description: string;
  pointsRequired: number;
  discountType: string;
  discountValue: number;
  isActive: boolean;
}

interface Tier {
  _id: string;
  name: string;
  minimumPoints: number;
  benefits: {
    pointMultiplier: number;
    discountPercentage: number;
    perks: string[];
  };
}

interface UserLoyaltyData {
  currentPoints: number;
  currentTier: Tier | null;
  nextTier: Tier | null;
  pointsToNextTier: number;
  availableRewards: Reward[];
}

const LoyaltyDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram | null>(null);
  const [userLoyaltyData, setUserLoyaltyData] = useState<UserLoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLoyaltyProgram();
    if (isAuthenticated) {
      fetchUserLoyaltyData();
    }
  }, [isAuthenticated]);

  const fetchLoyaltyProgram = async () => {
    try {
      const response = await loyaltyAPI.getProgram();
      if (response.success) {
        setLoyaltyProgram(response.data);
      }
    } catch (error) {
      console.error('Error fetching loyalty program:', error);
    }
  };

  const fetchUserLoyaltyData = async () => {
    try {
      const response = await loyaltyAPI.getUserLoyaltyData();
      if (response.success) {
        setUserLoyaltyData(response.data);
      }
    } catch (error) {
      console.error('Error fetching user loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async (reward: Reward) => {
    setSelectedReward(reward);
    setShowRedeemModal(true);
  };

  const confirmRedeem = async () => {
    if (!selectedReward) return;

    try {
      const response = await loyaltyAPI.redeemReward(selectedReward._id);
      
      if (response.success) {
        setSuccess(response.message || 'Reward redeemed successfully!');
        setShowRedeemModal(false);
        setSelectedReward(null);
        fetchUserLoyaltyData(); // Refresh user data
      } else {
        setError(response.message || 'Failed to redeem reward');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error redeeming reward');
      console.error('Error redeeming reward:', error);
    }
  };

  const handleJoinProgram = async () => {
    try {
      const response = await loyaltyAPI.joinProgram();
      
      if (response.success) {
        setSuccess('Successfully joined the loyalty program!');
        fetchUserLoyaltyData(); // Refresh user data
      } else {
        setError(response.message || 'Failed to join loyalty program');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Error joining loyalty program');
      console.error('Error joining loyalty program:', error);
    }
  };

  const getTierProgress = () => {
    if (!userLoyaltyData?.currentTier || !userLoyaltyData?.nextTier) return 100;
    
    const currentTierPoints = userLoyaltyData.currentTier.minimumPoints;
    const nextTierPoints = userLoyaltyData.nextTier.minimumPoints;
    const userPoints = userLoyaltyData.currentPoints;
    
    const progress = ((userPoints - currentTierPoints) / (nextTierPoints - currentTierPoints)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  if (!loyaltyProgram) {
    return (
      <Container className="py-5">
        <Card className="text-center">
          <Card.Body>
            <h5>No Loyalty Program Available</h5>
            <p className="text-muted">Check back later for exciting rewards!</p>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (!isAuthenticated) {
    return (
      <Container className="py-5">
        <Card className="text-center">
          <Card.Body>
            <h5>Join Our Loyalty Program</h5>
            <p className="text-muted">Sign in to start earning points and unlock exclusive rewards!</p>
            <Button variant="primary" href="/login">Sign In</Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Show join button if user is authenticated but not enrolled
  if (!userLoyaltyData) {
    return (
      <Container className="py-5">
        <Card className="text-center">
          <Card.Body>
            <h5>Join Our Loyalty Program</h5>
            <p className="text-muted">{loyaltyProgram.description}</p>
            <p className="text-muted">Earn {loyaltyProgram.pointsPerRupee} point{loyaltyProgram.pointsPerRupee !== 1 ? 's' : ''} for every ₹1 spent and unlock exclusive rewards!</p>
            <Button variant="primary" onClick={handleJoinProgram}>Join Now</Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h1 className="display-5 mb-2">{loyaltyProgram.name}</h1>
          <p className="lead text-muted">{loyaltyProgram.description}</p>
        </Col>
      </Row>

      {/* User Points Overview */}
      {userLoyaltyData && (
        <Row className="mb-5">
          <Col lg={8}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-3">
                  <Coins className="text-warning me-2" size={24} />
                  <h5 className="mb-0">Your Loyalty Status</h5>
                </div>
                
                <Row className="align-items-center">
                  <Col md={6}>
                    <div className="text-center">
                      <h2 className="text-primary mb-1">{userLoyaltyData.currentPoints}</h2>
                      <p className="text-muted mb-0">Total Points</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="text-center">
                      {userLoyaltyData.currentTier && (
                        <Badge bg="warning" className="fs-6 p-2">
                          <Award size={16} className="me-1" />
                          {userLoyaltyData.currentTier.name}
                        </Badge>
                      )}
                      {userLoyaltyData.nextTier && (
                        <div className="mt-3">
                          <small className="text-muted d-block">Next Tier: {userLoyaltyData.nextTier.name}</small>
                          <ProgressBar 
                            now={getTierProgress()} 
                            className="mt-2"
                            style={{ height: '8px' }}
                          />
                          <small className="text-muted">
                            {userLoyaltyData.pointsToNextTier} points to go
                          </small>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
                
                {userLoyaltyData.currentTier?.benefits?.perks && userLoyaltyData.currentTier.benefits.perks.length > 0 && (
                  <div className="mt-4">
                    <h6>Your Tier Benefits:</h6>
                    <ul className="list-unstyled">
                      {userLoyaltyData.currentTier.benefits.perks.map((perk, index) => (
                        <li key={index} className="d-flex align-items-center">
                          <Star size={16} className="text-warning me-2" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-4 text-center">
                <Gift className="text-primary mb-3" size={48} />
                <h5>Earn More Points</h5>
                <p className="text-muted small">
                  Earn {loyaltyProgram.pointsPerRupee} point{loyaltyProgram.pointsPerRupee !== 1 ? 's' : ''} for every ₹1 spent
                </p>
                <Button variant="outline-primary" href="/booking">
                  Book Now
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Available Rewards */}
      {userLoyaltyData?.availableRewards && userLoyaltyData.availableRewards.length > 0 && (
        <Row className="mb-5">
          <Col>
            <h3 className="mb-4">
              <Gift className="me-2" size={24} />
              Available Rewards
            </h3>
            <Row>
              {userLoyaltyData.availableRewards.map((reward) => (
                <Col md={6} lg={4} key={reward._id} className="mb-4">
                  <Card className="border-0 shadow-sm h-100">
                    <Card.Body>
                      <h6>{reward.name}</h6>
                      <p className="text-muted small">{reward.description}</p>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-primary fw-bold">
                          {reward.pointsRequired} points
                        </span>
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => handleRedeemReward(reward)}
                        >
                          Redeem
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>
      )}

      {/* All Tiers */}
      <Row>
        <Col>
          <h3 className="mb-4">
            <Award className="me-2" size={24} />
            Membership Tiers
          </h3>
          <Row>
            {loyaltyProgram.tiers.map((tier) => (
              <Col md={6} lg={4} key={tier._id} className="mb-4">
                <Card className={`border-0 shadow-sm h-100 ${
                  userLoyaltyData?.currentTier?._id === tier._id ? 'border-warning' : ''
                }`}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">{tier.name}</h6>
                      {userLoyaltyData?.currentTier?._id === tier._id && (
                        <Badge bg="warning">Current</Badge>
                      )}
                    </div>
                    <p className="text-muted small mb-3">
                      {tier.minimumPoints} points required
                    </p>
                    <ul className="list-unstyled small">
                      <li>
                        <Star size={14} className="text-warning me-1" />
                        {tier.benefits.pointMultiplier}x point multiplier
                      </li>
                      {tier.benefits.discountPercentage > 0 && (
                        <li>
                          <Star size={14} className="text-warning me-1" />
                          {tier.benefits.discountPercentage}% discount on bookings
                        </li>
                      )}
                      {tier.benefits.perks.map((perk, index) => (
                        <li key={index}>
                          <Star size={14} className="text-warning me-1" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>

      {/* Redeem Modal */}
      <Modal show={showRedeemModal} onHide={() => setShowRedeemModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Redeem Reward</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReward && (
            <div>
              <h6>{selectedReward.name}</h6>
              <p className="text-muted">{selectedReward.description}</p>
              <div className="bg-light p-3 rounded">
                <strong>Points Required: {selectedReward.pointsRequired}</strong>
                <br />
                <small className="text-muted">
                  You currently have {userLoyaltyData?.currentPoints} points
                </small>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRedeemModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmRedeem}>
            Confirm Redemption
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LoyaltyDashboard;