import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Carousel } from 'react-bootstrap';
import { FaStar, FaWifi, FaSnowflake, FaTv, FaCoffee, FaCar } from 'react-icons/fa';
import api from '../services/api';

// Create a wrapper component for FontAwesome icons to ensure React 19 compatibility
const IconWrapper = ({ icon: Icon, className, style, ...props }: { icon: any; className?: string; style?: React.CSSProperties }) => {
  return <Icon className={className} style={style} {...props} />;
};

interface Room {
  _id: string;
  name: string;
  type: string;
  description: string;
  price: {
    basePrice: number;
    weekendPrice: number;
  };
  images: Array<{
    url: string;
    altText?: string;
    isPrimary: boolean;
  }>;
  features: {
    airConditioning: boolean;
    wifi: boolean;
    television: boolean;
    breakfast: boolean;
    parkingIncluded: boolean;
  };
  capacity: {
    adults: number;
    children: number;
  };
  averageRating: number;
  totalReviews: number;
}

const Home: React.FC = () => {
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedRooms();
  }, []);

  const fetchFeaturedRooms = async () => {
    try {
      setLoading(true);
      // Fetch rooms from API
      const { data } = await api.get('/rooms?limit=6&sort=-averageRating');
      setFeaturedRooms(data.data || data.rooms || []);
    } catch (error) {
      // Fallback to mock data if API fails
      console.warn('API not available, using mock data', error);
      const mockRooms: Room[] = [
        {
          _id: '1',
          name: 'Deluxe Ocean View',
          type: 'Deluxe',
          description: 'Spacious room with stunning ocean views and modern amenities.',
          price: {
            basePrice: 200,
            weekendPrice: 250
          },
          images: [{
            url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=500',
            altText: 'Deluxe Ocean View Room',
            isPrimary: true
          }],
          features: {
            airConditioning: true,
            wifi: true,
            television: true,
            breakfast: true,
            parkingIncluded: true
          },
          capacity: {
            adults: 2,
            children: 1
          },
          averageRating: 4.8,
          totalReviews: 24
        }
      ];
      setFeaturedRooms(mockRooms);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<IconWrapper icon={FaStar} key={i} className="text-warning" />);
    }
    
    if (hasHalfStar) {
      stars.push(<IconWrapper icon={FaStar} key="half" className="text-warning" style={{ opacity: 0.5 }} />);
    }
    
    return stars;
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'airConditioning':
        return <IconWrapper icon={FaSnowflake} />;
      case 'wifi':
        return <IconWrapper icon={FaWifi} />;
      case 'television':
        return <IconWrapper icon={FaTv} />;
      case 'breakfast':
        return <IconWrapper icon={FaCoffee} />;
      case 'parkingIncluded':
        return <IconWrapper icon={FaCar} />;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section" style={{
        background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200") center/cover',
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        color: 'white',
        textAlign: 'center'
      }}>
        <Container>
          <Row>
            <Col>
              <h1 className="display-4 fw-bold mb-4">Welcome to Luxury Restaurant & Rooms</h1>
              <p className="lead mb-4">
                Experience fine dining and comfortable accommodation in the heart of the city.
                Book your perfect stay and enjoy our exquisite cuisine.
              </p>
              <div className="d-flex gap-3 justify-content-center">
                <Button variant="primary" size="lg" href="/rooms">
                  Explore Rooms
                </Button>
                <Button variant="outline-light" size="lg" href="/menu">
                  View Menu
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Featured Rooms Section */}
      <section className="py-5">
        <Container>
          <div className="text-center mb-5">
            <h2 className="mb-3">Featured Rooms</h2>
            <p className="text-muted">Discover our most popular accommodations</p>
          </div>
          
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading featured rooms...</p>
            </div>
          ) : (
            <Row>
              {featuredRooms.map((room) => (
                <Col key={room._id} md={6} lg={4} className="mb-4">
                  <Card className="room-card h-100">
                    <div className="position-relative">
                      <Card.Img 
                        variant="top" 
                        src={room.images[0]?.url || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=500'} 
                        alt={room.images[0]?.altText || room.name}
                        style={{ height: '200px', objectFit: 'cover' }}
                      />
                      <div className="position-absolute top-0 end-0 m-2">
                        <span className="price-tag">
                          ₹{room.price.basePrice}/night
                        </span>
                      </div>
                    </div>
                    <Card.Body className="d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <Card.Title className="mb-0">{room.name}</Card.Title>
                        <div className="text-end">
                          <div className="d-flex align-items-center">
                            {renderStars(room.averageRating)}
                            <span className="ms-1 small text-muted">
                              {room.averageRating} ({room.totalReviews})
                            </span>
                          </div>
                          <div className="small text-muted">{room.type}</div>
                        </div>
                      </div>
                      
                      <Card.Text className="text-muted flex-grow-1">
                        {room.description}
                      </Card.Text>
                      
                      <div className="mb-3">
                        <div className="d-flex flex-wrap gap-2">
                          {Object.entries(room.features).map(([key, value]) => 
                            value ? (
                              <span key={key} className="badge bg-light text-dark" title={key.replace(/([A-Z])/g, ' $1')}>
                                {getFeatureIcon(key)}
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-auto">
                        <Button variant="primary" href={`/rooms/${room._id}`} className="w-100">
                          Book Now
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>

      {/* Special Offers Section */}
      <section className="py-5 bg-light">
        <Container>
          <div className="text-center mb-5">
            <h2 className="mb-3">Special Offers</h2>
            <p className="text-muted">Take advantage of our exclusive deals</p>
          </div>
          
          <Carousel indicators={false}>
            <Carousel.Item>
              <div className="text-center p-4">
                <h4 className="text-primary">Weekend Getaway Package</h4>
                <p className="lead">20% off on weekend stays with complimentary breakfast</p>
                <Button variant="outline-primary">Book Now</Button>
              </div>
            </Carousel.Item>
            <Carousel.Item>
              <div className="text-center p-4">
                <h4 className="text-primary">Dining Experience</h4>
                <p className="lead">Special menu packages for couples and families</p>
                <Button variant="outline-primary" href="/menu">View Menu</Button>
              </div>
            </Carousel.Item>
            <Carousel.Item>
              <div className="text-center p-4">
                <h4 className="text-primary">Loyalty Program</h4>
                <p className="lead">Earn points with every booking and unlock exclusive benefits</p>
                <Button variant="outline-primary" href="/loyalty">Join Now</Button>
              </div>
            </Carousel.Item>
          </Carousel>
        </Container>
      </section>
    </div>
  );
};

export default Home;