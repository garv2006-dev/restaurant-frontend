import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, Modal, Form, Row, Col } from 'react-bootstrap';
import { Search, Plus, Edit, Trash2, X, Save, Upload } from 'lucide-react';
import api, { menuAPI, adminAPI } from '../../services/api';
import ImageUploadModal from './ImageUploadModal';
import ImageGallery from './ImageGallery';

interface MenuItem {
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images?: Array<{ url: string; altText?: string; isPrimary?: boolean }>;
  availability?: {
    isAvailable: boolean;
  };
  dietaryInfo: {
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isSpicy: boolean;
  };
  preparationTime: number;
  servingSize: string;
  ingredients?: Array<{ name: string; quantity?: string; allergen?: boolean }>;
  allergens?: string[];
  createdAt?: string;
}

type MenuFormData = Omit<MenuItem, '_id' | 'createdAt'> & {
  availability: {
    isAvailable: boolean;
  };
  dietaryInfo: {
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isDairyFree: boolean;
    isSpicy: boolean;
  };
};

const MenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showImageUploadModal, setShowImageUploadModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<MenuItem | null>(null);
  const [itemForImageUpload, setItemForImageUpload] = useState<MenuItem | null>(null);

  const [formData, setFormData] = useState<MenuFormData>({
    name: '',
    description: '',
    price: 0,
    category: 'Main Course',
    images: [],
    availability: {
      isAvailable: true,
    },
    dietaryInfo: {
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      isSpicy: false,
    },
    preparationTime: 15,
    servingSize: '1 portion',
    ingredients: [],
    allergens: [],
  });

  const [categories] = useState<string[]>(['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Specials']);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setError('');
      const response: any = await menuAPI.getMenuItems();

      // Normalized handling:
      // - Preferred: { success, items: MenuItem[] }
      // - Legacy:   { success, data: MenuItem[] }
      // - Fallback: raw array
      let items: MenuItem[] = [];

      if (Array.isArray(response)) {
        items = response as MenuItem[];
      } else if (Array.isArray(response?.items)) {
        items = response.items as MenuItem[];
      } else if (Array.isArray(response?.data)) {
        items = response.data as MenuItem[];
      }

      setMenuItems(items);
    } catch (error: any) {
      setError('Failed to load menu items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      
      // Handle nested dietaryInfo checkboxes
      if (name.startsWith('dietaryInfo.')) {
        const field = name.split('.')[1] as keyof typeof formData.dietaryInfo;
        setFormData(prev => ({
          ...prev,
          dietaryInfo: {
            ...prev.dietaryInfo,
            [field]: checked
          }
        }));
      } 
      // Handle availability.isAvailable
      else if (name === 'availability.isAvailable') {
        setFormData(prev => ({
          ...prev,
          availability: {
            ...prev.availability,
            isAvailable: checked
          }
        }));
      }
      // Handle flat checkboxes
      else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }));
      }
    } else if (name === 'price' || name === 'preparationTime') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else if (name === 'ingredients') {
      const names = value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

      setFormData(prev => ({
        ...prev,
        // Backend expects an array of objects: { name, quantity?, allergen? }
        ingredients: names.map(name => ({ name })),
      }));
    } else if (name === 'allergens') {
      setFormData(prev => ({
        ...prev,
        allergens: value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
      }));
    } else if (name === 'image') {
      // Handle image URL input
      setFormData(prev => ({
        ...prev,
        images: [{ url: value, altText: '', isPrimary: true }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isEditing && currentItem?._id) {
        const response = await adminAPI.updateMenuItem(currentItem._id, formData);
        if (!response?.success) {
          throw new Error(response?.message || 'Failed to update menu item');
        }
      } else {
        const response = await adminAPI.createMenuItem(formData);
        if (!response?.success) {
          throw new Error(response?.message || 'Failed to create menu item');
        }

        // Reset form after successful create
        setFormData({
          name: '',
          description: '',
          price: 0,
          category: 'Main Course',
          images: [],
          availability: {
            isAvailable: true,
          },
          dietaryInfo: {
            isVegetarian: false,
            isVegan: false,
            isGlutenFree: false,
            isDairyFree: false,
            isSpicy: false,
          },
          preparationTime: 15,
          servingSize: '1 portion',
          ingredients: [],
          allergens: [],
        });
      }

      setShowModal(false);
      fetchMenuItems();
    } catch (error: any) {
      const backendMessage = error.response?.data?.message;
      setError(backendMessage || error.message || 'Failed to save menu item');
    }
  };

  const handleEdit = (item: MenuItem) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      images: item.images || [],
      availability: {
        isAvailable: item.availability?.isAvailable ?? true,
      },
      dietaryInfo: {
        isVegetarian: item.dietaryInfo?.isVegetarian ?? false,
        isVegan: item.dietaryInfo?.isVegan ?? false,
        isGlutenFree: item.dietaryInfo?.isGlutenFree ?? false,
        isDairyFree: item.dietaryInfo?.isDairyFree ?? false,
        isSpicy: item.dietaryInfo?.isSpicy ?? false,
      },
      preparationTime: item.preparationTime,
      servingSize: item.servingSize,
      ingredients: item.ingredients || [],
      allergens: item.allergens || [],
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: 'Main Course',
      images: [],
      availability: {
        isAvailable: true,
      },
      dietaryInfo: {
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: false,
        isSpicy: false,
      },
      preparationTime: 15,
      servingSize: '1 portion',
      ingredients: [],
      allergens: [],
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await adminAPI.deleteMenuItem(id);
        fetchMenuItems();
      } catch (error) {
        setError('Failed to delete menu item');
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">Menu Management</h5>
        </Card.Header>
        <Card.Body>
          <div className="text-center py-4">
            <Spinner animation="border" />
            <p className="mt-2">Loading menu items...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Menu Management</h5>
        <div className="d-flex gap-2">
          <div className="position-relative">
            <Search size={16} className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" />
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="primary" onClick={handleAddNew}>
            <Plus size={16} className="me-1" />
            Add Item
          </Button>
        </div>
      </Card.Header>

      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Table responsive hover>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Type</th>
              <th>Prep Time</th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No menu items found. Use the "Add Item" button to create a new menu entry.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>
                    <Badge bg="secondary">{item.category}</Badge>
                  </td>
                  <td>₹{item.price}</td>
                  <td>
                    <Badge bg={item.availability?.isAvailable ? 'success' : 'danger'}>
                      {item.availability?.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </td>
                  <td>
                    <div>
                      {item.dietaryInfo?.isVegetarian && <Badge bg="success" className="me-1">Veg</Badge>}
                      {item.dietaryInfo?.isVegan && <Badge bg="info" className="me-1">Vegan</Badge>}
                    </div>
                  </td>
                  <td>{item.preparationTime} min</td>
                  <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</td>

                  {/* FIXED DELETE BUTTON */}
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => handleEdit(item)}>
                      <Edit size={14} />
                    </Button>

                    <Button
                      variant="outline-success"
                      size="sm"
                      className="me-1"
                      onClick={() => {
                        setItemForImageUpload(item);
                        setShowImageUploadModal(true);
                      }}
                      title="Upload image">
                      <Upload size={14} />
                    </Button>

                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(item._id!)}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card.Body>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Edit Menu Item' : 'Add New Menu Item'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="formName">
                  <Form.Label>Item Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formCategory">
                  <Form.Label>Category *</Form.Label>
                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formPrice">
                  <Form.Label>Price (₹) *</Form.Label>
                  <Form.Control
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formPrepTime">
                  <Form.Label>Preparation Time *</Form.Label>
                  <Form.Control
                    type="number"
                    name="preparationTime"
                    value={formData.preparationTime}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group controlId="formServingSize">
                  <Form.Label>Serving Size</Form.Label>
                  <Form.Control
                    type="text"
                    name="servingSize"
                    value={formData.servingSize}
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
                    value={formData.images?.[0]?.url || ''}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group controlId="formDescription">
                  <Form.Label>Description *</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    required
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group controlId="formIngredients">
                  <Form.Label>Ingredients</Form.Label>
                  <Form.Control
                    type="text"
                    name="ingredients"
                    value={formData.ingredients?.map(ing => ing.name).join(', ') || ''}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group controlId="formAllergens">
                  <Form.Label>Allergens</Form.Label>
                  <Form.Control
                    type="text"
                    name="allergens"
                    value={formData.allergens?.join(', ') || ''}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <div className="d-flex flex-wrap gap-3">
                  <Form.Check type="checkbox" label="Available" name="availability.isAvailable" checked={formData.availability?.isAvailable || false} onChange={handleInputChange} />
                  <Form.Check type="checkbox" label="Vegetarian" name="dietaryInfo.isVegetarian" checked={formData.dietaryInfo?.isVegetarian || false} onChange={handleInputChange} />
                  <Form.Check type="checkbox" label="Vegan" name="dietaryInfo.isVegan" checked={formData.dietaryInfo?.isVegan || false} onChange={handleInputChange} />
                  <Form.Check type="checkbox" label="Gluten Free" name="dietaryInfo.isGlutenFree" checked={formData.dietaryInfo?.isGlutenFree || false} onChange={handleInputChange} />
                  <Form.Check type="checkbox" label="Dairy Free" name="dietaryInfo.isDairyFree" checked={formData.dietaryInfo?.isDairyFree || false} onChange={handleInputChange} />
                  <Form.Check type="checkbox" label="Spicy" name="dietaryInfo.isSpicy" checked={formData.dietaryInfo?.isSpicy || false} onChange={handleInputChange} />
                </div>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              <X size={18} className="me-1" /> Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Save size={18} className="me-1" /> {isEditing ? 'Update' : 'Save'} Item
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Image Upload Modal */}
      {itemForImageUpload && (
        <ImageUploadModal
          show={showImageUploadModal}
          onHide={() => {
            setShowImageUploadModal(false);
            setItemForImageUpload(null);
          }}
          type="menu"
          itemId={itemForImageUpload._id!}
          itemName={itemForImageUpload.name}
          onUploadSuccess={() => {
            fetchMenuItems();
            setShowImageUploadModal(false);
            setItemForImageUpload(null);
          }}
          maxFiles={1}
        />
      )}
    </Card>
  );
};

export default MenuManagement;
