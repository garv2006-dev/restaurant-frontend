import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge, Modal, Spinner } from 'react-bootstrap';
import { Calendar, Users, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsAPI, roomsAPI } from '../services/api';
import { differenceInDays } from 'date-fns';
import type { Room, Booking as BookingType, BookingFormData } from '../types';
import { triggerBookingNotification } from '../utils/bookingNotification';
import DiscountCode from '../components/booking/DiscountCode';
import { toast } from 'react-toastify';

const Booking: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roomId = searchParams.get('room');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [totalNights, setTotalNights] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Online'>('Cash');
  const [pendingBookingPayload, setPendingBookingPayload] = useState<any | null>(null);
  
  // Payment method specific modals
  const [showCardPaymentModal, setShowCardPaymentModal] = useState(false);
  const [showUPIPaymentModal, setShowUPIPaymentModal] = useState(false);
  const [showOnlineBankingModal, setShowOnlineBankingModal] = useState(false);
  
  // Payment details state
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  
  const [upiDetails, setUpiDetails] = useState({
    upiId: '',
    upiName: ''
  });
  
  const [bankingDetails, setBankingDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: ''
  });
  
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Payment validation errors
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [upiErrors, setUpiErrors] = useState<Record<string, string>>({});
  const [bankingErrors, setBankingErrors] = useState<Record<string, string>>({});
  
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
    extraServices: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      extraServices: []
    };
    
    console.log('Updated booking form:', newForm);
    setBookingForm(newForm);
    setErrors({});
    setBookingError(null);
    setShowBookingModal(true);
  };

  const handleFormChange = (field: string, value: string | number | boolean): void => {
    if (field.includes('.')) {
      // Handle nested fields like 'guests.adults' or 'guestDetails.name'
      const [parent, child] = field.split('.');
      
      // Special handling for guest changes to validate capacity
      if (parent === 'guests' && selectedRoom) {
        const currentGuests = { ...bookingForm.guests };
        currentGuests[child as 'adults' | 'children'] = value as number;
        
        const totalGuests = currentGuests.adults + currentGuests.children;
        const maxCapacity = selectedRoom.capacity.adults + selectedRoom.capacity.children;
        
        // Prevent exceeding capacity
        if (totalGuests > maxCapacity) {
          setErrors(prev => ({
            ...prev,
            guests: `Maximum capacity for this room is ${maxCapacity} guests (${selectedRoom.capacity.adults} adults + ${selectedRoom.capacity.children} children)`
          }));
          return; // Don't update if it exceeds capacity
        } else {
          // Clear error if within capacity
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.guests;
            return newErrors;
          });
        }
      }
      
      setBookingForm(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: value
        }
      }));
    } else {
      // Handle top-level fields
      setBookingForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

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
    
    // Check room capacity
    const roomToCheck = selectedRoom || rooms.find(r => r._id === bookingForm.roomId || r.id === bookingForm.roomId);
    if (roomToCheck) {
      const totalGuests = bookingForm.guests.adults + bookingForm.guests.children;
      const maxCapacity = roomToCheck.capacity.adults + roomToCheck.capacity.children;
      
      if (totalGuests > maxCapacity) {
        newErrors.guests = `Maximum capacity for this room is ${maxCapacity} guests`;
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
    
    // Ensure we have a room selected
    if (!selectedRoom && bookingForm.roomId) {
      const room = rooms.find(r => r._id === bookingForm.roomId || r.id === bookingForm.roomId);
      if (room) {
        setSelectedRoom(room);
      }
    }
    
    // Validate form
    if (!validateForm() || !selectedRoom) {
      console.log('Form validation failed or no room selected');
      console.log('Validation result:', !validateForm());
      console.log('Selected room exists:', !!selectedRoom);
      return;
    }

    // Step 1: build payload and open payment modal instead of calling API directly
    try {
      setBookingError(null);

      const checkInDate = new Date(bookingForm.checkInDate);
      checkInDate.setUTCHours(12, 0, 0, 0);
      const checkOutDate = new Date(bookingForm.checkOutDate);
      checkOutDate.setUTCHours(12, 0, 0, 0);

      const bookingData = {
        roomId: selectedRoom._id || selectedRoom.id, // Use _id if available, fallback to id
        checkInDate: checkInDate.toISOString(),
        checkOutDate: checkOutDate.toISOString(),
        guestDetails: {
          primaryGuest: {
            name: bookingForm.guestDetails.name.trim(),
            email: bookingForm.guestDetails.email.trim(),
            phone: bookingForm.guestDetails.phone.replace(/[^0-9]/g, '')
          },
          totalAdults: bookingForm.guests.adults,
          totalChildren: bookingForm.guests.children,
          additionalGuests: bookingForm.additionalGuests || []
        }
      };

      setPendingBookingPayload(bookingData);
      setShowBookingModal(false);
      setShowPaymentModal(true);
    } catch (error: any) {
      console.error('Error preparing booking payload:', error);
      setBookingError('Failed to prepare booking. Please try again.');
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingBookingPayload || !selectedRoom) return;

    // Validate payment method selection
    if (!selectedPaymentMethod) {
      setBookingError('Please select a payment method');
      return;
    }

    // For Cash payment, proceed directly
    if (selectedPaymentMethod === 'Cash') {
      await processBookingWithPayment(null);
      return;
    }

    // For other payment methods, open respective modals
    setShowPaymentModal(false);
    
    if (selectedPaymentMethod === 'Card') {
      setShowCardPaymentModal(true);
    } else if (selectedPaymentMethod === 'UPI') {
      setShowUPIPaymentModal(true);
    } else if (selectedPaymentMethod === 'Online') {
      setShowOnlineBankingModal(true);
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
        setSuccess(true);
        
        // Close all modals
        setShowPaymentModal(false);
        setShowCardPaymentModal(false);
        setShowUPIPaymentModal(false);
        setShowOnlineBankingModal(false);
        
        // Clear form and reset state
        setPendingBookingPayload(null);
        setAppliedDiscount(null);
        setSelectedPaymentMethod('Cash');
        setCardDetails({ cardNumber: '', cardHolderName: '', expiryMonth: '', expiryYear: '', cvv: '' });
        setUpiDetails({ upiId: '', upiName: '' });
        setBankingDetails({ bankName: '', accountNumber: '', ifscCode: '' });
        setCardErrors({});
        setUpiErrors({});
        setBankingErrors({});
        
        const bookingId = response.data?.bookingId || 'your booking';
        toast.success(`Booking received successfully! Your booking ID is ${bookingId}. Awaiting admin confirmation.`, {
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Trigger notification
        if ((response.data as any)?.notificationTrigger) {
          console.log('Triggering notification:', (response.data as any).notificationTrigger);
          triggerBookingNotification((response.data as any).notificationTrigger);
        }
        
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

      setBookingError(errorMessage);
      
      // Reopen payment modal on error
      setShowPaymentModal(true);
      setShowCardPaymentModal(false);
      setShowUPIPaymentModal(false);
      setShowOnlineBankingModal(false);
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle card payment submission
  const handleCardPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all card fields
    const newErrors: Record<string, string> = {};
    
    const cardNumberError = validateCardNumber(cardDetails.cardNumber);
    if (cardNumberError) newErrors.cardNumber = cardNumberError;
    
    const nameError = validateCardHolderName(cardDetails.cardHolderName);
    if (nameError) newErrors.cardHolderName = nameError;
    
    const expiryError = validateExpiryDate(cardDetails.expiryMonth, cardDetails.expiryYear);
    if (expiryError) newErrors.expiry = expiryError;
    
    const cvvError = validateCVV(cardDetails.cvv, cardDetails.cardNumber);
    if (cvvError) newErrors.cvv = cvvError;
    
    if (Object.keys(newErrors).length > 0) {
      setCardErrors(newErrors);
      toast.error('Please fix all validation errors before proceeding');
      return;
    }

    // Simulate payment processing and generate transaction ID
    const transactionId = `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentData = {
      transactionId,
      cardLast4: cardDetails.cardNumber.slice(-4),
      cardHolderName: cardDetails.cardHolderName,
      cardBrand: getCardBrand(cardDetails.cardNumber)
    };

    await processBookingWithPayment(paymentData);
  };

  // Handle UPI payment submission
  const handleUPIPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate UPI details
    const upiError = validateUPIId(upiDetails.upiId);
    if (upiError) {
      setUpiErrors({ upiId: upiError });
      toast.error('Please fix validation errors before proceeding');
      return;
    }

    // Simulate payment processing and generate transaction ID
    const transactionId = `UPI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentData = {
      transactionId,
      upiId: upiDetails.upiId,
      upiName: upiDetails.upiName || 'UPI User'
    };

    await processBookingWithPayment(paymentData);
  };

  // Handle online banking payment submission
  const handleOnlineBankingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate banking details
    const newErrors: Record<string, string> = {};
    
    const bankError = validateBankName(bankingDetails.bankName);
    if (bankError) newErrors.bankName = bankError;
    
    if (bankingDetails.accountNumber) {
      const accError = validateAccountNumber(bankingDetails.accountNumber);
      if (accError) newErrors.accountNumber = accError;
    }
    
    if (bankingDetails.ifscCode) {
      const ifscError = validateIFSC(bankingDetails.ifscCode);
      if (ifscError) newErrors.ifscCode = ifscError;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setBankingErrors(newErrors);
      toast.error('Please fix validation errors before proceeding');
      return;
    }

    // Simulate payment processing and generate transaction ID
    const transactionId = `BANK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentData = {
      transactionId,
      bankName: bankingDetails.bankName,
      accountLast4: bankingDetails.accountNumber ? bankingDetails.accountNumber.slice(-4) : 'XXXX'
    };

    await processBookingWithPayment(paymentData);
  };

  // Get card brand from card number
  const getCardBrand = (cardNumber: string): string => {
    const number = cardNumber.replace(/\s/g, '');
    if (/^4/.test(number)) return 'Visa';
    if (/^5[1-5]/.test(number)) return 'Mastercard';
    if (/^3[47]/.test(number)) return 'American Express';
    if (/^6(?:011|5)/.test(number)) return 'Discover';
    return 'Unknown';
  };

  // Real-time Card Validation
  const validateCardNumber = (cardNumber: string): string => {
    const number = cardNumber.replace(/\s/g, '');
    if (!number) return 'Card number is required';
    if (number.length < 13) return 'Card number must be at least 13 digits';
    if (number.length > 19) return 'Card number is too long';
    if (!/^\d+$/.test(number)) return 'Card number must contain only digits';
    
    // Luhn algorithm validation
    let sum = 0;
    let isEven = false;
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    if (sum % 10 !== 0) return 'Invalid card number';
    
    return '';
  };

  const validateCardHolderName = (name: string): string => {
    if (!name.trim()) return 'Card holder name is required';
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    if (!/^[a-zA-Z\s]+$/.test(name)) return 'Name must contain only letters';
    return '';
  };

  const validateExpiryDate = (month: string, year: string): string => {
    if (!month) return 'Expiry month is required';
    if (!year) return 'Expiry year is required';
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const expYear = parseInt(year);
    const expMonth = parseInt(month);
    
    if (expYear < currentYear) return 'Card has expired';
    if (expYear === currentYear && expMonth < currentMonth) return 'Card has expired';
    
    return '';
  };

  const validateCVV = (cvv: string, cardNumber: string): string => {
    if (!cvv) return 'CVV is required';
    const number = cardNumber.replace(/\s/g, '');
    const isAmex = /^3[47]/.test(number);
    const requiredLength = isAmex ? 4 : 3;
    
    if (cvv.length !== requiredLength) {
      return `CVV must be ${requiredLength} digits for ${isAmex ? 'American Express' : 'this card'}`;
    }
    if (!/^\d+$/.test(cvv)) return 'CVV must contain only digits';
    
    return '';
  };

  // Real-time UPI Validation
  const validateUPIId = (upiId: string): string => {
    if (!upiId.trim()) return 'UPI ID is required';
    
    // UPI ID format: username@provider
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    if (!upiRegex.test(upiId)) {
      return 'Invalid UPI ID format (e.g., yourname@paytm)';
    }
    
    const [username, provider] = upiId.split('@');
    if (username.length < 3) return 'UPI username must be at least 3 characters';
    
    const validProviders = ['paytm', 'googlepay', 'phonepe', 'amazonpay', 'bhim', 'ybl', 'okaxis', 'oksbi', 'okicici', 'okhdfcbank', 'axl', 'ibl', 'icici'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return 'Please use a valid UPI provider (e.g., paytm, googlepay, phonepe)';
    }
    
    return '';
  };

  // Real-time Banking Validation
  const validateBankName = (bankName: string): string => {
    if (!bankName) return 'Please select a bank';
    return '';
  };

  const validateAccountNumber = (accountNumber: string): string => {
    if (!accountNumber) return ''; // Optional field
    
    const number = accountNumber.replace(/\s/g, '');
    if (number.length < 9) return 'Account number must be at least 9 digits';
    if (number.length > 18) return 'Account number is too long';
    if (!/^\d+$/.test(number)) return 'Account number must contain only digits';
    
    return '';
  };

  const validateIFSC = (ifscCode: string): string => {
    if (!ifscCode) return ''; // Optional field
    
    // IFSC format: 4 letters + 0 + 6 alphanumeric
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode)) {
      return 'Invalid IFSC code format (e.g., SBIN0001234)';
    }
    
    return '';
  };

  // Handle card input changes with validation
  const handleCardInputChange = (field: string, value: string) => {
    const newCardDetails = { ...cardDetails, [field]: value };
    setCardDetails(newCardDetails);
    
    const newErrors = { ...cardErrors };
    
    switch (field) {
      case 'cardNumber':
        const error = validateCardNumber(value);
        if (error) {
          newErrors.cardNumber = error;
        } else {
          delete newErrors.cardNumber;
        }
        break;
      case 'cardHolderName':
        const nameError = validateCardHolderName(value);
        if (nameError) {
          newErrors.cardHolderName = nameError;
        } else {
          delete newErrors.cardHolderName;
        }
        break;
      case 'cvv':
        const cvvError = validateCVV(value, newCardDetails.cardNumber);
        if (cvvError) {
          newErrors.cvv = cvvError;
        } else {
          delete newErrors.cvv;
        }
        break;
      case 'expiryMonth':
      case 'expiryYear':
        const expiryError = validateExpiryDate(
          field === 'expiryMonth' ? value : newCardDetails.expiryMonth,
          field === 'expiryYear' ? value : newCardDetails.expiryYear
        );
        if (expiryError) {
          newErrors.expiry = expiryError;
        } else {
          delete newErrors.expiry;
        }
        break;
    }
    
    setCardErrors(newErrors);
  };

  // Handle UPI input changes with validation
  const handleUPIInputChange = (field: string, value: string) => {
    setUpiDetails({ ...upiDetails, [field]: value });
    
    const newErrors = { ...upiErrors };
    
    if (field === 'upiId') {
      const error = validateUPIId(value);
      if (error) {
        newErrors.upiId = error;
      } else {
        delete newErrors.upiId;
      }
    }
    
    setUpiErrors(newErrors);
  };

  // Handle banking input changes with validation
  const handleBankingInputChange = (field: string, value: string) => {
    setBankingDetails({ ...bankingDetails, [field]: value });
    
    const newErrors = { ...bankingErrors };
    
    switch (field) {
      case 'bankName':
        const bankError = validateBankName(value);
        if (bankError) {
          newErrors.bankName = bankError;
        } else {
          delete newErrors.bankName;
        }
        break;
      case 'accountNumber':
        const accError = validateAccountNumber(value);
        if (accError) {
          newErrors.accountNumber = accError;
        } else {
          delete newErrors.accountNumber;
        }
        break;
      case 'ifscCode':
        const ifscError = validateIFSC(value);
        if (ifscError) {
          newErrors.ifscCode = ifscError;
        } else {
          delete newErrors.ifscCode;
        }
        break;
    }
    
    setBankingErrors(newErrors);
  };

  // Calculate total price when dates or room changes
  useEffect(() => {
    if (selectedRoom && bookingForm.checkInDate && bookingForm.checkOutDate) {
      const nights = differenceInDays(
        new Date(bookingForm.checkOutDate),
        new Date(bookingForm.checkInDate)
      ) || 1;
      
      const basePrice = selectedRoom.price.basePrice;
      const subtotal = basePrice * nights;
      
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
  }, [bookingForm.checkInDate, bookingForm.checkOutDate, selectedRoom, appliedDiscount]);

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
                    {room.status === 'Available' ? (
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
                          <Badge key={feature} bg="light" text="dark" className="small me-1 mb-1">
                            {feature.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </Badge>
                        )) : null}
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <Button 
                      variant={room.status === 'Available' ? "primary" : "secondary"} 
                      className="w-100"
                      disabled={room.status !== 'Available'}
                      onClick={() => handleBookRoom(room)}
                    >
                      {room.status === 'Available' ? 'Book Now' : room.status === 'Occupied' ? 'Booked' : 'Not Available'}
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

      {/* Booking Modal */}
      <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Book {selectedRoom?.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitBooking}>
          <Modal.Body>
            {bookingError ? (
              <Alert variant="danger" className="mb-4">
                <XCircle size={20} className="me-2" />
                {bookingError}
              </Alert>
            ) : null}
            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <Calendar size={16} className="me-1" />
                    Check-in Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={bookingForm.checkInDate}
                    onChange={(e) => handleFormChange('checkInDate', e.target.value)}
                    isInvalid={!!errors.checkInDate}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.checkInDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <Calendar size={16} className="me-1" />
                    Check-out Date
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={bookingForm.checkOutDate}
                    onChange={(e) => handleFormChange('checkOutDate', e.target.value)}
                    isInvalid={!!errors.checkOutDate}
                    min={bookingForm.checkInDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.checkOutDate}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Adults</Form.Label>
                  <Form.Select
                    value={bookingForm.guests.adults}
                    onChange={(e) => handleFormChange('guests.adults', parseInt(e.target.value))}
                    isInvalid={!!errors.guests}
                  >
                    {Array.from({ length: selectedRoom?.capacity.adults || 4 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </Form.Select>
                  {selectedRoom && (
                    <Form.Text className="text-muted">
                      {/* Maximum {selectedRoom.capacity.adults} adults */}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Children</Form.Label>
                  <Form.Select
                    value={bookingForm.guests.children}
                    onChange={(e) => handleFormChange('guests.children', parseInt(e.target.value))}
                    isInvalid={!!errors.guests}
                  >
                    {Array.from({ length: (selectedRoom?.capacity.children || 3) + 1 }, (_, i) => i).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </Form.Select>
                  {selectedRoom && (
                    <Form.Text className="text-muted">
                      {/* Maximum {selectedRoom.capacity.children} children */}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>
            
            {/* {errors.guests && (
              <Alert variant="danger" className="mb-3">
                {errors.guests}
              </Alert>
            )}
            
            {selectedRoom && (
              <Alert variant="info" className="mb-3">
                <strong>Room Capacity:</strong> Maximum {selectedRoom.capacity.adults + selectedRoom.capacity.children} guests 
                ({selectedRoom.capacity.adults} {selectedRoom.capacity.adults === 1 ? 'adult' : 'adults'} + {selectedRoom.capacity.children} {selectedRoom.capacity.children === 1 ? 'child' : 'children'})
                <br />
                <small>Current selection: {bookingForm.guests.adults + bookingForm.guests.children} guests 
                ({bookingForm.guests.adults} {bookingForm.guests.adults === 1 ? 'adult' : 'adults'} + {bookingForm.guests.children} {bookingForm.guests.children === 1 ? 'child' : 'children'})</small>
              </Alert>
            )} */}

            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Full Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={bookingForm.guestDetails.name}
                    onChange={(e) => handleFormChange('guestDetails.name', e.target.value)}
                    isInvalid={!!errors['guestDetails.name']}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['guestDetails.name']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={bookingForm.guestDetails.email}
                    onChange={(e) => handleFormChange('guestDetails.email', e.target.value)}
                    isInvalid={!!errors['guestDetails.email']}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['guestDetails.email']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control
                    type="tel"
                    value={bookingForm.guestDetails.phone}
                    onChange={(e) => handleFormChange('guestDetails.phone', e.target.value)}
                    isInvalid={!!errors['guestDetails.phone']}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors['guestDetails.phone']}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Special Requests (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={bookingForm.specialRequests}
                    onChange={(e) => handleFormChange('specialRequests', e.target.value)}
                    placeholder="Any special requirements..."
                  />
                </Form.Group>
              </Col>
            </Row>

            {selectedRoom && bookingForm.checkInDate && bookingForm.checkOutDate && (
              <Alert variant="info">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Subtotal: ₹{subtotalAmount.toFixed(2)}</strong>
                    <br />
                    <small>
                      {totalNights} nights × ₹{selectedRoom.price.basePrice}/night
                    </small>
                  </div>
                </div>
                {appliedDiscount && (
                  <div className="mt-2 pt-2 border-top">
                    <div className="d-flex justify-content-between">
                      <small>Discount ({appliedDiscount.code}):</small>
                      <small className="text-success">-₹{appliedDiscount.discountAmount.toFixed(2)}</small>
                    </div>
                    <div className="d-flex justify-content-between">
                      <strong>Final Total:</strong>
                      <strong className="text-primary">₹{finalAmount.toFixed(2)}</strong>
                    </div>
                  </div>
                )}
              </Alert>
            )}
          </Modal.Body>
          
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBookingModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Continue to Payment
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Payment Method Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Complete Your Booking</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bookingError && (
            <Alert variant="danger" className="mb-3">
              {bookingError}
            </Alert>
          )}
          
          {/* Booking Summary */}
          {selectedRoom && (
            <Card className="mb-4">
              <Card.Header>
                <h6 className="mb-0">Booking Summary</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <p className="mb-1"><strong>Room:</strong> {selectedRoom.name}</p>
                    <p className="mb-1"><strong>Check-in:</strong> {bookingForm.checkInDate}</p>
                    <p className="mb-1"><strong>Check-out:</strong> {bookingForm.checkOutDate}</p>
                    <p className="mb-0"><strong>Nights:</strong> {totalNights}</p>
                  </Col>
                  <Col md={6}>
                    <p className="mb-1"><strong>Guests:</strong> {bookingForm.guests.adults} Adults{bookingForm.guests.children > 0 && `, ${bookingForm.guests.children} Children`}</p>
                    <p className="mb-1"><strong>Rate:</strong> ₹{selectedRoom.price.basePrice}/night</p>
                    <p className="mb-1"><strong>Subtotal:</strong> ₹{subtotalAmount.toFixed(2)}</p>
                    {appliedDiscount && (
                      <>
                        <p className="mb-1 text-success">
                          <strong>Discount ({appliedDiscount.code}):</strong> -₹{appliedDiscount.discountAmount.toFixed(2)}
                        </p>
                        <p className="mb-0 text-primary">
                          <strong>Final Total:</strong> ₹{finalAmount.toFixed(2)}
                        </p>
                      </>
                    )}
                    {!appliedDiscount && (
                      <p className="mb-0 text-primary">
                        <strong>Total:</strong> ₹{totalAmount.toFixed(2)}
                      </p>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Discount Code Section */}
          <Card className="mb-4">
            <Card.Body>
              <DiscountCode
                subtotal={subtotalAmount}
                onDiscountApplied={handleDiscountApplied}
                disabled={submitting}
              />
            </Card.Body>
          </Card>

          {/* Payment Method Selection */}
          <Card>
            <Card.Header>
              <h6 className="mb-0">Payment Method</h6>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Select Payment Method *</Form.Label>
                  <Form.Select
                    value={selectedPaymentMethod}
                    onChange={(e) => {
                      setSelectedPaymentMethod(e.target.value as any);
                      setBookingError(null); // Clear errors when changing payment method
                    }}
                    disabled={submitting}
                    required
                  >
                    <option value="Cash">💰 Cash on Arrival - Pay at hotel during check-in</option>
                    <option value="Card">💳 Credit/Debit Card - Secure online payment</option>
                    <option value="UPI">📱 UPI Payment - Quick UPI transfer</option>
                    <option value="Online">🏦 Online Banking - Direct bank transfer</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {selectedPaymentMethod === 'Cash' && '✓ Your booking will be confirmed immediately. Pay at the hotel during check-in.'}
                    {selectedPaymentMethod === 'Card' && '✓ Secure payment processing. Your booking will be confirmed after successful payment.'}
                    {selectedPaymentMethod === 'UPI' && '✓ Fast and secure UPI payment. Booking confirmed after successful transaction.'}
                    {selectedPaymentMethod === 'Online' && '✓ Direct bank transfer. Booking confirmed after payment verification.'}
                  </Form.Text>
                </Form.Group>
                
                {selectedPaymentMethod === 'Cash' && (
                  <Alert variant="info" className="mb-0">
                    <strong>Cash Payment Information:</strong>
                    <ul className="mb-0 mt-2">
                      <li>Your booking will be confirmed immediately</li>
                      <li>No online payment required</li>
                      <li>Pay the full amount at the hotel during check-in</li>
                      <li>Cancellation policy applies as per terms</li>
                    </ul>
                  </Alert>
                )}
                
                {selectedPaymentMethod !== 'Cash' && (
                  <Alert variant="warning" className="mb-0">
                    <strong>Online Payment:</strong>
                    <p className="mb-0">You will be redirected to the payment gateway to complete your {selectedPaymentMethod} payment securely.</p>
                  </Alert>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowPaymentModal(false);
              setShowBookingModal(true);
            }}
            disabled={submitting || processingPayment}
          >
            Back
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirmPayment} 
            disabled={submitting || processingPayment}
            size="lg"
          >
            {submitting || processingPayment ? (
              <>
                <Spinner size="sm" className="me-2" />
                Processing...
              </>
            ) : selectedPaymentMethod === 'Cash' ? (
              `Confirm Booking - Pay ₹${(appliedDiscount ? finalAmount : totalAmount).toFixed(2)} at Hotel`
            ) : (
              `Proceed to ${selectedPaymentMethod} Payment`
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Card Payment Modal */}
      <Modal show={showCardPaymentModal} onHide={() => {
        if (!processingPayment) {
          setShowCardPaymentModal(false);
          setCardErrors({});
        }
      }} centered>
        <Modal.Header closeButton={!processingPayment}>
          <Modal.Title>💳 Card Payment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCardPaymentSubmit}>
          <Modal.Body>
            {bookingError && (
              <Alert variant="danger" className="mb-3">
                {bookingError}
              </Alert>
            )}

            <Alert variant="info" className="mb-3">
              <strong>Amount to Pay:</strong> ₹{(appliedDiscount ? finalAmount : totalAmount).toFixed(2)}
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Card Number *</Form.Label>
              <Form.Control
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.cardNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                  const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                  handleCardInputChange('cardNumber', formatted);
                }}
                maxLength={19}
                required
                disabled={processingPayment}
                isInvalid={!!cardErrors.cardNumber}
              />
              <Form.Control.Feedback type="invalid">
                {cardErrors.cardNumber}
              </Form.Control.Feedback>
              {cardDetails.cardNumber && !cardErrors.cardNumber && (
                <Form.Text className="text-success">
                  ✓ {getCardBrand(cardDetails.cardNumber)} card detected
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Card Holder Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="John Doe"
                value={cardDetails.cardHolderName}
                onChange={(e) => handleCardInputChange('cardHolderName', e.target.value)}
                required
                disabled={processingPayment}
                isInvalid={!!cardErrors.cardHolderName}
              />
              <Form.Control.Feedback type="invalid">
                {cardErrors.cardHolderName}
              </Form.Control.Feedback>
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Month *</Form.Label>
                  <Form.Select
                    value={cardDetails.expiryMonth}
                    onChange={(e) => handleCardInputChange('expiryMonth', e.target.value)}
                    required
                    disabled={processingPayment}
                    isInvalid={!!cardErrors.expiry}
                  >
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Year *</Form.Label>
                  <Form.Select
                    value={cardDetails.expiryYear}
                    onChange={(e) => handleCardInputChange('expiryYear', e.target.value)}
                    required
                    disabled={processingPayment}
                    isInvalid={!!cardErrors.expiry}
                  >
                    <option value="">YYYY</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>CVV *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="123"
                    value={cardDetails.cvv}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                      handleCardInputChange('cvv', value);
                    }}
                    maxLength={4}
                    required
                    disabled={processingPayment}
                    isInvalid={!!cardErrors.cvv}
                  />
                  <Form.Control.Feedback type="invalid">
                    {cardErrors.cvv}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            {cardErrors.expiry && (
              <Alert variant="danger" className="mb-3">
                {cardErrors.expiry}
              </Alert>
            )}

            <Alert variant="secondary" className="mb-0">
              <small>
                🔒 Your card information is secure and encrypted. We use industry-standard security measures.
              </small>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowCardPaymentModal(false);
                setShowPaymentModal(true);
                setCardErrors({});
              }}
              disabled={processingPayment}
            >
              Back
            </Button>
            <Button variant="primary" type="submit" disabled={processingPayment}>
              {processingPayment ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Processing Payment...
                </>
              ) : (
                `Pay ₹${(appliedDiscount ? finalAmount : totalAmount).toFixed(2)}`
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* UPI Payment Modal */}
      <Modal show={showUPIPaymentModal} onHide={() => {
        if (!processingPayment) {
          setShowUPIPaymentModal(false);
          setUpiErrors({});
        }
      }} centered>
        <Modal.Header closeButton={!processingPayment}>
          <Modal.Title>📱 UPI Payment</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUPIPaymentSubmit}>
          <Modal.Body>
            {bookingError && (
              <Alert variant="danger" className="mb-3">
                {bookingError}
              </Alert>
            )}

            <Alert variant="info" className="mb-3">
              <strong>Amount to Pay:</strong> ₹{(appliedDiscount ? finalAmount : totalAmount).toFixed(2)}
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>UPI ID *</Form.Label>
              <Form.Control
                type="text"
                placeholder="yourname@upi"
                value={upiDetails.upiId}
                onChange={(e) => handleUPIInputChange('upiId', e.target.value.toLowerCase())}
                required
                disabled={processingPayment}
                isInvalid={!!upiErrors.upiId}
              />
              <Form.Control.Feedback type="invalid">
                {upiErrors.upiId}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Enter your UPI ID (e.g., yourname@paytm, yourname@googlepay)
              </Form.Text>
              {upiDetails.upiId && !upiErrors.upiId && (
                <Form.Text className="text-success d-block">
                  ✓ Valid UPI ID format
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Name (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Your Name"
                value={upiDetails.upiName}
                onChange={(e) => handleUPIInputChange('upiName', e.target.value)}
                disabled={processingPayment}
              />
            </Form.Group>

            <Alert variant="secondary" className="mb-0">
              <small>
                💡 You will receive a payment request on your UPI app. Please approve it to complete the booking.
              </small>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowUPIPaymentModal(false);
                setShowPaymentModal(true);
                setUpiErrors({});
              }}
              disabled={processingPayment}
            >
              Back
            </Button>
            <Button variant="primary" type="submit" disabled={processingPayment}>
              {processingPayment ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Processing Payment...
                </>
              ) : (
                `Pay ₹${(appliedDiscount ? finalAmount : totalAmount).toFixed(2)} via UPI`
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Online Banking Modal */}
      <Modal show={showOnlineBankingModal} onHide={() => {
        if (!processingPayment) {
          setShowOnlineBankingModal(false);
          setBankingErrors({});
        }
      }} centered>
        <Modal.Header closeButton={!processingPayment}>
          <Modal.Title>🏦 Online Banking</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleOnlineBankingSubmit}>
          <Modal.Body>
            {bookingError && (
              <Alert variant="danger" className="mb-3">
                {bookingError}
              </Alert>
            )}

            <Alert variant="info" className="mb-3">
              <strong>Amount to Pay:</strong> ₹{(appliedDiscount ? finalAmount : totalAmount).toFixed(2)}
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>Select Your Bank *</Form.Label>
              <Form.Select
                value={bankingDetails.bankName}
                onChange={(e) => handleBankingInputChange('bankName', e.target.value)}
                required
                disabled={processingPayment}
                isInvalid={!!bankingErrors.bankName}
              >
                <option value="">Choose your bank...</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
                <option value="Bank of Baroda">Bank of Baroda</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                <option value="IndusInd Bank">IndusInd Bank</option>
                <option value="Yes Bank">Yes Bank</option>
                <option value="IDFC First Bank">IDFC First Bank</option>
                <option value="Other">Other Bank</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {bankingErrors.bankName}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Account Number (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="XXXX XXXX XXXX 1234"
                value={bankingDetails.accountNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  handleBankingInputChange('accountNumber', value);
                }}
                disabled={processingPayment}
                isInvalid={!!bankingErrors.accountNumber}
              />
              <Form.Control.Feedback type="invalid">
                {bankingErrors.accountNumber}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Last 4 digits will be stored for reference
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>IFSC Code (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="SBIN0001234"
                value={bankingDetails.ifscCode}
                onChange={(e) => handleBankingInputChange('ifscCode', e.target.value.toUpperCase())}
                maxLength={11}
                disabled={processingPayment}
                isInvalid={!!bankingErrors.ifscCode}
              />
              <Form.Control.Feedback type="invalid">
                {bankingErrors.ifscCode}
              </Form.Control.Feedback>
              {bankingDetails.ifscCode && !bankingErrors.ifscCode && bankingDetails.ifscCode.length === 11 && (
                <Form.Text className="text-success d-block">
                  ✓ Valid IFSC code format
                </Form.Text>
              )}
            </Form.Group>

            <Alert variant="secondary" className="mb-0">
              <small>
                🔒 You will be redirected to your bank's secure payment gateway to complete the transaction.
              </small>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowOnlineBankingModal(false);
                setShowPaymentModal(true);
                setBankingErrors({});
              }}
              disabled={processingPayment}
            >
              Back
            </Button>
            <Button variant="primary" type="submit" disabled={processingPayment}>
              {processingPayment ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Processing Payment...
                </>
              ) : (
                `Pay ₹${(appliedDiscount ? finalAmount : totalAmount).toFixed(2)} via Net Banking`
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Booking;