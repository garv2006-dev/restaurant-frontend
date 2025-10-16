import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../services/api';

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isAvailable: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  preparationTime?: number;
  createdAt: string;
}

const MenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/menu');
      setMenuItems(data.data || data.items || []);
    } catch (error: any) {
      console.error('Error fetching menu items:', error);
      setError('Failed to load menu items. Please try again.');
    } finally {
      setLoading(false);
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
          <Button variant="primary" onClick={() => {
            // Add item functionality would go here
          }}>
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
            {menuItems
              .filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((item) => (
                <tr key={item._id}>
                  <td>{item.name}</td>
                  <td>
                    <Badge bg="secondary">{item.category}</Badge>
                  </td>
                  <td>₹{item.price}</td>
                  <td>
                    <Badge bg={item.isAvailable ? 'success' : 'danger'}>
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </td>
                  <td>
                    <div>
                      {item.isVegetarian && <Badge bg="success" className="me-1">Veg</Badge>}
                      {item.isVegan && <Badge bg="info" className="me-1">Vegan</Badge>}
                    </div>
                  </td>
                  <td>{item.preparationTime} min</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Button variant="outline-primary" size="sm" className="me-1" onClick={() => {
                      // Edit functionality would go here
                    }}>
                      <Edit size={14} />
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => {
                      if (window.confirm('Are you sure you want to delete this menu item?')) {
                        api.delete(`/admin/menu/${item._id}`)
                          .then(() => fetchMenuItems())
                          .catch((error: any) => {
                            console.error('Error deleting menu item:', error);
                            setError('Failed to delete menu item');
                          });
                      }
                    }}>
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default MenuManagement;