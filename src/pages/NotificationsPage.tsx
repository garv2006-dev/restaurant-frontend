import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Button, Nav, Tab, Dropdown, Spinner, Alert } from 'react-bootstrap';
import { Bell, Check, ChevronDown, Trash2, Copy } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import VolumeControl from '../components/notifications/VolumeControl';
import { toast } from 'react-toastify';
import '../styles/notifications-responsive.css';
import '../styles/notifications-page-promo.css';
import '../styles/notifications-copy-btn.css';

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
    getNotificationCount
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Extract promo code from notification message
  const extractPromoCode = (message: string): string | null => {
    // Match patterns like "code J6EY8QN1" or "code: J6EY8QN1" (case insensitive)
    const codeMatch = message.match(/code[:\s]+([A-Z0-9]{6,12})/i);
    const result = codeMatch ? codeMatch[1] : null;
    console.log('Extracting promo code from:', message, '-> Result:', result);
    return result;
  };

  // Handle copying promo code to clipboard
  const handleCopyPromoCode = async (code: string, notificationId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes(prev => new Set(prev).add(notificationId));
      toast.success('Promo code copied to clipboard!', {
        position: 'top-right',
        autoClose: 2000,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedCodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy promo code:', error);
      toast.error('Failed to copy code. Please try again.', {
        position: 'top-right',
        autoClose: 2000,
      });
    }
  };

  // Fetch notifications based on active tab
  useEffect(() => {
    if (activeTab === 'all') {
      fetchNotifications();
    } else if (activeTab === 'unread') {
      fetchNotifications(undefined, false);
    } else {
      fetchNotifications(activeTab === 'booking' ? 'room_booking' : activeTab);
    }
  }, [activeTab, fetchNotifications]);

  const filteredNotifications = notifications.filter(notif => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notif.read;
    if (activeTab === 'booking') return notif.type === 'room_booking';
    if (activeTab === 'promotion') return notif.type === 'promotion';
    return false;
  });

  const formatTimestamp = (date: Date | string) => {
    // Handle both Date objects and string timestamps
    const timestamp = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - timestamp.getTime()) / 1000));

    // Less than 1 minute
    if (diffInSeconds < 60) {
      return `${Math.max(1, diffInSeconds)}s`;
    }

    // Less than 1 hour
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    }

    // Less than 24 hours
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    }

    // Less than 7 days
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d`;
    }

    // Default date format
    return timestamp.toLocaleDateString();
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
            <VolumeControl size="sm" />
            {unreadCount > 0 && (
              <Button variant="outline-primary" onClick={markAllAsRead}>
                <Check size={16} className="me-1" />

              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline-danger" onClick={clearAllNotifications}>
                <Trash2 size={16} className="me-1" />

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
                  {filteredNotifications.map((notification) => {
                    const isExpanded = expandedNotifications.has(notification.id);
                    const isLongMessage = notification.message.length > 80;

                    return (
                      <Card
                        key={notification.id}
                        className={`notification-card ${!notification.read ? 'unread' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}
                      >
                        <Card.Body>
                          <div className="notification-content">
                            <div className="notification-details">
                              <div className="notification-header">
                                <div className="notification-title">
                                  <h6>
                                    {notification.title}
                                    {!notification.read && (
                                      <Badge bg="primary" pill>New</Badge>
                                    )}
                                  </h6>
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
                                    aria-label="Delete notification"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              </div>
                              <div
                                className="notification-message-wrapper"
                                onClick={() => {
                                  markAsRead(notification.id);
                                  if (isLongMessage) {
                                    toggleExpanded(notification.id);
                                  }
                                }}
                                style={{ cursor: isLongMessage ? 'pointer' : 'default' }}
                              >
                                <p className={`notification-message ${isExpanded ? 'expanded' : 'collapsed'}`}>
                                  {notification.message}
                                </p>
                                {!isExpanded && isLongMessage && (
                                  <span className="notification-expand-hint d-lg-none">Click to read more...</span>
                                )}
                              </div>

                              {/* Promo Code Copy Section - Bottom of card */}
                              {(notification.type === 'promotion' || extractPromoCode(notification.message)) && extractPromoCode(notification.message) && (
                                <div className="notification-footer mt-2 d-flex justify-content-end">
                                  <button
                                    className="notification-copy-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyPromoCode(
                                        extractPromoCode(notification.message)!,
                                        notification.id
                                      );
                                    }}
                                    title={copiedCodes.has(notification.id) ? "Copied!" : "Copy promo code"}
                                  >
                                    <span className="me-2 text-muted small">Copy Code:</span>
                                    <span className="code-display me-2 fw-bold">{extractPromoCode(notification.message)}</span>
                                    {copiedCodes.has(notification.id) ? (
                                      <Check size={16} className="text-success" />
                                    ) : (
                                      <Copy size={16} />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  })}
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
