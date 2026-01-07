import React from 'react';
import { Container } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const PrivacyPolicy: React.FC = () => {
  const { theme } = useTheme();
  return (
    <>
      
      <Container className="py-5">
        <div className="max-content mx-auto">
          <h1 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-4`}>Privacy Policy</h1>
          
          <div className={theme === 'dark' ? 'text-light' : 'text-dark'}>
            <p className="mb-4">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>1. Information We Collect</h2>
              <p className="mb-3">
                We collect information you provide directly to us, such as when you:
              </p>
              <ul className="mb-3">
                <li>Make a reservation or booking</li>
                <li>Create an account on our website</li>
                <li>Contact us for customer support</li>
                <li>Subscribe to our newsletter</li>
                <li>Participate in promotions or surveys</li>
              </ul>
              <p>
                This information may include your name, email address, phone number, payment information, and preferences.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Process your bookings and reservations</li>
                <li>Provide customer service and support</li>
                <li>Send you transactional emails and confirmations</li>
                <li>Personalize your experience</li>
                <li>Improve our services and website</li>
                <li>Send marketing communications (with your consent)</li>
              </ul>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>3. Information Sharing</h2>
              <p className="mb-3">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:
              </p>
              <ul>
                <li>To trusted service providers who assist us in operating our business</li>
                <li>When required by law or to protect our rights</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>4. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your personal information</li>
                <li>Object to processing of your information</li>
                <li>Request data portability</li>
              </ul>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>6. Cookies</h2>
              <p>
                We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>7. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p>
                <strong>Email:</strong> privacy@luxuryhotel.com<br />
                <strong>Phone:</strong> +1 (555) 123-4567<br />
                <strong>Address:</strong> 123 Luxury Street, City, State 12345
              </p>
            </section>
          </div>
        </div>
      </Container>

      <style>{`
        .max-content {
          max-width: 800px;
        }
        
        .text-light {
          color: #e9ecef !important;
        }
        
        .text-dark {
          color: #212529 !important;
        }
        
        .text-light p,
        .text-light li,
        .text-dark p,
        .text-dark li {
          line-height: 1.6;
        }
        
        .text-light strong {
          color: #f8f9fa !important;
        }
        
        .text-dark strong {
          color: #212529 !important;
        }
        
        .text-gold {
          color: #f39c12 !important;
        }
        
        .text-primary {
          color: #0d6efd !important;
        }
        
        section {
          margin-bottom: 2rem;
        }
      `}</style>
    </>
  );
};

export default PrivacyPolicy;
