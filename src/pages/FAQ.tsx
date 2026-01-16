import React, { useState } from 'react';
import { Container, Accordion, Card } from 'react-bootstrap';

import { useTheme } from '../context/ThemeContext';


const FAQ: React.FC = () => {
  const { theme } = useTheme();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const faqData = [
    {
      question: "How do I make a reservation?",
      answer: "You can make a reservation through our website by selecting your desired dates, room type, and completing the booking form. Alternatively, you can call our front desk directly at +1 (555) 123-4567."
    },
    {
      question: "What is your cancellation policy?",
      answer: "Our cancellation policy varies by room type: Standard Rooms allow free cancellation up to 24 hours before check-in, Deluxe Rooms up to 48 hours, and Suites up to 72 hours. Special packages may have different terms."
    },
    {
      question: "What time is check-in and check-out?",
      answer: "Check-in time is 3:00 PM and check-out time is 11:00 AM. Early check-in and late check-out are subject to availability and may incur additional charges."
    },
    {
      question: "Do you offer airport transportation?",
      answer: "Yes, we provide airport pickup and drop-off services. Please contact us at least 24 hours in advance to arrange transportation. Additional charges apply."
    },
    {
      question: "Is parking available?",
      answer: "We offer both valet and self-parking options. Valet parking is $25 per day, and self-parking is $15 per day. All parking is secure and monitored 24/7."
    },
    {
      question: "Are pets allowed?",
      answer: "Only service animals are permitted on our premises. Emotional support animals are not considered service animals under our policy."
    },
    {
      question: "What amenities are included?",
      answer: "All rooms include complimentary Wi-Fi, premium cable TV, minibar, safe, and luxury bath products. Suite guests also enjoy access to our executive lounge."
    },
    {
      question: "Do you have a restaurant on-site?",
      answer: "Yes, we feature two restaurants: a fine dining restaurant serving international cuisine and a casual café open 24/7. Room service is also available."
    },
    {
      question: "Is there a fitness center or spa?",
      answer: "Our state-of-the-art fitness center is open 24/7 for all guests. The spa offers various treatments and massages by appointment only."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express), debit cards, and digital payment methods including Apple Pay and Google Pay."
    },
    {
      question: "Do you offer group bookings?",
      answer: "Yes, we accommodate group bookings for 10 or more rooms with special rates. Please contact our group sales team at groups@luxuryhotel.com for assistance."
    },
    {
      question: "Is there a minimum age requirement?",
      answer: "Guests must be at least 18 years old to book a room. Guests under 18 must be accompanied by an adult."
    },
    {
      question: "What if I need to modify my reservation?",
      answer: "You can modify your reservation online through our website or by calling our front desk. Modifications are subject to availability and may affect your rate."
    },
    {
      question: "Do you have Wi-Fi available?",
      answer: "Complimentary high-speed Wi-Fi is available throughout the hotel, including all guest rooms, restaurants, and public areas."
    },
    {
      question: "What should I do if I forget something at home?",
      answer: "Our front desk can provide essential toiletries, phone chargers, and other common items. Our gift shop also stocks travel essentials."
    }
  ];

  return (
    <>

      <Container className="py-5">
        <div className="max-content mx-auto">
          <h1 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-4`}>Frequently Asked Questions</h1>

          <p className={theme === 'dark' ? 'text-light' : 'text-dark'} mb-5>
            Find answers to common questions about our hotel, services, and policies. Can't find what you're looking for?
            <a href="/contact" className={theme === 'dark' ? 'text-gold' : 'text-primary'}>Contact our support team</a>.
          </p>

          <Accordion
            activeKey={activeKey}
            onSelect={(key) => setActiveKey(key as string | null)}
            className="faq-accordion"
          >
            {faqData.map((faq, index) => (
              <Card key={index} className="mb-3 bg-dark text-light border-secondary">
                <Accordion.Item eventKey={index.toString()} className="bg-dark">
                  <Accordion.Header className="bg-dark text-light">
                    <span className="fw-semibold">{faq.question}</span>
                  </Accordion.Header>
                  <Accordion.Body className="bg-dark text-light">
                    <p className="mb-0">{faq.answer}</p>
                  </Accordion.Body>
                </Accordion.Item>
              </Card>
            ))}
          </Accordion>

          <div className="text-center mt-5">
            <h3 className={`${theme === 'dark' ? 'text-gold' : 'text-primary'} mb-4`}>Still have questions?</h3>
            <p className={theme === 'dark' ? 'text-light' : 'text-dark'} mb-4>
              Our customer service team is available 24/7 to assist you.
            </p>
            <div className="d-flex justify-content-center gap-3 flex-wrap">

              <a
                href="/contact"
                className="btn btn-primary"
              >
                Send Message
              </a>
            </div>
          </div>
        </div>
      </Container>

      <style>{`
        .faq-accordion .accordion-button {
          background-color: ${theme === 'dark' ? '#2c3e50' : '#f8f9fa'} !important;
          color: ${theme === 'dark' ? '#fff' : '#212529'} !important;
          border: none !important;
        }
        
        .faq-accordion .accordion-button:not(.collapsed) {
          background-color: ${theme === 'dark' ? '#34495e' : '#e9ecef'} !important;
          color: ${theme === 'dark' ? '#f39c12' : '#0d6efd'} !important;
        }
        
        .faq-accordion .accordion-button:focus {
          box-shadow: none !important;
          border-color: ${theme === 'dark' ? '#f39c12' : '#0d6efd'} !important;
        }
        
        .faq-accordion .accordion-item {
          background-color: ${theme === 'dark' ? '#2c3e50' : '#ffffff'} !important;
          border: 1px solid ${theme === 'dark' ? '#495057' : '#dee2e6'} !important;
        }
        
        .faq-accordion .accordion-body {
          background-color: ${theme === 'dark' ? '#2c3e50' : '#ffffff'} !important;
          color: ${theme === 'dark' ? '#ecf0f1' : '#212529'} !important;
        }
        
        .accordion-toggle-icon {
          transition: transform 0.3s ease;
        }
        
        .max-content {
          max-width: 800px;
        }
      `}</style>
    </>
  );
};

export default FAQ;
