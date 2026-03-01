import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { adminAPI, paymentsAPI } from '../../services/api';
import { Room } from '../../types';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

interface OfflineBookingModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: () => void;
    rooms: Room[];
}

const OfflineBookingModal: React.FC<OfflineBookingModalProps> = ({ show, onHide, onSuccess, rooms }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        roomId: '',
        checkInDate: '',
        checkOutDate: '',
        adults: 1,
        children: 0,
        roomCount: 1,
        amount: 0,
        paymentMethod: 'Cash'
    });
    const [gstRate, setGstRate] = useState(18);

    React.useEffect(() => {
        const fetchGst = async () => {
            try {
                const response = await adminAPI.getSettings();
                if (response.success && response.data) {
                    setGstRate(response.data.gstPercentage);
                }
            } catch (err) {
                console.error('Failed to fetch GST settings:', err);
            }
        };
        fetchGst();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNext = () => {
        setError(null);
        if (step === 1) {
            if (!formData.name || !formData.phone || !formData.email) {
                setError("Name, Phone, and Email are required.");
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setError("Please enter a valid email address.");
                return;
            }
        }
        if (step === 2) {
            if (!formData.roomId || !formData.checkInDate || !formData.checkOutDate) {
                setError("Please select room and dates.");
                return;
            }
            // Simple validation
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkIn = new Date(formData.checkInDate);
            const checkOut = new Date(formData.checkOutDate);

            if (checkIn < today) {
                setError("Check-in date cannot be in the past.");
                return;
            }
            if (checkIn >= checkOut) {
                setError("Check-out date must be after Check-in date.");
                return;
            }

            // Calculate amount (simplified, ideally fetch from backend or efficient local calc)
            const selectedRoom = rooms.find(r => r._id === formData.roomId || r.id === formData.roomId);
            if (selectedRoom) {
                const start = new Date(formData.checkInDate);
                const end = new Date(formData.checkOutDate);
                const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
                const price = selectedRoom.price.basePrice * nights * (formData.roomCount || 1);
                const gst = price * (gstRate / 100); // Dynamic GST
                setFormData(prev => ({ ...prev, amount: price + gst }));

                // Validate adults against room capacity
                if ((selectedRoom.capacity?.adults || 2) < formData.adults) {
                    setError(`Selected room allows maximum ${selectedRoom.capacity?.adults || 2} adults.`);
                    return;
                }
            }
        }

        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        setError(null);
    };

    // Handle Razorpay Payment
    const handleRazorpayPayment = async () => {
        const selectedRoom = rooms.find(r => r._id === formData.roomId || r.id === formData.roomId);
        if (!selectedRoom) return;

        try {
            setLoading(true);
            setError(null);

            // 1. Create Razorpay Order
            const orderResponse = await paymentsAPI.createRazorpayOrder(
                formData.amount,
                'INR',
                {
                    roomId: selectedRoom._id || selectedRoom.id,
                    roomName: selectedRoom.name,
                    checkIn: formData.checkInDate,
                    checkOut: formData.checkOutDate,
                    isOfflineBooking: true
                }
            );

            if (!orderResponse.success || !orderResponse.data) {
                throw new Error(orderResponse.message || 'Failed to create Razorpay order');
            }

            const { orderId, amount, currency, keyId } = orderResponse.data;

            // 2. Open Razorpay Checkout
            const options = {
                key: keyId,
                amount: amount,
                currency: currency,
                name: 'Luxury Hotel (Admin)',
                description: `Offline Booking for ${selectedRoom.name}`,
                order_id: orderId,
                prefill: {
                    name: formData.name,
                    email: formData.email,
                    contact: formData.phone
                },
                theme: {
                    color: '#c8a456'
                },
                handler: async function (response: any) {
                    // 3. Verify Payment
                    try {
                        const verifyResponse = await paymentsAPI.verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });

                        if (!verifyResponse.success) {
                            throw new Error('Payment verification failed');
                        }

                        // 4. Create Booking with Payment Details
                        await createBooking({
                            amount: formData.amount,
                            method: verifyResponse.data?.method || 'Razorpay',
                            transactionId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id,
                            paymentDate: new Date()
                        });

                    } catch (verifyError: any) {
                        console.error('Payment verification error:', verifyError);
                        setError('Payment verification failed. Please try again.');
                        setLoading(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                        toast.error('Payment cancelled');
                    }
                }
            };

            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();

        } catch (err: any) {
            console.error('Razorpay init error:', err);
            setError(err.message || 'Failed to initiate Razorpay payment');
            setLoading(false);
        }
    };

    const createBooking = async (paymentDetails: any) => {
        try {
            const roomsToBook = Array.from({ length: formData.roomCount || 1 }, () => ({
                roomId: formData.roomId,
                adults: Math.ceil(Number(formData.adults) / (formData.roomCount || 1)),
                children: Math.floor(Number(formData.children) / (formData.roomCount || 1))
            }));

            await adminAPI.createOfflineBooking({
                customerDetails: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone
                },
                rooms: roomsToBook,
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate,
                guestDetails: {
                    totalAdults: Number(formData.adults),
                    totalChildren: Number(formData.children)
                },
                paymentDetails: paymentDetails,
                status: 'Confirmed'
            });

            onSuccess();
            onHide();
            // Reset form
            setStep(1);
            setFormData({
                name: '',
                email: '',
                phone: '',
                roomId: '',
                checkInDate: '',
                checkOutDate: '',
                adults: 1,
                children: 0,
                roomCount: 1,
                amount: 0,
                paymentMethod: 'Cash'
            });
            toast.success('Offline booking created successfully!');
        } catch (err: any) {
            setError(err?.response?.data?.message || err.message || "Failed to create booking");
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (formData.paymentMethod === 'Razorpay') {
            await handleRazorpayPayment();
        } else {
            // Cash Payment
            setLoading(true);
            await createBooking({
                amount: formData.amount,
                method: 'Cash'
            });
            setLoading(false); // Only needed if createBooking fails/finishes here?
            // actually createBooking handles closing modal or setting error.
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered contentClassName="admin-modal-content">
            <Modal.Header closeButton className="admin-modal-header border-bottom-0 pb-0">
                <Modal.Title className="fw-bolder">New Offline Booking</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {error && <div className="alert alert-danger d-flex align-items-center mb-4"><AlertCircle size={18} className="me-2" />{error}</div>}

                {step === 1 && (
                    <div className="animate-fade-in">
                        <div className="mb-4 d-flex align-items-center">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>1</div>
                            <h5 className="mb-0 fw-bold text-dark">Customer Details</h5>
                        </div>

                        <div className="row g-4">
                            <div className="col-md-6">
                                <label className="admin-form-label">Guest Name <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter full name"
                                    className="admin-form-control w-100"
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="admin-form-label">Phone Number <span className="text-danger">*</span></label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter phone"
                                    className="admin-form-control w-100"
                                />
                            </div>
                            <div className="col-12">
                                <label className="admin-form-label">Email <span className="text-danger">*</span></label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter email address"
                                    className="admin-form-control w-100"
                                />
                                <div className="form-text text-muted small mt-1">
                                    Booking confirmation and login details will be sent here.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in">
                        <div className="mb-4 d-flex align-items-center">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>2</div>
                            <h5 className="mb-0 fw-bold text-dark">Booking Details</h5>
                        </div>

                        <div className="row g-4">
                            <div className="col-12">
                                <label className="admin-form-label">Room Type <span className="text-danger">*</span></label>
                                <select
                                    name="roomId"
                                    value={formData.roomId}
                                    onChange={handleChange}
                                    className="admin-form-select w-100"
                                >
                                    <option value="">Select Room Type</option>
                                    {rooms.map(room => (
                                        <option key={room.id || room._id} value={room.id || room._id}>
                                            {`${room.name} - ₹${room.price.basePrice}/night`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-12">
                                <label className="admin-form-label">Number of Rooms <span className="text-danger">*</span></label>
                                <input
                                    type="number"
                                    name="roomCount"
                                    value={formData.roomCount}
                                    onChange={handleChange}
                                    min={1}
                                    max={10}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    className="admin-form-control w-100"
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="admin-form-label">Check-in Date <span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    name="checkInDate"
                                    value={formData.checkInDate}
                                    onChange={handleChange}
                                    className="admin-form-control w-100"
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="admin-form-label">Check-out Date <span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    name="checkOutDate"
                                    value={formData.checkOutDate}
                                    onChange={handleChange}
                                    className="admin-form-control w-100"
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="admin-form-label">Adults {formData.roomId && rooms.find(r => r.id === formData.roomId || r._id === formData.roomId)?.capacity?.adults && `(Max: ${rooms.find(r => r.id === formData.roomId || r._id === formData.roomId)?.capacity.adults})`}</label>
                                <input
                                    type="number"
                                    name="adults"
                                    value={formData.adults}
                                    onChange={handleChange}
                                    min={1}
                                    max={formData.roomId ? rooms.find(r => r.id === formData.roomId || r._id === formData.roomId)?.capacity?.adults : undefined}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    className="admin-form-control w-100"
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="admin-form-label">Children</label>
                                <input
                                    type="number"
                                    name="children"
                                    value={formData.children}
                                    onChange={handleChange}
                                    min={0}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    className="admin-form-control w-100"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in">
                        <div className="mb-4 d-flex align-items-center">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>3</div>
                            <h5 className="mb-0 fw-bold text-dark">Payment & Confirmation</h5>
                        </div>

                        <div className="card border-0 bg-light mb-4">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">Room Charges</span>
                                    <span className="fw-semibold">₹{formData.amount.toFixed(2)}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                    <span className="fw-bold">Total Payable</span>
                                    <span className="fw-bold fs-5 text-primary">₹{formData.amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="row g-4">
                            <div className="col-md-12">
                                <label className="admin-form-label">Payment Method</label>
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleChange}
                                    className="admin-form-select w-100"
                                >
                                    <option value="Cash">Cash (Paid at Hotel)</option>
                                    <option value="Razorpay">Razorpay (Online)</option>
                                </select>
                            </div>
                        </div>

                        {formData.paymentMethod === 'Razorpay' && (
                            <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-warning mt-3">
                                <AlertCircle size={16} className="me-2" />
                                You will be prompted to complete payment via Razorpay.
                            </div>
                        )}
                    </div>
                )}

            </Modal.Body>
            <Modal.Footer className="admin-modal-footer px-4 py-3 bg-light border-top">
                {step > 1 && (
                    <button className="admin-btn admin-btn-secondary" onClick={handleBack} disabled={loading}>
                        Back
                    </button>
                )}
                <div className="ms-auto">
                    {step < 3 ? (
                        <button className="admin-btn admin-btn-primary" onClick={handleNext}>
                            Next Step
                        </button>
                    ) : (
                        <button className="admin-btn admin-btn-success" onClick={handleSubmit} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (formData.paymentMethod === 'Razorpay' ? 'Pay & Book' : 'Confirm Booking')}
                        </button>
                    )}
                </div>
            </Modal.Footer>
        </Modal >
    );
};

export default OfflineBookingModal;
