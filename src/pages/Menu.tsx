import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, Spinner, Alert } from 'react-bootstrap';
import { Star, Filter, Search, Heart } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  rating: number;
  preparationTime: number;
}

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const [error, setError] = useState('');

  const categories = ['all', 'Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Specials'];

  useEffect(() => {
    // Mock data for demonstration
    const mockMenuItems: MenuItem[] = [
      {
        id: '1',
        name: 'Butter Chicken',
        description: 'Tender chicken cooked in rich, creamy tomato sauce with Indian spices',
        price: 450,
        category: 'Main Course',
        image: '/api/placeholder/300/200',
        isVegetarian: false,
        isSpicy: true,
        rating: 4.8,
        preparationTime: 25
      },
      {
        id: '2',
        name: 'Paneer Tikka Masala',
        description: 'Grilled cottage cheese cubes in aromatic tomato and cashew gravy',
        price: 380,
        category: 'Main Course',
        image: '/api/placeholder/300/200',
        isVegetarian: true,
        isSpicy: true,
        rating: 4.6,
        preparationTime: 20
      },
      {
        id: '3',
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with parmesan cheese, croutons and caesar dressing',
        price: 280,
        category: 'Appetizers',
        image: '/api/placeholder/300/200',
        isVegetarian: true,
        isSpicy: false,
        rating: 4.4,
        preparationTime: 10
      },
      {
        id: '4',
        name: 'Chocolate Lava Cake',
        description: 'Warm chocolate cake with molten chocolate center, served with vanilla ice cream',
        price: 220,
        category: 'Desserts',
        image: '/api/placeholder/300/200',
        isVegetarian: true,
        isSpicy: false,
        rating: 4.9,
        preparationTime: 15
      },
      {
        id: '5',
        name: 'Fresh Lime Soda',
        description: 'Refreshing lime juice with soda water and mint leaves',
        price: 120,
        category: 'Beverages',
        image: '/api/placeholder/300/200',
        isVegetarian: true,
        isSpicy: false,
        rating: 4.2,
        preparationTime: 5
      },
      {
        id: '6',
        name: 'Chef\'s Special Biryani',
        description: 'Aromatic basmati rice with tender mutton, saffron and traditional spices',
        price: 550,
        category: 'Specials',
        image: '/api/placeholder/300/200',
        isVegetarian: false,
        isSpicy: true,
        rating: 4.7,
        preparationTime: 35
      }
    ];

    setTimeout(() => {
      setMenuItems(mockMenuItems);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesDietary = dietaryFilter === 'all' || 
                          (dietaryFilter === 'vegetarian' && item.isVegetarian) ||
                          (dietaryFilter === 'non-vegetarian' && !item.isVegetarian);
    
    return matchesSearch && matchesCategory && matchesDietary;
  });

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const stars = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={14} className="text-warning fill-current" />);
    }
    
    if (rating % 1 !== 0) {
      stars.push(<Star key="half" size={14} className="text-warning" style={{ opacity: 0.5 }} />);
    }
    
    return stars;
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading menu...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      {/* Header */}
      <Row className="mb-5">
        <Col>
          <div className="text-center">
            <h1 className="display-4 mb-3">Our Menu</h1>
            <p className="lead text-muted">Discover our exquisite culinary offerings</p>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={4} className="mb-3">
          <div className="position-relative">
            <Search className="position-absolute" size={20} style={{ left: '12px', top: '12px', color: '#6c757d' }} />
            <Form.Control
              type="text"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '45px' }}
            />
          </div>
        </Col>
        <Col md={4} className="mb-3">
          <Form.Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={4} className="mb-3">
          <Form.Select
            value={dietaryFilter}
            onChange={(e) => setDietaryFilter(e.target.value)}
          >
            <option value="all">All Items</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="non-vegetarian">Non-Vegetarian</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Menu Items */}
      <Row>
        {filteredItems.length === 0 ? (
          <Col>
            <Alert variant="info" className="text-center">
              No menu items found matching your criteria.
            </Alert>
          </Col>
        ) : (
          filteredItems.map(item => (
            <Col md={6} lg={4} key={item.id} className="mb-4">
              <Card className="h-100 shadow-sm border-0">
                <div className="position-relative">
                  <Card.Img 
                    variant="top" 
                    src={item.image} 
                    style={{ height: '200px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Menu+Item';
                    }}
                  />
                  <div className="position-absolute top-0 end-0 m-2">
                    {item.isVegetarian && (
                      <Badge bg="success" className="me-1">Veg</Badge>
                    )}
                    {item.isSpicy && (
                      <Badge bg="danger">Spicy</Badge>
                    )}
                  </div>
                  <Button
                    variant="light"
                    size="sm"
                    className="position-absolute top-0 start-0 m-2 rounded-circle"
                    style={{ width: '35px', height: '35px' }}
                  >
                    <Heart size={16} />
                  </Button>
                </div>
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="h5 mb-0">{item.name}</Card.Title>
                    <span className="fw-bold text-primary">₹{item.price}</span>
                  </div>
                  
                  <div className="d-flex align-items-center mb-2">
                    <div className="d-flex me-2">
                      {renderStars(item.rating)}
                    </div>
                    <small className="text-muted">({item.rating})</small>
                    <small className="text-muted ms-auto">{item.preparationTime} mins</small>
                  </div>
                  
                  <Card.Text className="text-muted small flex-grow-1">
                    {item.description}
                  </Card.Text>
                  
                  <div className="mt-auto">
                    <Button variant="primary" className="w-100">
                      Add to Cart
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Results count */}
      {filteredItems.length > 0 && (
        <Row className="mt-4">
          <Col>
            <p className="text-center text-muted">
              Showing {filteredItems.length} of {menuItems.length} items
            </p>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Menu;