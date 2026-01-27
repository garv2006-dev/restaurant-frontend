import React, { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import { useAccessibility } from '../../context/AccessibilityContext';

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}
const Layout: React.FC<LayoutProps> = ({ children, hideFooter = false }) => {
  const { announceToScreenReader } = useAccessibility();

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
    </div>
  );
};

export default Layout;
