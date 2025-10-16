import React, { useState } from 'react';
import {
  Modal,
  Button,
  Form,
  Card,
  Badge,
  Alert,
  Row,
  Col
} from 'react-bootstrap';
import { Settings, Eye, EyeOff, Type, Zap, Focus } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

interface AccessibilitySettingsModalProps {
  show: boolean;
  onHide: () => void;
}

const AccessibilitySettingsModal: React.FC<AccessibilitySettingsModalProps> = ({
  show,
  onHide
}) => {
  const { settings, updateSetting, resetSettings, announceToScreenReader } = useAccessibility();
  const [testAnnouncement, setTestAnnouncement] = useState('');

  const handleToggle = (key: keyof typeof settings) => {
    const newValue = !settings[key];
    updateSetting(key, newValue);
    announceToScreenReader(`${String(key)} ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleFontSizeChange = (value: number) => {
    updateSetting('fontSize', value);
    announceToScreenReader(`Font size set to ${value}`);
  };

  const handleReset = () => {
    resetSettings();
    announceToScreenReader('Accessibility settings reset to default');
  };

  const testScreenReader = () => {
    if (testAnnouncement.trim()) {
      announceToScreenReader(testAnnouncement);
      setTestAnnouncement('');
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg"
      aria-labelledby="accessibility-settings-title"
      aria-describedby="accessibility-settings-description"
    >
      <Modal.Header closeButton>
        <Modal.Title id="accessibility-settings-title">
          <Settings className="me-2" size={20} />
          Accessibility Settings
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <p id="accessibility-settings-description" className="text-muted mb-4">
          Customize your experience with these accessibility options. Changes are saved automatically.
        </p>

        <Row>
          <Col md={6}>
            <Card className="h-100">
              <Card.Header>
                <h6 className="mb-0">
                  <Eye size={16} className="me-2" />
                  Visual Settings
                </h6>
              </Card.Header>
              <Card.Body>
                {/* High Contrast */}
                <div className="mb-3">
                  <Form.Check
                    type="switch"
                    id="high-contrast-switch"
                    label={
                      <span>
                        High Contrast Mode
                        {settings.highContrast && (
                          <Badge bg="primary" className="ms-2">ON</Badge>
                        )}
                      </span>
                    }
                    checked={settings.highContrast}
                    onChange={() => handleToggle('highContrast')}
                    aria-describedby="high-contrast-help"
                  />
                  <Form.Text id="high-contrast-help" className="text-muted">
                    Increases contrast for better visibility
                  </Form.Text>
                </div>

                {/* Font Size */}
                <div className="mb-3">
                  <Form.Label htmlFor="font-size-range" className="mb-1">
                    <span>
                      <Type size={16} className="me-1" />
                      Base Font Size: <Badge bg="secondary" className="ms-1">{settings.fontSize}px</Badge>
                    </span>
                  </Form.Label>
                  <Form.Range
                    id="font-size-range"
                    min={12}
                    max={22}
                    step={1}
                    value={settings.fontSize}
                    onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                    aria-describedby="font-size-help"
                  />
                  <Form.Text id="font-size-help" className="text-muted">
                    Adjusts the base font size across the application
                  </Form.Text>
                </div>

                {/* Focus Indicators */}
                <div className="mb-3">
                  <Form.Check
                    type="switch"
                    id="focus-indicators-switch"
                    label={
                      <span>
                        <Focus size={16} className="me-1" />
                        Enhanced Focus Indicators
                        {settings.focusVisible && (
                          <Badge bg="primary" className="ms-2">ON</Badge>
                        )}
                      </span>
                    }
                    checked={settings.focusVisible}
                    onChange={() => handleToggle('focusVisible')}
                    aria-describedby="focus-indicators-help"
                  />
                  <Form.Text id="focus-indicators-help" className="text-muted">
                    Makes keyboard focus more visible
                  </Form.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="h-100">
              <Card.Header>
                <h6 className="mb-0">
                  <Zap size={16} className="me-2" />
                  Motion & Interaction
                </h6>
              </Card.Header>
              <Card.Body>
                {/* Reduce Motion */}
                <div className="mb-3">
                  <Form.Check
                    type="switch"
                    id="reduced-motion-switch"
                    label={
                      <span>
                        Reduce Motion
                        {settings.reduceMotion && (
                          <Badge bg="primary" className="ms-2">ON</Badge>
                        )}
                      </span>
                    }
                    checked={settings.reduceMotion}
                    onChange={() => handleToggle('reduceMotion')}
                    aria-describedby="reduced-motion-help"
                  />
                  <Form.Text id="reduced-motion-help" className="text-muted">
                    Reduces animations and transitions
                  </Form.Text>
                </div>

                {/* Screen Reader Mode */}
                <div className="mb-3">
                  <Form.Check
                    type="switch"
                    id="screen-reader-switch"
                    label={
                      <span>
                        <EyeOff size={16} className="me-1" />
                        Screen Reader Optimizations
                        {settings.screenReaderSupport && (
                          <Badge bg="primary" className="ms-2">ON</Badge>
                        )}
                      </span>
                    }
                    checked={settings.screenReaderSupport}
                    onChange={() => handleToggle('screenReaderSupport')}
                    aria-describedby="screen-reader-help"
                  />
                  <Form.Text id="screen-reader-help" className="text-muted">
                    Optimizes interface for screen readers
                  </Form.Text>
                </div>

                {/* Screen Reader Test */}
                {settings.screenReaderSupport && (
                  <div className="mt-4">
                    <Form.Label htmlFor="test-announcement">
                      Test Screen Reader Announcement
                    </Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Control
                        id="test-announcement"
                        type="text"
                        placeholder="Enter test message..."
                        value={testAnnouncement}
                        onChange={(e) => setTestAnnouncement(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            testScreenReader();
                          }
                        }}
                      />
                      <Button 
                        variant="outline-primary" 
                        onClick={testScreenReader}
                        disabled={!testAnnouncement.trim()}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Active Settings Summary */}
        <Alert variant="info" className="mt-4">
          <h6>Active Accessibility Features:</h6>
          <div className="d-flex flex-wrap gap-2 mt-2">
            {Object.entries(settings).map(([key, value]) => {
              if (value) {
                return (
                  <Badge key={key} bg="primary">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Badge>
                );
              }
              return null;
            })}
            {Object.values(settings).every(v => !v) && (
              <span className="text-muted">No accessibility features currently enabled</span>
            )}
          </div>
        </Alert>

        {/* Keyboard Shortcuts Info */}
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Keyboard Shortcuts</h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <ul className="list-unstyled mb-0">
                  <li><kbd>Tab</kbd> - Navigate forward</li>
                  <li><kbd>Shift + Tab</kbd> - Navigate backward</li>
                  <li><kbd>Enter</kbd> - Activate button/link</li>
                  <li><kbd>Space</kbd> - Activate button/checkbox</li>
                </ul>
              </Col>
              <Col md={6}>
                <ul className="list-unstyled mb-0">
                  <li><kbd>Esc</kbd> - Close modal/dropdown</li>
                  <li><kbd>Arrow Keys</kbd> - Navigate menu items</li>
                  <li><kbd>Alt + A</kbd> - Open accessibility settings</li>
                  <li><kbd>Alt + S</kbd> - Skip to main content</li>
                </ul>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleReset}>
          Reset to Default
        </Button>
        <Button variant="primary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AccessibilitySettingsModal;