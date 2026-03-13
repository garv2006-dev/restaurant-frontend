import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsAPI, roomsAPI, paymentsAPI, publicSettingsAPI } from '../services/api';
import type { Room } from '../types';
import { toast } from 'react-toastify';
import '../styles/booking-flow.css';


// ─── Step sub-components ────────────────────────────────────────────────────
import BookingStep1 from '../components/booking/BookingStep1';
import BookingStep2 from '../components/booking/BookingStep2';
import BookingStep3 from '../components/booking/BookingStep3';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SelectedRoom {
  room: Room;
  count: number;
}

export interface BookingState {
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  selectedRooms: SelectedRoom[];
  guests: { adults: number; children: number };
  guestDetails: { name: string; email: string; phone: string };
  paymentMethod: string;
}

// Compute sensible default dates (today → tomorrow)
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const INITIAL_STATE: BookingState = {
  checkInDate: today,
  checkOutDate: tomorrow,
  nights: 1,
  selectedRooms: [],
  guests: { adults: 1, children: 0 },
  guestDetails: { name: '', email: '', phone: '' },
  paymentMethod: 'Razorpay',
};


// ─── Main Page Component ─────────────────────────────────────────────────────
const Booking: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const preselectedRoomId = searchParams.get('room');

  const [step, setStep] = useState(1);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [gstPercentage, setGstPercentage] = useState(18);

  const [booking, setBooking] = useState<BookingState>(() => ({
    ...INITIAL_STATE,
    guestDetails: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  }));

  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Derived totals
  const subtotal = booking.selectedRooms.reduce((sum, item) => {
    return sum + (item.room.price.basePrice * booking.nights * item.count);
  }, 0);

  // Calculate discount and net
  const discountAmount = appliedDiscount ? appliedDiscount.discountAmount : 0;
  const netAmount = Math.max(0, subtotal - discountAmount);
  
  // Calculate Tax (Dynamic) and Total
  const taxAmount = netAmount * (gstPercentage / 100);
  const finalAmount = netAmount + taxAmount;

  // ── Fetch rooms & Settings ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await publicSettingsAPI.getSettings();
        if (res.success && res.data) {
          setGstPercentage(res.data.gstPercentage);
        }
      } catch (err) {
        console.error('Failed to fetch tax settings:', err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await roomsAPI.getAllRooms({ status: 'Available' });
        const list: Room[] = response?.success && response?.data ? response.data.rooms : [];
        setRooms(Array.isArray(list) ? list : []);
        if (preselectedRoomId) {
          const found = list.find((r: Room) => (r.id || r._id) === preselectedRoomId);
          if (found) setBooking(prev => ({ ...prev, selectedRooms: [{ room: found, count: 1 }] }));
        }
      } catch {
        toast.error('Failed to load rooms. Please try again.');
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [preselectedRoomId]);

  // ── Auto-fill guest details when user changes ─────────────────────────────
  useEffect(() => {
    if (user) {
      setBooking(prev => ({
        ...prev,
        guestDetails: {
          name: prev.guestDetails.name || user.name || '',
          email: prev.guestDetails.email || user.email || '',
          phone: prev.guestDetails.phone || user.phone || '',
        },
      }));
    }
  }, [user]);

  // ── Update nights when dates change ──────────────────────────────────────
  const updateNights = useCallback((checkIn: string, checkOut: string) => {
    if (checkIn && checkOut) {
      const d1 = new Date(checkIn); d1.setHours(0, 0, 0, 0);
      const d2 = new Date(checkOut); d2.setHours(0, 0, 0, 0);
      const n = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
      setBooking(prev => ({ ...prev, nights: n }));
    }
  }, []);

  const handleDateChange = (field: 'checkInDate' | 'checkOutDate', value: string) => {
    setBooking(prev => {
      const next = { ...prev, [field]: value };
      updateNights(
        field === 'checkInDate' ? value : prev.checkInDate,
        field === 'checkOutDate' ? value : prev.checkOutDate
      );
      return next;
    });
  };

  // ── Step 1 → select room ──────────────────────────────────────────────────
  const handleSelectRoom = (room: Room, qty: number) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setBooking(prev => {
      const roomId = room.id || room._id;
      const exists = prev.selectedRooms.find(item => (item.room.id || item.room._id) === roomId);

      if (qty === 0) {
        // Remove room
        return { ...prev, selectedRooms: prev.selectedRooms.filter(item => (item.room.id || item.room._id) !== roomId) };
      }

      if (exists) {
        // Update qty
        return {
          ...prev,
          selectedRooms: prev.selectedRooms.map(item =>
            (item.room.id || item.room._id) === roomId ? { ...item, count: qty } : item
          )
        };
      } else {
        // Add room
        return { ...prev, selectedRooms: [...prev.selectedRooms, { room, count: qty }] };
      }
    });
  };

  const goToStep2 = () => {
    setStepError(null);
    if (booking.selectedRooms.length === 0) { setStepError('Please select at least one room.'); return; }
    if (!booking.checkInDate) { setStepError('Please select check-in date.'); return; }
    if (!booking.checkOutDate) { setStepError('Please select check-out date.'); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Step 2 → validate guest details ──────────────────────────────────────
  const goToStep3 = () => {
    setStepError(null);
    const { name, email, phone } = booking.guestDetails;
    if (!name.trim()) { setStepError('Full name is required.'); return; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setStepError('Valid email is required.'); return; }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || !/^[0-9]{10}$/.test(cleanPhone)) { setStepError('Valid 10-digit phone number is required.'); return; }
    if (booking.guests.adults < 1) { setStepError('At least 1 adult is required.'); return; }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearError = () => setStepError(null);

  // ── Step 3 → Pay ─────────────────────────────────────────────────────────
  const handlePayNow = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location } }); return; }
    if (!booking.paymentMethod) { toast.error('Please select a payment method.'); return; }

    if (booking.paymentMethod === 'Razorpay') {
      await handleRazorpay();
    } else {
      await processBooking(null);
    }
  };

  const handleRazorpay = async () => {
    try {
      setProcessing(true);
      const roomNames = booking.selectedRooms.map(item => item.room.name).join(', ');
      const orderRes = await paymentsAPI.createRazorpayOrder(finalAmount, 'INR', {
        roomNames,
        bookingCount: booking.selectedRooms.length,
      });
      if (!orderRes.success || !orderRes.data) throw new Error('Failed to create order');

      const { orderId, amount, currency, keyId } = orderRes.data;
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Luxury Hotel',
        description: `Booking for ${roomNames}`,
        order_id: orderId,
        prefill: {
          name: booking.guestDetails.name,
          email: booking.guestDetails.email,
          contact: booking.guestDetails.phone,
        },
        theme: { color: '#c8a456' },
        handler: async (response: any) => {
          try {
            setProcessing(true);
            const verifyRes = await paymentsAPI.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (!verifyRes.success) throw new Error('Payment verification failed');
            await processBooking({
              transactionId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              method: verifyRes.data?.method || 'Razorpay',
            });
          } catch (err: any) {
            toast.error(err.message || 'Payment verification failed.');
            setProcessing(false);
          }
        },
        modal: { ondismiss: () => { setProcessing(false); toast.info('Payment cancelled.'); } },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate payment.');
      setProcessing(false);
    }
  };

  const processBooking = async (paymentData: any) => {
    try {
      setProcessing(true);
      const checkIn = new Date(booking.checkInDate); checkIn.setUTCHours(12, 0, 0, 0);
      const checkOut = new Date(booking.checkOutDate); checkOut.setUTCHours(12, 0, 0, 0);

      const payload: any = {
        selectedRooms: booking.selectedRooms.map(item => ({
          roomId: item.room._id || item.room.id,
          count: item.count
        })),
        checkInDate: checkIn.toISOString(),
        checkOutDate: checkOut.toISOString(),
        guestDetails: {
          primaryGuest: {
            name: booking.guestDetails.name.trim(),
            email: booking.guestDetails.email.trim(),
            phone: booking.guestDetails.phone.replace(/[^0-9]/g, ''),
          },
          totalAdults: booking.guests.adults,
          totalChildren: booking.guests.children,
        },
        paymentMethod: booking.paymentMethod,
        paymentDetails: { method: booking.paymentMethod, ...paymentData },
        ...(appliedDiscount && { discountCode: appliedDiscount.code }),
      };

      const res = await bookingsAPI.createBooking(payload);
      if (res?.success) {
        toast.success('Room booked successfully!');
        navigate('/bookings');
      } else {
        throw new Error(res?.message || 'Booking failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Booking failed. Please try again.';
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="booking-flow-page">
      <div className="booking-content-area">
        {step === 1 && (
          <BookingStep1
            rooms={rooms}
            loading={loading}
            booking={booking}
            subtotal={subtotal}
            gstPercentage={gstPercentage}
            onDateChange={handleDateChange}
            onSelectRoom={handleSelectRoom}
            onContinue={goToStep2}
            error={stepError}
            onClearError={clearError}
          />
        )}
        {step === 2 && (
          <BookingStep2
            booking={booking}
            subtotal={subtotal}
            finalAmount={finalAmount}
            appliedDiscount={appliedDiscount}
            gstPercentage={gstPercentage}
            onGuestChange={(field: 'name' | 'email' | 'phone', val: string) => setBooking(prev => ({ ...prev, guestDetails: { ...prev.guestDetails, [field]: val } }))}
            onGuestsChange={(field: 'adults' | 'children', val: number) => setBooking(prev => ({ ...prev, guests: { ...prev.guests, [field]: val } }))}
            onBack={() => { setStep(1); setStepError(null); }}
            onContinue={goToStep3}
            error={stepError}
            onClearError={clearError}
          />
        )}
        {step === 3 && (
          <BookingStep3
            booking={booking}
            subtotal={subtotal}
            finalAmount={finalAmount}
            appliedDiscount={appliedDiscount}
            processing={processing}
            gstPercentage={gstPercentage}
            onPaymentMethodChange={(m: string) => setBooking(prev => ({ ...prev, paymentMethod: m }))}
            onDiscountApplied={setAppliedDiscount}
            onBack={() => setStep(2)}
            onPayNow={handlePayNow}
          />
        )}
      </div>
    </div>
  );
};

export default Booking;