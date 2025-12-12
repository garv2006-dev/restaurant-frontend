import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, Spinner, Alert, Modal } from 'react-bootstrap';
import { Star, Search, Plus, X, Save, Heart } from 'lucide-react';
import { menuAPI } from '../services/api';
import { useCart } from '../context/CartContext';

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
  isAvailable?: boolean;
  dietaryInfo?: {
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isKeto: boolean;
    isSpicy: boolean;
    spiceLevel: number;
  };
  ingredients?: string[];
  allergens?: string[];
  servingSize?: string;
  isSignatureDish?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
}

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { addItem } = useCart();

  const [newItem, setNewItem] = useState<Omit<MenuItem, 'id' | 'rating'>>({
    name: '',
    description: '',
    price: 0,
    category: 'Main Course',
    image: '',
    isVegetarian: false,
    isSpicy: false,
    preparationTime: 15,
    isAvailable: true,
    dietaryInfo: {
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      isKeto: false,
      isSpicy: false,
      spiceLevel: 0,
    },
    ingredients: [],
    allergens: [],
    servingSize: '1 portion',
    isSignatureDish: false,
    isFeatured: false,
    isActive: true,
  });

  const categories = ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Specials'];
  const allCategories = ['all', ...categories];

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        setError('');

        const response: any = await menuAPI.getMenuItems();
        console.log("response>>>>>>>>>", response)

        // Backend shape:
        //   { success: true, items: MenuItem[] }
        // Fallbacks:
        //   { success, data: MenuItem[] } or raw array
        let rawItems: any[] = [];

        if (Array.isArray(response)) {
          rawItems = response;
        } else if (Array.isArray(response?.items)) {
          rawItems = response.items;
        } else if (Array.isArray(response?.data)) {
          rawItems = response.data;
        }

        const normalized: MenuItem[] = rawItems.map((item: any) => ({
          id: item.id || item._id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image:
            item.image ||
            (Array.isArray(item.images) && item.images.length > 0
              ? item.images[0].url
              : ''),
          isVegetarian:
            item.isVegetarian ?? item.dietaryInfo?.isVegetarian ?? false,
          isSpicy: item.isSpicy ?? item.dietaryInfo?.isSpicy ?? false,
          rating: item.popularity?.averageRating ?? item.rating ?? 0,
          preparationTime: item.preparationTime ?? 0,
          isAvailable: item.availability?.isAvailable ?? item.isAvailable ?? true,
          dietaryInfo: item.dietaryInfo,
          ingredients: Array.isArray(item.ingredients)
            ? item.ingredients.map((ing: any) => (typeof ing === 'string' ? ing : ing.name))
            : [],
          allergens: item.allergens || [],
          servingSize: item.servingSize,
          isSignatureDish: item.isSignatureDish,
          isFeatured: item.isFeatured,
          isActive: item.isActive,
        }));

        setMenuItems(normalized);
      } catch (err: any) {
        setError('Failed to load menu. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const filteredItems = menuItems.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    const matchesDietary =
      dietaryFilter === 'all' ||
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

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      category: item.category,
    });
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (name.startsWith('dietaryInfo.')) {
      const field = name.split('.')[1];
      setNewItem(prev => ({
        ...prev,
        dietaryInfo: {
          ...prev.dietaryInfo!,
          [field]: type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : value
        }
      }));
    } else if (type === 'checkbox') {
      setNewItem(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'price' || name === 'preparationTime') {
      setNewItem(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setNewItem(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();

    const newId = (menuItems.length + 1).toString();

    const newMenuItem: MenuItem = {
      ...newItem,
      id: newId,
      rating: 0,
    };

    setMenuItems(prev => [...prev, newMenuItem]);

    setNewItem({
      name: '',
      description: '',
      price: 0,
      category: 'Main Course',
      image: '',
      isVegetarian: false,
      isSpicy: false,
      preparationTime: 15,
      isAvailable: true,
      dietaryInfo: {
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isKeto: false,
        isSpicy: false,
        spiceLevel: 0,
      },
      ingredients: [],
      allergens: [],
      servingSize: '1 portion',
      isSignatureDish: false,
      isFeatured: false,
      isActive: true,
    });

    setShowAddModal(false);
  };

  return (
    <Container className="py-5">

      {/* Add Item Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Menu Item</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleAddItem}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="formName">
                  <Form.Label>Item Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={newItem.name}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formCategory">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    name="category"
                    value={newItem.category}
                    onChange={handleInputChange}
                  >
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formPrice">
                  <Form.Label>Price (₹)</Form.Label>
                  <Form.Control
                    type="number"
                    name="price"
                    value={newItem.price}
                    onChange={handleInputChange}
                    min="0"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formPrepTime">
                  <Form.Label>Preparation Time (minutes)</Form.Label>
                  <Form.Control
                    type="number"
                    name="preparationTime"
                    value={newItem.preparationTime}
                    onChange={handleInputChange}
                    min="1"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group controlId="formDescription">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    value={newItem.description}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formImage">
                  <Form.Label>Image URL</Form.Label>
                  <Form.Control
                    type="url"
                    name="image"
                    value={newItem.image}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formServing">
                  <Form.Label>Serving Size</Form.Label>
                  <Form.Control
                    type="text"
                    name="servingSize"
                    value={newItem.servingSize}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <div className="d-flex gap-3 flex-wrap">
                  <Form.Check
                    type="checkbox"
                    label="Vegetarian"
                    name="isVegetarian"
                    checked={newItem.isVegetarian}
                    onChange={handleInputChange}
                  />

                  <Form.Check
                    type="checkbox"
                    label="Spicy"
                    name="isSpicy"
                    checked={newItem.isSpicy}
                    onChange={handleInputChange}
                  />

                  <Form.Check
                    type="checkbox"
                    label="Featured"
                    name="isFeatured"
                    checked={newItem.isFeatured}
                    onChange={handleInputChange}
                  />

                  <Form.Check
                    type="checkbox"
                    label="Signature Dish"
                    name="isSignatureDish"
                    checked={newItem.isSignatureDish}
                    onChange={handleInputChange}
                  />
                </div>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              <X size={18} /> Cancel
            </Button>

            <Button variant="primary" type="submit">
              <Save size={18} /> Save Item
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Header */}
      <Row className="mb-5">
        <Col>
          <div className="d-flex justify-content-between">
            <div>
              <h1 className="display-4">Our Menu</h1>
              <p className="text-muted">Discover our exquisite culinary offerings</p>
            </div>

            {isAdmin && (
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                <Plus /> Add New Item
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={4}>
          <div className="position-relative">
            <Search className="position-absolute" size={20} style={{ left: 12, top: 12 }} />
            <Form.Control
              type="text"
              placeholder="Search..."
              style={{ paddingLeft: 45 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </Col>

        <Col md={4}>
          <Form.Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            {allCategories.map(c => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col md={4}>
          <Form.Select value={dietaryFilter} onChange={e => setDietaryFilter(e.target.value)}>
            <option value="all">All Items</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="non-vegetarian">Non-Vegetarian</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Items */}
      <Row>
        {filteredItems.length === 0 ? (
          <Col>
            <Alert variant="info" className="text-center">
              No menu items found.
            </Alert>
          </Col>
        ) : (
          filteredItems.map(item => (
            <Col md={6} lg={4} key={item.id} className="mb-4">
              <Card className="h-100 shadow-sm">
                <div className="position-relative">
                  <Card.Img
                    variant="top"
                    src={item.image}
                    style={{ height: 200, objectFit: 'cover' }}
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://via.placeholder.com/300x200?text=Menu+Item';
                    }}
                  />

                  <div className="position-absolute top-0 end-0 m-2">
                    {item.isVegetarian && <Badge bg="success">Veg</Badge>}
                    {item.isSpicy && <Badge bg="danger">Spicy</Badge>}
                  </div>

                  <Button
                    variant="light"
                    className="position-absolute top-0 start-0 m-2 rounded-circle"
                    style={{ width: 35, height: 35 }}
                  >
                    <Heart size={16} />
                  </Button>
                </div>

                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between">
                    <Card.Title>{item.name}</Card.Title>
                    <strong className="text-primary">₹{item.price}</strong>
                  </div>

                  <div className="d-flex align-items-center mb-2">
                    <div className="d-flex me-2">{renderStars(item.rating)}</div>
                    <small className="text-muted">({item.rating})</small>
                    <small className="text-muted ms-auto">{item.preparationTime} mins</small>
                  </div>

                  <Card.Text className="text-muted small flex-grow-1">{item.description}</Card.Text>

                  <Button
                    variant="primary"
                    className="w-100 mt-auto"
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.isAvailable}
                  >
                    {item.isAvailable ? 'Add to Cart' : 'Unavailable'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

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
