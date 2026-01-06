import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { FaStar } from 'react-icons/fa';
import { reviewsAPI } from '../services/api';

// Create a wrapper component for FontAwesome icons to ensure React 19 compatibility
const IconWrapper = ({ icon: Icon, className, style, ...props }: { icon: any; className?: string; style?: React.CSSProperties }) => {
  return <Icon className={className} style={style} {...props} />;
};

// Simple interface for customer reviews display
interface CustomerReview {
  _id: string;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  room: {
    _id: string;
    name: string;
    type: string;
  };
  rating: number;
  title: string;
  comment: string;
  reviewType: string;
  createdAt: string;
  isApproved: boolean;
}

const CustomerReviews: React.FC = () => {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchLatestReviews();
  }, []);

  const fetchLatestReviews = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Fetching reviews from database...');
      console.log('🌐 API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
      
      // Use the proper API service method
      // For testing: add showAll=true to see unapproved reviews
      const response = await reviewsAPI.getReviews({ 
        limit: 3, 
        page: 1
      });
      
      console.log('📦 Full API Response:', response);
      
      if (response.success && response.data) {
        const reviewsData = Array.isArray(response.data) ? response.data : [];
        
        console.log(`📊 Found ${reviewsData.length} reviews from database`);
        
        if (reviewsData.length > 0) {
          // Convert API reviews to CustomerReview format
          const customerReviews: CustomerReview[] = reviewsData.map((review: any) => ({
            _id: review._id || review.id,
            user: {
              _id: review.user._id || review.user.id,
              name: review.user.name,
              avatar: review.user.avatar
            },
            room: {
              _id: review.room._id || review.room.id,
              name: review.room.name,
              type: review.room.type
            },
            rating: review.rating,
            title: review.title,
            comment: review.comment,
            reviewType: review.reviewType,
            createdAt: review.createdAt,
            isApproved: review.isApproved
          }));
          
          setReviews(customerReviews);
          console.log('✅ Successfully loaded reviews from database');
        } else {
          console.log('⚠️ No approved reviews found in database');
          setReviews([]);
        }
      } else {
        console.warn('⚠️ API response not successful:', response);
        setError('Failed to load reviews from database');
        setReviews([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch reviews:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      setError('Unable to connect to server. Please try again later.');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <IconWrapper 
          key={i} 
          icon={FaStar} 
          className="text-warning" 
          style={{ fontSize: '0.9rem' }}
        />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <IconWrapper 
          key="half" 
          icon={FaStar} 
          className="text-warning" 
          style={{ opacity: 0.5, fontSize: '0.9rem' }}
        />
      );
    }

    // Fill remaining stars with empty ones
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <IconWrapper 
          key={`empty-${i}`} 
          icon={FaStar} 
          className="text-muted" 
          style={{ opacity: 0.3, fontSize: '0.9rem' }}
        />
      );
    }

    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const getAvatarUrl = (user: CustomerReview['user']): string => {
    if (user.avatar && user.avatar.includes('http')) {
      return user.avatar;
    }
    // Fallback to a default avatar based on user name
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c8a456&color=fff&size=150&font-size=0.6`;
  };

  if (loading) {
    return (
      <section className="customer-reviews-section py-5">
        <Container>
          <div className="text-center mb-5">
            <span className="text-gold text-uppercase tracking-wider mb-2 d-block">What Our Guests Say</span>
            <h2 className="section-title">Customer Reviews</h2>
            <p className="section-description">Trusted by thousands of satisfied guests worldwide</p>
          </div>
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading reviews...</span>
            </div>
            <p className="mt-2">Loading customer reviews...</p>
          </div>
        </Container>
      </section>
    );
  }

  if (error) {
    return (
      <section className="customer-reviews-section py-5">
        <Container>
          <div className="text-center mb-5">
            <span className="text-gold text-uppercase tracking-wider mb-2 d-block">What Our Guests Say</span>
            <h2 className="section-title">Customer Reviews</h2>
            <p className="section-description">Trusted by thousands of satisfied guests worldwide</p>
          </div>
          <Alert variant="warning" className="text-center">
            <p className="mb-0">{error}</p>
          </Alert>
        </Container>
      </section>
    );
  }

  // If no reviews found, don't show the section at all or show a message
  if (reviews.length === 0) {
    return (
      <section className="customer-reviews-section py-5">
        <Container>
          <div className="text-center mb-5">
            <span className="text-gold text-uppercase tracking-wider mb-2 d-block">What Our Guests Say</span>
            <h2 className="section-title">Customer Reviews</h2>
            <p className="section-description">Trusted by thousands of satisfied guests worldwide</p>
          </div>
          <div className="text-center py-4">
            <p className="text-muted">No customer reviews available at the moment.</p>
            <p className="text-muted small">Be the first to leave a review after your stay!</p>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="customer-reviews-section py-5">
      <Container>
        <div className="text-center mb-5">
          <span className="text-gold text-uppercase tracking-wider mb-2 d-block">What Our Guests Say</span>
          <h2 className="section-title">Customer Reviews</h2>
          <p className="section-description">Trusted by thousands of satisfied guests worldwide</p>
        </div>

        <Row className="g-3 g-lg-4">
          {reviews.map((review) => (
            <Col key={review._id} xs={12} md={6} xl={4} className="mb-3 mb-lg-4">
              <Card className="review-card h-100">
                <Card.Body className="d-flex flex-column p-4">
                  {/* Customer Info */}
                  <div className="d-flex align-items-center mb-3">
                    <div className="review-avatar me-3">
                      <img
                        src={getAvatarUrl(review.user)}
                        alt={`${review.user.name}'s profile`}
                        className="rounded-circle"
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          objectFit: 'cover',
                          border: '2px solid var(--bs-primary)'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user.name)}&background=c8a456&color=fff&size=150&font-size=0.6`;
                        }}
                      />
                    </div>
                    <div className="flex-grow-1">
                      <h6 className="mb-1 fw-bold">{review.user.name}</h6>
                      <div className="d-flex align-items-center mb-1">
                        <div className="rating-stars me-2">
                          {renderStars(review.rating)}
                        </div>
                        <span className="small text-muted">({review.rating}/5)</span>
                      </div>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="flex-grow-1">
                    <h6 className="review-title mb-2 fw-semibold text-primary">
                      {review.title}
                    </h6>
                    <p className="review-comment text-muted mb-3" style={{ lineHeight: '1.6' }}>
                      "{truncateText(review.comment)}"
                    </p>
                  </div>

                  {/* Review Footer */}
                  <div className="review-footer mt-auto">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {review.room.name}
                      </small>
                      <small className="text-muted">
                        {formatDate(review.createdAt)}
                      </small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default CustomerReviews;