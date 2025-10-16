import React, { useEffect, useState } from 'react';
import { Table, Alert, Spinner, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import { Booking } from '../types';

const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        // Use the bookingsAPI service for consistent error handling and data structure
        const response = await bookingsAPI.getUserBookings();
        console.log('Bookings API response:', response);
        
        // Check if response is successful and has data
        if (response?.success && response?.data) {
          // Handle the correct response structure based on the API definition
          const bookingsData = response.data.bookings || [];
          console.log('Bookings data:', bookingsData);
          setBookings(bookingsData);
        } else {
          // Fallback to empty array if no data
          console.log('No bookings data found in response');
          setBookings([]);
        }
      } catch (err: any) {
        console.error('Error fetching bookings:', err);
        setError(
          err?.response?.data?.message || err?.message || 'Failed to load bookings'
        );
        // Set empty bookings on error to prevent infinite loading
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div className="container py-5 d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" /> <span>Loading bookings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4">My Bookings</h2>
      {bookings && bookings.length === 0 ? (
        <Alert variant="info" className="d-flex align-items-center justify-content-between">
          <span>You have no bookings yet.</span>
          <Button as={Link as any} to="/booking" variant="primary" size="sm">Create Booking</Button>
        </Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Nights</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {bookings && bookings.map ? bookings.map((b, idx) => {
              // Handle both string and object room references
              const room = typeof b.room === 'object' && b.room !== null ? b.room : null;
              const roomLabel = room ? `${room.name || ''} ${room.type ? `(${room.type})` : ''} ${room.roomNumber ? `#${room.roomNumber}` : ''}`.trim() : 'Unknown Room';
              const ci = new Date(b.bookingDates.checkInDate).toLocaleDateString();
              const co = new Date(b.bookingDates.checkOutDate).toLocaleDateString();
              const nights = b.bookingDates.nights || 0;
              const total = `₹${b.pricing.totalAmount?.toFixed(2) || '0.00'}`;
              return (
                <tr key={b.id}>
                  <td>{idx + 1}</td>
                  <td>{roomLabel}</td>
                  <td>{ci}</td>
                  <td>{co}</td>
                  <td>{nights}</td>
                  <td>{b.status || '-'}</td>
                  <td>{total}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} className="text-center">
                  No booking data available
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export default MyBookings;