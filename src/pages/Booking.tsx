import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { Users, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsAPI, roomsAPI, paymentsAPI } from '../services/api';
import type { Room, BookingFormData } from '../types';
// import { triggerBookingNotification } from '../utils/bookingNotification';
import BookingFormModal from '../components/booking/BookingFormModal';
import PaymentModal from '../components/booking/PaymentModal';
import { toast } from 'react-toastify';

const Booking: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roomId = searchParams.get('room');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  // submitting and success states removed as they were unused/redundant
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [totalNights, setTotalNights] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'Razorpay'>('Cash');
  const [pendingBookingPayload, setPendingBookingPayload] = useState<any | null>(null);

  // Removed unused payment specific modals and state references
  const [processingPayment, setProcessingPayment] = useState(false);

  // Discount state
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    name: string;
    type: string;
    value: number;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const [subtotalAmount, setSubtotalAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);

  const [bookingForm, setBookingForm] = useState<BookingFormData>({
    roomId: '',
    checkInDate: '',
    checkOutDate: '',
    nights: 1,
    guests: {
      adults: 1,
      children: 0
    },
    guestDetails: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    },
    additionalGuests: [],
    specialRequests: '',
    preferences: {
      earlyCheckIn: false,
      lateCheckOut: false
    },
    extraServices: [],
    roomCount: 1,
    roomNumbers: []
  });

  const [availableRoomNumbers, setAvailableRoomNumbers] = useState<any[]>([]);
  const [fetchingRoomNumbers, setFetchingRoomNumbers] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roomsTouched, setRoomsTouched] = useState(false); // track if user has clicked any checkbox

  // Update form when selected room changes
  useEffect(() => {
    if (selectedRoom && bookingForm.roomId !== selectedRoom.id) {
      setBookingForm(prev => ({
        ...prev,
        roomId: selectedRoom.id
      }));
    }
  }, [selectedRoom, bookingForm.roomId]);

  // Fetch available rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setBookingError(null);

        const response = await roomsAPI.getAllRooms({ status: 'Available' });
        console.log('Rooms API response:', response);

        const availableRooms = response?.success && response?.data ? response.data.rooms : [];
        const safeRooms = Array.isArray(availableRooms) ? availableRooms : [];
        setRooms(safeRooms);

        // If roomId is provided in URL, select that room
        if (roomId && safeRooms.length > 0) {
          const room = safeRooms.find((r: Room) => r.id === roomId);
          if (room) {
            setSelectedRoom(room);
            setBookingForm(prev => ({
              ...prev,
              roomId: room.id,
              guests: {
                adults: 1,
                children: 0
              }
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setBookingError('Failed to load available rooms. Please try again later.');
        setRooms([]); // Ensure rooms is always an array even on error
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [roomId]);

  const handleBookRoom = (room: Room): void => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return;
    }
    console.log('Booking room:', room);
    setSelectedRoom(room);

    // Set the form data with the selected room
    const newForm: BookingFormData = {
      roomId: room._id || room.id, // Use _id if available, fallback to id
      checkInDate: '',
      checkOutDate: '',
      nights: 1,
      guests: {
        adults: 1,
        children: 0
      },
      guestDetails: {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || ''
      },
      additionalGuests: [],
      specialRequests: '',
      preferences: {
        earlyCheckIn: false,
        lateCheckOut: false
      },
      extraServices: [],
      roomCount: 1,
      roomNumbers: []
    };

    console.log('Updated booking form:', newForm);
    setBookingForm(newForm);
    setErrors({});
    setBookingError(null);
    setShowBookingModal(true);
  };

  const validateField = (field: string, value: any): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Handle nested fields
    if (field === 'guestDetails.name') {
      return !value?.trim() ? 'Name is required' : '';
    }

    if (field === 'guestDetails.email') {
      if (!value?.trim()) return 'Email is required';
      if (!/\S+@\S+\.\S+/.test(value)) return 'Email is invalid';
      return '';
    }

    if (field === 'guestDetails.phone') {
      if (!value?.trim()) return 'Phone number is required';
      const cleanPhone = value.replace(/[^0-9]/g, '');
      if (!/^[0-9]{10,15}$/.test(cleanPhone)) return 'Please enter a valid phone number';
      return '';
    }

    if (field === 'checkInDate') {
      if (!value) return 'Check-in date is required';
      const checkInDate = new Date(value);
      checkInDate.setHours(0, 0, 0, 0);
      if (checkInDate < today) return 'Check-in date cannot be in the past';
      return '';
    }

    if (field === 'checkOutDate') {
      if (!value) return 'Check-out date is required';
      if (bookingForm.checkInDate) {
        const checkInDate = new Date(bookingForm.checkInDate);
        const checkOutDate = new Date(value);
        checkInDate.setHours(0, 0, 0, 0);
        checkOutDate.setHours(0, 0, 0, 0);
        if (checkOutDate <= checkInDate) return 'Check-out date must be after check-in date';
      }
      return '';
    }

    return '';
  };

  const handleFormChange = (field: string, value: string | number | boolean | string[]): void => {
    if (field.includes('.')) {
      // Handle nested fields like 'guests.adults' or 'guestDetails.name'
      const [parent, child] = field.split('.');

      // Special handling for guest changes to validate capacity
      if (parent === 'guests' && selectedRoom) {
        const currentGuests = { ...bookingForm.guests };
        currentGuests[child as 'adults' | 'children'] = value as number;

        const totalGuests = currentGuests.adults + currentGuests.children;
        const roomCount = bookingForm.roomCount || 1;
        const maxCapacity = (selectedRoom.capacity.adults + selectedRoom.capacity.children) * roomCount;

        // Prevent exceeding capacity
        if (totalGuests > maxCapacity) {
          setErrors(prev => ({
            ...prev,
            guests: `Maximum capacity for ${roomCount} room(s) is ${maxCapacity} guests`
          }));
          setBookingForm(prev => ({
            ...prev,
            [parent]: currentGuests
          }));
          return;
        } else {
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.guests;
            return newErrors;
          });
        }
      }

      // Real-time validation for guest detail fields
      const fieldKey = `${parent}.${child}`;
      const validationError = validateField(fieldKey, value);
      setErrors(prev => {
        if (validationError) {
          return { ...prev, [fieldKey]: validationError };
        } else {
          const newErrors = { ...prev };
          delete newErrors[fieldKey];
          return newErrors;
        }
      });

      setBookingForm(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      // Handle top-level fields
      const validationError = validateField(field, value);
      setErrors(prev => {
        if (validationError) {
          return { ...prev, [field]: validationError };
        } else {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        }
      });

      setBookingForm(prev => {
        const newState = { ...prev, [field]: value };

        // If roomCount changes, reset selected room numbers
        if (field === 'roomCount') {
          newState.roomNumbers = [];
        }

        // if user clicked room checkbox mark touched
        if (field === 'roomNumbers') {
          setRoomsTouched(true);
        }

        return newState;
      });
    }
  };

  // Fetch available room numbers when room or dates change
  useEffect(() => {
    const fetchAvailableRoomNumbers = async () => {
      if (!bookingForm.roomId || !bookingForm.checkInDate || !bookingForm.checkOutDate) return;

      try {
        setFetchingRoomNumbers(true);
        const response = await roomsAPI.getRoomNumbers(bookingForm.roomId, {
          checkInDate: bookingForm.checkInDate,
          checkOutDate: bookingForm.checkOutDate,
          status: 'Available'
        });
        if (response.success) {
          setAvailableRoomNumbers(response.data || []);
        }
      } catch (err) {
        console.error('Error fetching room numbers:', err);
      } finally {
        setFetchingRoomNumbers(false);
      }
    };

    fetchAvailableRoomNumbers();
  }, [bookingForm.roomId, bookingForm.checkInDate, bookingForm.checkOutDate]);

  // validate room selection after user interaction
  useEffect(() => {
    if (!bookingForm.checkInDate || !bookingForm.checkOutDate) {
      setErrors(prev => {
        const { roomAvailability, ...rest } = prev;
        return rest;
      });
      return;
    }
    if (fetchingRoomNumbers) return;

    let availabilityError: string | undefined;
    const selectedRoomsCount = bookingForm.roomNumbers?.length || 0;
    if (availableRoomNumbers.length === 0) {
      availabilityError = 'No rooms available for selected dates';
    } else if (roomsTouched && selectedRoomsCount === 0) {
      availabilityError = 'Please select at least one room';
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      if (availabilityError) newErrors.roomAvailability = availabilityError;
      else delete newErrors.roomAvailability;
      return newErrors;
    });

    if (selectedRoomsCount > 0) {
      setBookingForm(prev => ({ ...prev, roomCount: selectedRoomsCount }));
    }
  }, [bookingForm.checkInDate, bookingForm.checkOutDate, bookingForm.roomNumbers, availableRoomNumbers, fetchingRoomNumbers, roomsTouched]);

  const validateForm = (): boolean => {
    const newErrors: any = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('Validating form:', bookingForm);

    // Validate check-in date
    if (!bookingForm.checkInDate) {
      newErrors.checkInDate = 'Check-in date is required';
    } else {
      const checkInDate = new Date(bookingForm.checkInDate);
      checkInDate.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        newErrors.checkInDate = 'Check-in date cannot be in the past';
      }
    }

    // Validate check-out date
    if (!bookingForm.checkOutDate) {
      newErrors.checkOutDate = 'Check-out date is required';
    } else if (bookingForm.checkInDate) {
      const checkInDate = new Date(bookingForm.checkInDate);
      const checkOutDate = new Date(bookingForm.checkOutDate);

      // Reset time parts for accurate comparison
      checkInDate.setHours(0, 0, 0, 0);
      checkOutDate.setHours(0, 0, 0, 0);

      if (checkOutDate <= checkInDate) {
        newErrors.checkOutDate = 'Check-out date must be after check-in date';
      }
    }

    // Check if roomId is set
    if (!bookingForm.roomId) {
      newErrors.room = 'Please select a room';
    }

    // Validate guest details
    if (!bookingForm.guestDetails.name?.trim()) {
      newErrors['guestDetails.name'] = 'Name is required';
    }

    if (!bookingForm.guestDetails.email?.trim()) {
      newErrors['guestDetails.email'] = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(bookingForm.guestDetails.email)) {
      newErrors['guestDetails.email'] = 'Email is invalid';
    }

    if (!bookingForm.guestDetails.phone?.trim()) {
      newErrors['guestDetails.phone'] = 'Phone number is required';
    } else if (!/^[0-9]{10,15}$/.test(bookingForm.guestDetails.phone.replace(/[^0-9]/g, ''))) {
      newErrors['guestDetails.phone'] = 'Please enter a valid phone number';
    }

    // Check room availability - verify at least one room is selected
    if (bookingForm.checkInDate && bookingForm.checkOutDate) {
      // if there are no available room numbers at all, fail immediately
      if (availableRoomNumbers.length === 0) {
        newErrors.roomAvailability = 'No rooms available for selected dates';
      } else if (!bookingForm.roomNumbers || bookingForm.roomNumbers.length === 0) {
        newErrors.roomAvailability = 'Please select at least one room';
      }
    }

    // Check room capacity
    const numRoomsSelected = bookingForm.roomNumbers?.length || 0;
    const roomToCheck = selectedRoom || rooms.find(r => r._id === bookingForm.roomId || r.id === bookingForm.roomId);
    if (roomToCheck && numRoomsSelected > 0) {
      const totalGuests = bookingForm.guests.adults + bookingForm.guests.children;
      const maxCapacity = (roomToCheck.capacity.adults + roomToCheck.capacity.children) * numRoomsSelected;

      if (totalGuests > maxCapacity) {
        newErrors.guests = `Maximum capacity for ${numRoomsSelected} room(s) is ${maxCapacity} guests`;
      } else if (bookingForm.guests.adults < 1) {
        newErrors.guests = 'At least one adult is required';
      }
    }

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitBooking = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    console.log('Form submitted');
    console.log('Current form state:', bookingForm);
    console.log('Selected room:', selectedRoom);

    // Resolve room synchronously using a local variable
    let currentRoom = selectedRoom;
    if (!currentRoom && bookingForm.roomId) {
      const room = rooms.find(r => r._id === bookingForm.roomId || r.id === bookingForm.roomId);
      if (room) {
        currentRoom = room;
        setSelectedRoom(room);
      }
    }

    // Validate form
    const isValid = validateForm();
    if (!isValid || !currentRoom) {
      console.log('Form validation failed or no room selected', errors);
      // Show toast notification for validation errors; prefer room availability message if present
      const toastMsg = errors.roomAvailability || 'Please fill in all required fields correctly before proceeding.';
      toast.error(toastMsg, {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      // keep booking modal open (it already is) and do not open payment
      return;
    }

    // Step 1: build payload and open payment modal instead of calling API directly
    try {
      setBookingError(null);

      const checkInDate = new Date(bookingForm.checkInDate);
      checkInDate.setUTCHours(12, 0, 0, 0);
      const checkOutDate = new Date(bookingForm.checkOutDate);
      checkOutDate.setUTCHours(12, 0, 0, 0);

      // Ensure roomCount matches the number of selected rooms
      const selectedRoomsCount = bookingForm.roomNumbers?.length || 0;

      const bookingData = {
        roomId: currentRoom._id || currentRoom.id,
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        roomCount: selectedRoomsCount,
        roomNumbers: bookingForm.roomNumbers || [],
        guestDetails: {
          primaryGuest: {
            name: bookingForm.guestDetails.name.trim(),
            email: bookingForm.guestDetails.email.trim(),
            phone: bookingForm.guestDetails.phone.replace(/[^0-9]/g, '')
          },
          totalAdults: bookingForm.guests.adults,
          totalChildren: bookingForm.guests.children,
          additionalGuests: bookingForm.additionalGuests || []
        },
        discountCode: appliedDiscount?.code,
        paymentMethod: selectedPaymentMethod
      };

      setPendingBookingPayload(bookingData);
      setShowBookingModal(false);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('Error preparing booking payload:', error);
      const errorMsg = 'Failed to prepare booking. Please try again.';
      toast.error(errorMsg, {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setBookingError(errorMsg);
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingBookingPayload || !selectedRoom) return;

    // Validate payment method selection
    if (!selectedPaymentMethod) {
      const errorMsg = 'Please select a payment method';
      toast.error(errorMsg, {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setBookingError(errorMsg);
      return;
    }

    // For Cash payment, proceed directly
    if (selectedPaymentMethod === 'Cash') {
      await processBookingWithPayment(null);
      return;
    }

    // For Razorpay payment, initiate Razorpay checkout
    if (selectedPaymentMethod === 'Razorpay') {
      await handleRazorpayPayment();
      return;
    }
  };

  // Handle Razorpay payment
  const handleRazorpayPayment = async () => {
    if (!selectedRoom) {
      const errorMsg = 'Please select a room';
      toast.error(errorMsg, {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setBookingError(errorMsg);
      return;
    }

    try {
      setProcessingPayment(true);
      setBookingError(null);

      // Calculate amount (use final amount if discount is applied)
      const amountToPay = appliedDiscount ? finalAmount : totalAmount;

      // Create Razorpay order
      const orderResponse = await paymentsAPI.createRazorpayOrder(
        amountToPay,
        'INR',
        {
          roomId: selectedRoom._id || selectedRoom.id,
          roomName: selectedRoom.name,
          checkIn: bookingForm.checkInDate,
          checkOut: bookingForm.checkOutDate
        }
      );

      if (!orderResponse.success || !orderResponse.data) {
        throw new Error(orderResponse.message || 'Failed to create Razorpay order');
      }

      const { orderId, amount, currency, keyId } = orderResponse.data;

      // Define Razorpay options
      const options = {
        key: keyId,
        amount: amount, // Amount is already in paise from backend
        currency: currency,
        name: 'Luxury Hotel',
        description: `Booking for ${selectedRoom.name}`,
        order_id: orderId,
        prefill: {
          name: user?.name || bookingForm.guestDetails.name,
          email: user?.email || bookingForm.guestDetails.email,
          contact: user?.phone || bookingForm.guestDetails.phone
        },
        theme: {
          color: '#c8a456'
        },
        handler: async function (response: any) {
          // Payment successful, verify signature
          try {
            setProcessingPayment(true);

            const verifyResponse = await paymentsAPI.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingData: pendingBookingPayload
            });

            if (!verifyResponse.success) {
              throw new Error('Payment verification failed');
            }

            // Payment verified, get actual payment method from Razorpay
            // This will be: card, netbanking, wallet, upi, emi, etc.
            const actualPaymentMethod = verifyResponse.data?.method || 'Razorpay';
            console.log('Razorpay payment method:', actualPaymentMethod);
            console.log('Razorpay verification response:', verifyResponse.data);

            const paymentData = {
              transactionId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              method: actualPaymentMethod, // Store actual method: netbanking, card, upi, wallet, etc.
              email: verifyResponse.data?.email,
              contact: verifyResponse.data?.contact
            };

            console.log('Payment data to save:', paymentData);
            await processBookingWithPayment(paymentData);
          } catch (verifyError: any) {
            console.error('Payment verification error:', verifyError);
            const errorMsg = 'Payment verification failed. Please contact support.';
            toast.error(errorMsg, {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });
            setBookingError(errorMsg);
            setProcessingPayment(false);
            setShowPaymentModal(true);
          }
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false);
            setShowPaymentModal(true);
            toast.error('Payment cancelled');
          }
        }
      };

      // Open Razorpay checkout
      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

      // Close payment modal when Razorpay modal opens
      setShowPaymentModal(false);

    } catch (error: any) {
      console.error('Razorpay payment error:', error);
      const errorMsg = error.message || 'Failed to initiate Razorpay payment';
      toast.error(errorMsg, {
        position: "top-center",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      setBookingError(errorMsg);
      setProcessingPayment(false);
      setShowPaymentModal(true);
    }
  };

  // Process booking with payment details
  const processBookingWithPayment = async (paymentData: any) => {
    if (!pendingBookingPayload || !selectedRoom) return;

    try {
      setProcessingPayment(true);
      setBookingError(null);

      const payload = {
        ...pendingBookingPayload,
        paymentDetails: {
          method: selectedPaymentMethod,
          ...paymentData
        },
        // Include discount code if applied
        ...(appliedDiscount && { discountCode: appliedDiscount.code })
      };

      console.log('Submitting booking with payment:', payload);

      const response = await bookingsAPI.createBooking(payload);
      console.log('Booking API response:', response);

      if (response?.success) {
        // Success state removed

        // Close all modals
        setShowPaymentModal(false);
        // Payment specific modals removed as they were unused

        // Clear form and reset state
        setPendingBookingPayload(null);
        setAppliedDiscount(null);
        setSelectedPaymentMethod('Cash');


        // const bookingId = response.data?.bookingId || 'your booking';
        /* toast.success(`Booking received successfully! Your booking ID is ${bookingId}. Awaiting admin confirmation.`, {
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }); */

        // Notification is triggered automatically from backend via socket
        /* if ((response.data as any)?.notificationTrigger) {
          console.log('Triggering notification:', (response.data as any).notificationTrigger);
          triggerBookingNotification((response.data as any).notificationTrigger);
        } */

        navigate('/bookings');
      } else {
        throw new Error(response?.message || 'Failed to create booking');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      let errorMessage = 'Failed to submit booking. Please try again.';

      if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Cannot connect to server. Please check if the backend server is running on port 5000.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused. Please ensure the backend server is running.';
      } else if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          errorMessage = 'Booking service not found. Please contact support.';
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. Please check your permissions.';
        } else if (status === 400) {
          errorMessage = error.response.data?.message || 'Invalid booking data. Please check your information.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        } else {
          errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection and ensure the backend server is running on port 5000.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Show error as toast notification
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
      });
      setBookingError(errorMessage);

      // Check if error is related to room availability - go back to booking modal
      const isRoomAvailabilityError = errorMessage.toLowerCase().includes('available') ||
        errorMessage.toLowerCase().includes('room') ||
        errorMessage.toLowerCase().includes('capacity') ||
        errorMessage.toLowerCase().includes('invalid booking data');

      if (isRoomAvailabilityError) {
        // Go back to booking modal so user can fix the issue
        setShowPaymentModal(false);
        setShowBookingModal(true);
      } else {
        // Reopen payment modal for other errors (payment failures, etc.)
        setShowPaymentModal(true);
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  // Unused payment handlers removed

  // Calculate total price when dates or room changes
  useEffect(() => {
    if (selectedRoom && bookingForm.checkInDate && bookingForm.checkOutDate) {
      // Normalize dates to midnight for accurate day difference
      const d1 = new Date(bookingForm.checkInDate);
      d1.setHours(0, 0, 0, 0);
      const d2 = new Date(bookingForm.checkOutDate);
      d2.setHours(0, 0, 0, 0);

      const nights = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) || 1;

      const basePrice = selectedRoom.price.basePrice;
      const numRooms = bookingForm.roomNumbers?.length || 1;
      const subtotal = basePrice * nights * numRooms;

      setTotalNights(nights);
      setSubtotalAmount(subtotal);

      // Calculate final amount with discount
      if (appliedDiscount) {
        setFinalAmount(appliedDiscount.finalAmount);
        setTotalAmount(appliedDiscount.finalAmount);
      } else {
        setFinalAmount(subtotal);
        setTotalAmount(subtotal);
      }
    }
  }, [bookingForm.checkInDate, bookingForm.checkOutDate, bookingForm.roomNumbers, selectedRoom, appliedDiscount]);

  const handleDiscountApplied = (discount: {
    code: string;
    name: string;
    type: string;
    value: number;
    discountAmount: number;
    finalAmount: number;
  } | null) => {
    setAppliedDiscount(discount);
    if (discount) {
      setFinalAmount(discount.finalAmount);
      setTotalAmount(discount.finalAmount);
    } else {
      setFinalAmount(subtotalAmount);
      setTotalAmount(subtotalAmount);
    }
  };

  const getRoomPrimaryImageUrl = (room: Room): string => {
    const fallbackUrl = 'https://via.placeholder.com/400x250?text=Room+Image';

    if (!room || !Array.isArray(room.images) || room.images.length === 0) {
      return fallbackUrl;
    }

    const isCloudinaryUrl = (url?: string) => !!url && url.includes('res.cloudinary.com');

    const cloudImages = room.images.filter((img) => isCloudinaryUrl(img.url));
    const primaryCloud = cloudImages.find((img) => img.isPrimary);
    if (primaryCloud?.url) return primaryCloud.url;

    if (cloudImages.length > 0) {
      const lastCloud = cloudImages[cloudImages.length - 1];
      if (lastCloud?.url) return lastCloud.url;
    }

    const primaryAny = room.images.find((img) => img.isPrimary && !!img.url);
    if (primaryAny?.url) return primaryAny.url;

    const lastAny = room.images[room.images.length - 1];
    return lastAny?.url || fallbackUrl;
  };

  return (
    <Container className="py-5">
      {/* Connection Test - Remove this after fixing the issue */}


      {/* Header */}
      <Row className="mb-5">
        <Col>
          <div className="text-center">
            <h1 className="display-4 mb-3">Book Your Stay</h1>
            <p className="lead text-muted">Choose from our comfortable and luxurious rooms</p>
          </div>
        </Col>
      </Row>

      {/* Admin Warning Alert */}
      {isAdmin && (
        <Alert variant="warning" className="mb-4 shadow-sm border-warning">
          <div className="d-flex align-items-center">
            <ShieldAlert size={24} className="me-3" />
            <div>
              <Alert.Heading className="h6 mb-1">Admin Access</Alert.Heading>
              <p className="mb-0 small">
                You are viewing this page as an Administrator. You can view room availability, but booking functionality is disabled for admin accounts.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Rooms Grid */}
      <Row>
        {rooms && rooms.length > 0 ? (
          rooms.map((room: Room) => (
            <Col md={6} lg={4} key={room.id} className="mb-4">
              <Card className="h-100 shadow-sm border-0">
                <div className="position-relative">
                  <Card.Img
                    variant="top"
                    src={getRoomPrimaryImageUrl(room)}
                    alt={room.name}
                    style={{ height: '250px', objectFit: 'cover' }}
                  />
                  <div className="position-absolute top-0 end-0 m-2">
                    {room.hasAvailableRooms === false ? (
                      <Badge bg="warning" text="dark">Under Maintenance</Badge>
                    ) : room.status === 'Available' ? (
                      <Badge bg="success">Available</Badge>
                    ) : room.status === 'Occupied' ? (
                      <Badge bg="danger">Booked</Badge>
                    ) : (
                      <Badge bg="warning" text="dark">Under Maintenance</Badge>
                    )}
                  </div>
                </div>

                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="h5 mb-0">{room.name}</Card.Title>
                    <span className="fw-bold text-primary">₹{room.price.basePrice}/night</span>
                  </div>

                  <div className="d-flex align-items-center mb-3">
                    <Badge bg="secondary" className="me-2">
                      {room.type}
                    </Badge>
                    <small className="text-muted">
                      <Users size={14} className="me-1" />
                      {room.capacity.adults} {room.capacity.adults === 1 ? 'Adult' : 'Adults'}
                      {room.capacity.children > 0 && `, ${room.capacity.children} ${room.capacity.children === 1 ? 'Child' : 'Children'}`}
                    </small>
                  </div>

                  <div className="mb-3">
                    <h6 className="small text-muted mb-2">Amenities:</h6>
                    <div className="d-flex flex-wrap gap-1">
                      {room.features ? Object.entries(room.features)
                        .filter(([_, value]) => value)
                        .map(([feature]) => (
                          <span key={feature} className="feature-badge small me-1 mb-1">
                            {feature.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </span>
                        )) : null}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <Button
                      variant={room.hasAvailableRooms !== false && room.status === 'Available' && !isAdmin ? "primary" : "secondary"}
                      className="w-100"
                      disabled={room.hasAvailableRooms === false || room.status !== 'Available' || isAdmin}
                      onClick={() => handleBookRoom(room)}
                    >
                      {isAdmin
                        ? 'Admin View Only'
                        : room.hasAvailableRooms === false
                          ? 'Under Maintenance'
                          : room.status === 'Available'
                            ? 'Book Now'
                            : room.status === 'Occupied'
                              ? 'Booked'
                              : 'Not Available'
                      }
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : loading ? (
          <Col>
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading rooms...</p>
            </div>
          </Col>
        ) : (
          <Col>
            <Alert variant="info">
              <Alert.Heading>No rooms available</Alert.Heading>
              <p>Sorry, there are no rooms available at the moment. Please check back later.</p>
            </Alert>
          </Col>
        )}
      </Row>

      {/* Booking Form Modal - Component */}
      <BookingFormModal
        show={showBookingModal}
        selectedRoom={selectedRoom}
        bookingForm={bookingForm}
        errors={errors}
        bookingError={bookingError}
        totalNights={totalNights}
        subtotalAmount={subtotalAmount}
        finalAmount={finalAmount}
        appliedDiscount={appliedDiscount}
        onHide={() => setShowBookingModal(false)}
        onFormChange={handleFormChange}
        onSubmit={handleSubmitBooking}
        availableRoomCount={selectedRoom?.availableCount || selectedRoom?.totalRoomNumbers || 5}
        availableRoomNumbers={availableRoomNumbers}
        fetchingRoomNumbers={fetchingRoomNumbers}
      />

      {/* Payment Modal - Component */}
      <PaymentModal
        show={showPaymentModal}
        selectedRoom={selectedRoom}
        bookingForm={bookingForm}
        totalNights={totalNights}
        subtotalAmount={subtotalAmount}
        finalAmount={finalAmount}
        totalAmount={totalAmount}
        appliedDiscount={appliedDiscount}
        selectedPaymentMethod={selectedPaymentMethod}
        processingPayment={processingPayment}
        bookingError={bookingError}
        onHide={() => setShowPaymentModal(false)}
        onPaymentMethodChange={(method) => {
          setSelectedPaymentMethod(method);
          setBookingError(null);
        }}
        onConfirmPayment={handleConfirmPayment}
        onDiscountApplied={handleDiscountApplied}
        onBackClick={() => {
          setShowPaymentModal(false);
          setShowBookingModal(true);
        }}
      />

    </Container>
  );
};

export default Booking;