import React, { ReactNode, useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { Settings } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import AccessibilitySettingsModal from '../accessibility/AccessibilitySettingsModal';
import { useAccessibility } from '../../context/AccessibilityContext';

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}
const Layout: React.FC<LayoutProps> = ({ children, hideFooter = false }) => {
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const { announceToScreenReader } = useAccessibility();

  const openAccessibilitySettings = () => {
    setShowAccessibilityModal(true);
    announceToScreenReader('Accessibility settings opened');
  };

  // Global keyboard shortcut for Alt + A
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'a') {
        event.preventDefault();
        openAccessibilitySettings();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openAccessibilitySettings]);

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Skip navigation link for screen readers */}
      <a 
        href="#main-content" 
        className="skip-nav"
        onFocus={() => announceToScreenReader('Skip to main content link focused')}
      >
        Skip to main content
      </a>
      
      <Header />
      
      <main 
        id="main-content"
        className="flex-grow-1 main-content-mobile" 
        style={{ paddingTop: '80px' }}
        tabIndex={-1}
      >
        {children}
      </main>
      
      {!hideFooter && <Footer />}
      
      {/* Floating Accessibility Button */}
      <Button
        variant="primary"
        className="position-fixed rounded-circle d-flex align-items-center justify-content-center no-print accessibility-button"
        style={{
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          zIndex: 1030,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
        onClick={openAccessibilitySettings}
        aria-label="Open accessibility settings"
        title="Accessibility Settings (Alt + A)"
        onKeyDown={(e) => {
          if (e.altKey && e.key === 'a') {
            e.preventDefault();
            openAccessibilitySettings();
          }
        }}
      >
        <Settings size={24} aria-hidden="true" />
      </Button>
      
      {/* Accessibility Settings Modal */}
      <AccessibilitySettingsModal 
        show={showAccessibilityModal}
        onHide={() => {
          setShowAccessibilityModal(false);
          announceToScreenReader('Accessibility settings closed');
        }}
      />
    </div>
  );
};

export default Layout;