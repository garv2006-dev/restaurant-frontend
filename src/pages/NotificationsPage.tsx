import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Button, Nav, Tab, Row, Col, Dropdown, Spinner, Alert } from 'react-bootstrap';
import { Bell, Check, CheckCircle, Clock, Calendar, Star, MessageSquare, ShoppingBag, ChevronDown } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import '../styles/notifications-responsive.css';

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    error, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications,
    getNotificationCount,
    getUnreadCountByType
  } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('all');

  // Fetch notifications based on active tab
  useEffect(() => {
    if (activeTab === 'all') {
      fetchNotifications();
    } else if (activeTab === 'unread') {
      fetchNotifications(undefined, false);
    } else {
      fetchNotifications(activeTab === 'booking' ? 'room_booking' : activeTab);
    }
  }, [activeTab]);

  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notif.read;
    if (activeTab === 'booking') return notif.type === 'room_booking';
    if (activeTab === 'promotion') return notif.type === 'promotion';
    return false;
  });

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'room_booking': return 'primary';
      case 'promotion': return 'warning';
      case 'system': return 'secondary';
      case 'payment': return 'success';
      default: return 'primary';
    }
  };

  const getTabLabel = (tabKey: string) => {
    switch (tabKey) {
      case 'all': return 'All';
      case 'unread': return 'Unread';
      case 'booking': return 'Room Bookings';
      case 'promotion': return 'Promotions';
      default: return tabKey;
    }
  };

  const getTabCount = (tabKey: string) => {
    switch (tabKey) {
      case 'all': return getNotificationCount(); // All notifications
      case 'unread': return unreadCount; // All unread notifications
      case 'booking': return getNotificationCount('room_booking'); // All room booking notifications
      case 'promotion': return getNotificationCount('promotion'); // All promotion notifications
      default: return 0;
    }
  };

  const getTabBadgeVariant = (tabKey: string) => {
    switch (tabKey) {
      case 'all': return 'secondary';
      case 'unread': return 'danger';
      case 'booking':
      case 'promotion': return 'light';
      default: return 'secondary';
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-page">
        <Container fluid>
          <div className="text-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading notifications...</span>
            </Spinner>
            <p className="mt-3">Loading your notifications...</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <Container fluid>
        {error && (
          <Alert variant="danger" dismissible onClose={() => window.location.reload()}>
            <Alert.Heading>Error</Alert.Heading>
            <p>{error}</p>
          </Alert>
        )}
        
        <div className="notifications-header">
          <div className="notifications-title">
            <h2>Notifications</h2>
            <p>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          <div className="notifications-actions">
            {unreadCount > 0 && (
              <Button variant="outline-primary" onClick={markAllAsRead}>
                <Check size={16} className="me-1" />
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline-danger" onClick={clearAllNotifications}>
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown */}
          <div className="notifications-dropdown d-lg-none">
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" className="dropdown-toggle">
                <span>{getTabLabel(activeTab)}</span>
                <ChevronDown size={16} />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {['all', 'unread', 'booking', 'promotion'].map((tabKey) => (
                  <Dropdown.Item
                    key={tabKey}
                    active={activeTab === tabKey}
                    onClick={() => {
                      setActiveTab(tabKey);
                    }}
                  >
                    <span>{getTabLabel(tabKey)}</span>
                    <Badge bg={getTabBadgeVariant(tabKey)} text={tabKey === 'booking' || tabKey === 'promotion' ? 'dark' : undefined}>
                      {getTabCount(tabKey)}
                    </Badge>
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>

          <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'all')}>

          {/* Desktop Tabs */}
          <Nav variant="pills" className="notifications-tabs d-none d-lg-flex">
            <Nav.Item>
              <Nav.Link eventKey="all">
                All
                <Badge bg="secondary">{getNotificationCount()}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="unread">
                Unread
                <Badge bg="danger">{unreadCount}</Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="booking">
                Room Bookings
                <Badge bg="light" text="dark">
                  {getNotificationCount('room_booking')}
                </Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="promotion">
                Promotions
                <Badge bg="light" text="dark">
                  {getNotificationCount('promotion')}
                </Badge>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey={activeTab}>
              {filteredNotifications.length === 0 ? (
                <div className="notifications-empty">
                  <div className="icon">
                    <Bell size={48} />
                  </div>
                  <h5>No notifications</h5>
                  <p>
                    {activeTab === 'unread' 
                      ? "You don't have any unread notifications." 
                      : `No ${getTabLabel(activeTab).toLowerCase()} notifications found.`}
                  </p>
                </div>
              ) : (
                <div className="notifications-container">
                  {filteredNotifications.map((notification) => (
                    <Card 
                      key={notification.id} 
                      className={`notification-card ${!notification.read ? 'unread' : ''}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Card.Body>
                        <div className="notification-content">
                          <div className="notification-icon">
                            {notification.icon}
                          </div>
                          <div className="notification-details">
                            <div className="notification-header">
                              <div className="notification-title">
                                <h6>
                                  {notification.title}
                                  {!notification.read && (
                                    <Badge bg="primary" pill>New</Badge>
                                  )}
                                </h6>
                                <Badge bg={getTypeColor(notification.type)}>
                                  {notification.type === 'room_booking' ? 'Room Booking' : 
                                   notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                                </Badge>
                              </div>
                              <div className="notification-meta">
                                <div className="notification-time">
                                  {formatTimestamp(notification.timestamp)}
                                </div>
                                <Button
                                  variant="link"
                                  className="notification-delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(notification.id);
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <p className="notification-message">{notification.message}</p>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Container>
    </div>
  );
};

export default NotificationsPage;
