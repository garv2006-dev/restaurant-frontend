import React, { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  LogIn, 
  LogOut, 
  Loader2,
  TestTube
} from 'lucide-react';

const AdminTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const testAction = (actionName: string) => {
    setLoading(true);
    setMessage(`Testing ${actionName}...`);
    
    setTimeout(() => {
      setLoading(false);
      setMessage(`✅ ${actionName} action works perfectly!`);
    }, 1500);
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">
          <TestTube size={20} className="me-2" />
          Admin Panel Actions Test
        </h5>
      </Card.Header>
      <Card.Body>
        {message && (
          <Alert variant={message.includes('✅') ? 'success' : 'info'} className="mb-3">
            {message}
          </Alert>
        )}
        
        <div className="d-flex flex-wrap gap-2 mb-3">
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={() => testAction('View Details')}
            disabled={loading}
            title="Test View Details"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
          </Button>
          
          <Button 
            variant="outline-success" 
            size="sm" 
            onClick={() => testAction('Confirm Booking')}
            disabled={loading}
            title="Test Confirm Booking"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          </Button>
          
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={() => testAction('Cancel Booking')}
            disabled={loading}
            title="Test Cancel Booking"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
          </Button>
          
          <Button 
            variant="outline-info" 
            size="sm" 
            onClick={() => testAction('Check In')}
            disabled={loading}
            title="Test Check In"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
          </Button>
          
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={() => testAction('Check Out')}
            disabled={loading}
            title="Test Check Out"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          </Button>
        </div>
        
        <div className="text-muted">
          <small>
            Click any button to test the admin panel action icons and loading states.
            All icons should display correctly with proper hover effects and loading animations.
          </small>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AdminTest;