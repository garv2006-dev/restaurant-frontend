import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsAPI, roomsAPI, paymentsAPI, adminAPI } from '../services/api';
import type { Room } from '../types';
import { toast } from 'react-toastify';
import { useSocket } from '../contexts/SocketContext';
import {
  calculateNights,
  getRoomId,
  getTodayDateString,
  getTomorrowDateString
} from '../utils/bookingDateUtils';
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
const today = getTodayDateString();
const tomorrow = getTomorrowDateString(today);

const INITIAL_STATE: BookingState = {
  checkInDate: today,
  checkOutDate: tomorrow,
  nights: calculateNights(today, tomorrow),
  selectedRooms: [],
  guests: { adults: 1, children: 0 },
  guestDetails: { name: '', email: '', phone: '' },
  paymentMethod: 'Cash',
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
  const { socket } = useSocket();

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

  // Derived state calculations (Single Source of Truth)
  const nights = calculateNights(booking.checkInDate, booking.checkOutDate);
  const roomsCount = booking.selectedRooms.reduce((total, room) => total + (room.count || 1), 0);

  // Requirement 9: Temporary debugging logs
  console.log("checkIn:", booking.checkInDate);
  console.log("checkOut:", booking.checkOutDate);
  console.log("nights:", nights);
  console.log("selectedRooms:", booking.selectedRooms);
  console.log("roomsCount:", roomsCount);

  const subtotal = booking.selectedRooms.reduce((sum, item) => {
    return sum + (item.room.price.basePrice * nights * item.count);
  }, 0);

  // Calculate discount and net
  const discountAmount = appliedDiscount ? appliedDiscount.discountAmount : 0;
  const netAmount = Math.max(0, subtotal - discountAmount);

  // Calculate Tax (Dynamic) and Total
  const taxAmount = netAmount * (gstPercentage / 100);
  const finalAmount = netAmount + taxAmount;

  // ── Fetch rooms & Settings ───────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load rooms
        const roomsRes = await roomsAPI.getAllRooms({ status: 'Available' });
        const list: Room[] = roomsRes?.success && roomsRes?.data ? roomsRes.data.rooms : [];
        setRooms(Array.isArray(list) ? list : []);

        // Load tax settings
        try {
          const settingsRes = await adminAPI.getPublicSettings();
          if (settingsRes.success && settingsRes.data?.gstPercentage !== undefined) {
            setGstPercentage(settingsRes.data.gstPercentage);
          } else {
            setGstPercentage(18); // fallback
          }
        } catch (settingsErr) {
          console.warn('Failed to load dynamic tax settings, defaulting to 18%', settingsErr);
          setGstPercentage(18);
        }

        if (preselectedRoomId) {
          const found = list.find((r: Room) => getRoomId(r) === preselectedRoomId);
          if (found) setBooking(prev => ({ ...prev, selectedRooms: [{ room: found, count: 1 }] }));
        }
      } catch {
        toast.error('Failed to load data. Please try again.');
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [preselectedRoomId]);

  // ── Real-time tax updates ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handleSettingsChange = (newSettings?: any) => {
      if (newSettings && newSettings.gstPercentage !== undefined) {
        setGstPercentage(newSettings.gstPercentage);
      }
    };
    socket.on('settings-change', handleSettingsChange);
    return () => { socket.off('settings-change', handleSettingsChange); };
  }, [socket]);

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

  // Handle date change safely
  const handleDateChange = (field: 'checkInDate' | 'checkOutDate', value: string) => {
    setBooking(prev => {
      const nextIn = field === 'checkInDate' ? value : prev.checkInDate;
      const nextOut = field === 'checkOutDate' ? value : prev.checkOutDate;
      const calculatedN = calculateNights(nextIn, nextOut);

      return {
        ...prev,
        [field]: value,
        nights: calculatedN,
      };
    });
  };

  // ── Step 1 → select room ──────────────────────────────────────────────────
  const handleSelectRoom = (room: Room, qty: number) => {
    setBooking(prev => {
      const targetId = getRoomId(room);
      const exists = prev.selectedRooms.find(item => getRoomId(item.room) === targetId);

      if (qty <= 0) {
        // Remove room
        return {
          ...prev,
          selectedRooms: prev.selectedRooms.filter(item => getRoomId(item.room) !== targetId)
        };
      }

      if (exists) {
        // Update count
        return {
          ...prev,
          selectedRooms: prev.selectedRooms.map(item =>
            getRoomId(item.room) === targetId ? { ...item, count: qty } : item
          )
        };
      } else {
        // Add new room entry
        return {
          ...prev,
          selectedRooms: [...prev.selectedRooms, { room, count: qty }]
        };
      }
    });
  };

  const goToStep2 = () => {
    setStepError(null);
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    if (booking.selectedRooms.length === 0) { setStepError('Please select at least one room.'); return; }
    if (!booking.checkInDate) { setStepError('Please select check-in date.'); return; }
    if (!booking.checkOutDate) { setStepError('Please select check-out date.'); return; }
    if (calculateNights(booking.checkInDate, booking.checkOutDate) < 1) {
      setStepError('Check-out date must be after check-in date (minimum 1 night).');
      return;
    }
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
        ...(appliedDiscount && { discountCode: (appliedDiscount.discount?.code || appliedDiscount.code) }),
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
            gstPercentage={gstPercentage}
            processing={processing}
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