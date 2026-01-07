import React from 'react';
import { Container } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const TermsConditions: React.FC = () => {
  const { theme } = useTheme();
  return (
    <>
      
      <Container className="py-5">
        <div className="max-content mx-auto">
          <h1 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-4`}>Terms & Conditions</h1>
          
          <div className={theme === 'dark' ? 'text-light' : 'text-dark'}>
            <p className="mb-4">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>1. Acceptance of Terms</h2>
              <p>
                By accessing and using Luxury Hotel's website and services, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>2. Booking and Reservations</h2>
              <p className="mb-3">
                All bookings are subject to availability and confirmation. By making a reservation, you agree to:
              </p>
              <ul>
                <li>Provide accurate and complete information</li>
                <li>Be at least 18 years of age or have parental consent</li>
                <li>Provide a valid payment method</li>
                <li>Comply with our cancellation policy</li>
              </ul>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>3. Payment Terms</h2>
              <p className="mb-3">
                Payment is required at the time of booking unless otherwise specified. We accept:
              </p>
              <ul>
                <li>Credit cards (Visa, MasterCard, American Express)</li>
                <li>Debit cards</li>
                <li>Digital payment methods</li>
              </ul>
              <p>
                All prices are displayed in the local currency and are inclusive of applicable taxes unless stated otherwise.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>4. Cancellation Policy</h2>
              <p className="mb-3">
                Cancellation terms vary by room type and booking period:
              </p>
              <ul>
                <li><strong>Standard Rooms:</strong> Free cancellation up to 24 hours before check-in</li>
                <li><strong>Deluxe Rooms:</strong> Free cancellation up to 48 hours before check-in</li>
                <li><strong>Suites:</strong> Free cancellation up to 72 hours before check-in</li>
                <li><strong>Special Packages:</strong> As specified in the package terms</li>
              </ul>
              <p>
                Late cancellations or no-shows will be charged the full amount of the reservation.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>5. Check-in and Check-out</h2>
              <ul>
                <li><strong>Check-in Time:</strong> 3:00 PM</li>
                <li><strong>Check-out Time:</strong> 11:00 AM</li>
                <li>Early check-in and late check-out are subject to availability</li>
                <li>Valid photo ID and credit card required at check-in</li>
              </ul>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>6. House Rules</h2>
              <p className="mb-3">
                Guests are expected to adhere to the following house rules:
              </p>
              <ul>
                <li>No smoking in non-designated areas</li>
                <li>No pets allowed (service animals exempt)</li>
                <li>No parties or events without prior approval</li>
                <li>Respect quiet hours (10 PM - 7 AM)</li>
                <li>No damage to hotel property</li>
              </ul>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>7. Liability</h2>
              <p>
                Luxury Hotel is not liable for any loss, damage, or injury to guests or their property, except where caused by our negligence. We recommend guests obtain travel insurance.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>8. Force Majeure</h2>
              <p>
                We shall not be liable for any failure or delay in performance under these terms due to circumstances beyond our reasonable control, including but not limited to natural disasters, war, terrorism, or government actions.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on our website. Your continued use of our services constitutes acceptance of any changes.
              </p>
            </section>

            <section className="mb-5">
              <h2 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-3`}>10. Contact Information</h2>
              <p>
                For questions about these Terms & Conditions, please contact us:
              </p>
              <p>
                <strong>Email:</strong> legal@luxuryhotel.com<br />
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

export default TermsConditions;
