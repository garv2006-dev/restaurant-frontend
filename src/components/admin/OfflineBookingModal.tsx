import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import { adminAPI, paymentsAPI } from '../../services/api';
import api from '../../services/api';
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
    const [gstRate, setGstRate] = useState(18);

    // Available room numbers fetched from backend
    const [availableRoomNumbers, setAvailableRoomNumbers] = useState<any[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [selectedRoomNumberIds, setSelectedRoomNumberIds] = useState<string[]>([]);

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
        amount: 0,
        paymentMethod: 'Cash'
    });

    // Fetch GST on mount
    useEffect(() => {
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

    // Fetch available room numbers when roomId OR dates change
    const fetchAvailableRoomNumbers = useCallback(async () => {
        if (!formData.roomId || !formData.checkInDate || !formData.checkOutDate) return;

        setLoadingRooms(true);
        setSelectedRoomNumberIds([]); // reset selection when room/dates change
        try {
            const res = await (api as any).get(`/room-numbers/available/${formData.roomId}`, {
                params: {
                    checkInDate: formData.checkInDate,
                    checkOutDate: formData.checkOutDate
                }
            });
            const data = res.data;
            if (data.success) {
                setAvailableRoomNumbers(data.data || []);
            } else {
                setAvailableRoomNumbers([]);
            }
        } catch (err) {
            console.error('Failed to fetch room numbers:', err);
            setAvailableRoomNumbers([]);
        } finally {
            setLoadingRooms(false);
        }
    }, [formData.roomId, formData.checkInDate, formData.checkOutDate]);

    useEffect(() => {
        fetchAvailableRoomNumbers();
    }, [fetchAvailableRoomNumbers]);

    // Derived values
    const selectedRoom = rooms.find(r => r._id === formData.roomId || r.id === formData.roomId);
    const maxAdultsPerRoom = selectedRoom?.capacity?.adults || 2;
    const maxChildrenPerRoom = selectedRoom?.capacity?.children || 0;
    const roomCount = selectedRoomNumberIds.length;
    const totalMaxAdults = maxAdultsPerRoom * (roomCount || 1);
    const totalMaxChildren = maxChildrenPerRoom * (roomCount || 1);

    // Recalculate amount whenever room count / dates change
    useEffect(() => {
        if (!selectedRoom || !formData.checkInDate || !formData.checkOutDate) return;
        const d1 = new Date(formData.checkInDate);
        d1.setHours(0, 0, 0, 0);
        const d2 = new Date(formData.checkOutDate);
        d2.setHours(0, 0, 0, 0);
        const nights = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
        if (nights <= 0) return;
        const priceBeforeGst = selectedRoom.price.basePrice * nights * (roomCount || 1);
        const gst = priceBeforeGst * (gstRate / 100);
        setFormData(prev => ({ ...prev, amount: priceBeforeGst + gst }));
    }, [selectedRoom, formData.checkInDate, formData.checkOutDate, roomCount, gstRate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        let { name, value } = e.target;
        if (name === 'phone') {
            value = value.replace(/[^0-9]/g, '').slice(0, 10);
        }

        if (name === 'checkInDate') {
            const checkIn = new Date(value);
            const checkOut = formData.checkOutDate ? new Date(formData.checkOutDate) : null;
            
            // If check-out is before or same as check-in, set it to check-in + 1 day
            if (checkOut && checkOut <= checkIn) {
                const nextDay = new Date(checkIn);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDayStr = nextDay.toISOString().split('T')[0];
                setFormData(prev => ({ ...prev, checkInDate: value, checkOutDate: nextDayStr }));
                return;
            }
        }

        if (name === 'checkOutDate' && formData.checkInDate) {
            const checkIn = new Date(formData.checkInDate);
            const checkOut = new Date(value);
            if (checkOut <= checkIn) {
                setError('Check-out date must be at least one day after Check-in.');
            } else {
                setError(null);
            }
        }

        setFormData(prev => ({ ...prev, [name]: name === 'adults' || name === 'children' ? Number(value) : value }));
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const checkOutMinStr = formData.checkInDate ? (() => {
        const d = new Date(formData.checkInDate);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    })() : todayStr;

    const toggleRoomNumber = (roomId: string) => {
        let newIds;
        if (selectedRoomNumberIds.includes(roomId)) {
            newIds = selectedRoomNumberIds.filter(id => id !== roomId);
        } else {
            newIds = [...selectedRoomNumberIds, roomId];
        }

        setSelectedRoomNumberIds(newIds);

        // Reset adults/children if they now exceed new max
        const newMaxAdults = maxAdultsPerRoom * (newIds.length || 1);
        const newMaxChildren = (selectedRoom?.capacity?.children || 0) * (newIds.length || 1);

        if (formData.adults > newMaxAdults) {
            setFormData(prev => ({ ...prev, adults: newMaxAdults }));
        }
        if (formData.children > newMaxChildren) {
            setFormData(prev => ({ ...prev, children: newMaxChildren }));
        }
    };

    const handleNext = () => {
        setError(null);
        if (step === 1) {
            if (!formData.name || !formData.phone || !formData.email) {
                setError('Name, Phone, and Email are required.');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setError('Please enter a valid email address.');
                return;
            }
        }
        if (step === 2) {
            if (!formData.roomId || !formData.checkInDate || !formData.checkOutDate) {
                setError('Please select room and dates.');
                return;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkIn = new Date(formData.checkInDate);
            const checkOut = new Date(formData.checkOutDate);

            if (checkIn < today) {
                setError('Check-in date cannot be in the past.');
                return;
            }
            if (checkIn >= checkOut) {
                setError('Check-out date must be after Check-in date.');
                return;
            }
            if (selectedRoomNumberIds.length === 0) {
                setError('Please select at least one room.');
                return;
            }
            // Validate total guests against total available capacity
            const totalRequestedGuests = formData.adults + formData.children;
            const totalCapacity = totalMaxAdults + totalMaxChildren;

            if (formData.adults > totalMaxAdults) {
                setError(`The ${roomCount} room(s) you selected allow a maximum of ${totalMaxAdults} adults (${maxAdultsPerRoom} per room).`);
                return;
            }
            if (formData.children > totalMaxChildren) {
                setError(`The ${roomCount} room(s) you selected allow a maximum of ${totalMaxChildren} children (${maxChildrenPerRoom} per room).`);
                return;
            }
            if (totalRequestedGuests > totalCapacity) {
                setError(`Total guests exceed the maximum capacity for ${roomCount} room(s). Max total: ${totalCapacity}.`);
                return;
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
        if (!selectedRoom) return;
        try {
            setLoading(true);
            setError(null);
            const orderResponse = await paymentsAPI.createRazorpayOrder(
                formData.amount, 'INR',
                { roomId: selectedRoom._id || selectedRoom.id, roomName: selectedRoom.name, checkIn: formData.checkInDate, checkOut: formData.checkOutDate, isOfflineBooking: true }
            );
            if (!orderResponse.success || !orderResponse.data) {
                throw new Error(orderResponse.message || 'Failed to create Razorpay order');
            }
            const { orderId, amount, currency, keyId } = orderResponse.data;
            const options = {
                key: keyId, amount, currency,
                name: 'Luxury Hotel (Admin)',
                description: `Offline Booking for ${selectedRoom.name}`,
                order_id: orderId,
                prefill: { name: formData.name, email: formData.email, contact: formData.phone },
                theme: { color: '#c8a456' },
                handler: async function (response: any) {
                    try {
                        const verifyResponse = await paymentsAPI.verifyRazorpayPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        if (!verifyResponse.success) throw new Error('Payment verification failed');
                        await createBooking({
                            amount: formData.amount,
                            method: verifyResponse.data?.method || 'Razorpay',
                            transactionId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id,
                            paymentDate: new Date()
                        });
                    } catch (verifyError: any) {
                        setError('Payment verification failed. Please try again.');
                        setLoading(false);
                    }
                },
                modal: { ondismiss: () => { setLoading(false); toast.error('Payment cancelled'); } }
            };
            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();
        } catch (err: any) {
            setError(err.message || 'Failed to initiate Razorpay payment');
            setLoading(false);
        }
    };

    const resetForm = () => {
        setStep(1);
        setSelectedRoomNumberIds([]);
        setAvailableRoomNumbers([]);
        setFormData({ name: '', email: '', phone: '', roomId: '', checkInDate: '', checkOutDate: '', adults: 1, children: 0, amount: 0, paymentMethod: 'Cash' });
    };

    const createBooking = async (paymentDetails: any) => {
        try {
            await adminAPI.createOfflineBooking({
                customerDetails: { name: formData.name, email: formData.email, phone: formData.phone },
                roomId: formData.roomId,
                selectedRoomNumberIds,
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate,
                guestDetails: { totalAdults: Number(formData.adults), totalChildren: Number(formData.children) },
                paymentDetails,
                status: 'Confirmed'
            });
            onSuccess();
            onHide();
            resetForm();
            toast.success('Offline booking created successfully!');
        } catch (err: any) {
            setError(err?.response?.data?.message || err.message || 'Failed to create booking');
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (formData.paymentMethod === 'Razorpay') {
            await handleRazorpayPayment();
        } else {
            setLoading(true);
            await createBooking({ amount: formData.amount, method: 'Cash' });
            setLoading(false);
        }
    };

    // Subtotal display (without GST)
    const nights = formData.checkInDate && formData.checkOutDate
        ? Math.max(0, Math.ceil((new Date(formData.checkOutDate).getTime() - new Date(formData.checkInDate).getTime()) / (1000 * 3600 * 24)))
        : 0;
    const subtotalBeforeGst = selectedRoom ? selectedRoom.price.basePrice * nights * (roomCount || 0) : 0;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered contentClassName="admin-modal-content">
            <Modal.Header closeButton className="admin-modal-header border-bottom-0 pb-0">
                <Modal.Title className="fw-bolder">New Offline Booking</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                {error && <div className="alert alert-danger d-flex align-items-center mb-4"><AlertCircle size={18} className="me-2" />{error}</div>}

                {/* ── STEP 1: Customer Details ── */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <div className="mb-4 d-flex align-items-center">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>1</div>
                            <h5 className="mb-0 fw-bold text-dark">Customer Details</h5>
                        </div>
                        <div className="row g-4">
                            <div className="col-md-6">
                                <label className="admin-form-label">Guest Name <span className="text-danger">*</span></label>
                                <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter full name" className="admin-form-control w-100" />
                            </div>
                            <div className="col-md-6">
                                <label className="admin-form-label">Phone Number <span className="text-danger">*</span></label>
                                <input type="tel" name="phone" maxLength={10} value={formData.phone} onChange={handleChange} placeholder="Enter 10-digit phone" className="admin-form-control w-100" />
                            </div>
                            <div className="col-12">
                                <label className="admin-form-label">Email <span className="text-danger">*</span></label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email address" className="admin-form-control w-100" />
                                <div className="form-text text-muted small mt-1">Booking confirmation will be sent here.</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Booking Details ── */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <div className="mb-4 d-flex align-items-center">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>2</div>
                            <h5 className="mb-0 fw-bold text-dark">Booking Details</h5>
                        </div>
                        <div className="row g-4">
                            {/* Room Type */}
                            <div className="col-12">
                                <label className="admin-form-label">Room Type <span className="text-danger">*</span></label>
                                <select name="roomId" value={formData.roomId} onChange={handleChange} className="admin-form-select w-100">
                                    <option value="">Select Room Type</option>
                                    {rooms.map(room => (
                                        <option key={room.id || room._id} value={room.id || room._id}>
                                            {`${room.name} - ₹${room.price.basePrice}/night`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Dates */}
                            <div className="col-md-6">
                                <label className="admin-form-label">Check-in Date <span className="text-danger">*</span></label>
                                <input 
                                    type="date" 
                                    name="checkInDate" 
                                    min={todayStr} 
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
                                    min={checkOutMinStr} 
                                    value={formData.checkOutDate} 
                                    onChange={handleChange} 
                                    className={`admin-form-control w-100 ${error && error.includes('Check-out') ? 'is-invalid' : ''}`} 
                                />
                            </div>

                            {/* Room Number Selector */}
                            {formData.roomId && formData.checkInDate && formData.checkOutDate && (
                                <div className="col-12">
                                    <label className="admin-form-label">Select Rooms <span className="text-danger">*</span></label>
                                    {loadingRooms ? (
                                        <div className="d-flex align-items-center gap-2 text-muted p-3 border rounded">
                                            <Loader2 size={16} className="animate-spin" /> Fetching available rooms...
                                        </div>
                                    ) : availableRoomNumbers.length === 0 ? (
                                        <div className="alert alert-warning py-2 mb-0">No rooms available for the selected dates.</div>
                                    ) : (
                                        <>
                                            <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {availableRoomNumbers.map((rn: any) => (
                                                    <div key={rn.id} className="form-check mb-2">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id={`rn-${rn.id}`}
                                                            checked={selectedRoomNumberIds.includes(rn.id)}
                                                            onChange={() => toggleRoomNumber(rn.id)}
                                                        />
                                                        <label className="form-check-label" htmlFor={`rn-${rn.id}`}>
                                                            Room {rn.roomNumber} - Floor {rn.floor}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                            <small className="text-muted mt-1 d-block">
                                                {roomCount > 0 ? `${roomCount} room(s) selected` : 'Select at least one room'}
                                            </small>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Adults Dropdown */}
                            <div className="col-md-6">
                                <label className="admin-form-label">
                                    Adults {roomCount > 0 && `(Max: ${totalMaxAdults})`}
                                </label>
                                <select
                                    name="adults"
                                    value={formData.adults}
                                    onChange={handleChange}
                                    className="admin-form-select w-100"
                                >
                                    {Array.from({ length: Math.max(totalMaxAdults, 1) }, (_, i) => i + 1).map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Children Dropdown */}
                            <div className="col-md-6">
                                <label className="admin-form-label">Children {roomCount > 0 && `(Max: ${totalMaxChildren})`}</label>
                                <select
                                    name="children"
                                    value={formData.children}
                                    onChange={handleChange}
                                    className="admin-form-select w-100"
                                >
                                    {Array.from({ length: totalMaxChildren + 1 }, (_, i) => i).map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Live Subtotal */}
                            {roomCount > 0 && nights > 0 && selectedRoom && (
                                <div className="col-12">
                                    <div className="rounded p-3" style={{ background: '#e0f7fa', border: '1px solid #b2ebf2' }}>
                                        <div className="fw-bold" style={{ color: '#00796b', fontSize: '1.05rem' }}>
                                            Subtotal: ₹{subtotalBeforeGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-muted small mt-1">
                                            {nights} night{nights > 1 ? 's' : ''} × {roomCount} room{roomCount > 1 ? 's' : ''} × ₹{selectedRoom.price.basePrice.toLocaleString('en-IN')}/night
                                        </div>
                                        <div className="text-muted small">
                                            + GST ({gstRate}%): ₹{(subtotalBeforeGst * gstRate / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            <span className="ms-2 fw-semibold" style={{ color: '#00796b' }}>
                                                Total: ₹{formData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Payment & Confirmation ── */}
                {step === 3 && (
                    <div className="animate-fade-in">
                        <div className="mb-4 d-flex align-items-center">
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: 'bold' }}>3</div>
                            <h5 className="mb-0 fw-bold text-dark">Payment & Confirmation</h5>
                        </div>

                        <div className="card border-0 bg-light mb-4">
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="text-muted">Room(s)</span>
                                    <span>{roomCount} × {selectedRoom?.name}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="text-muted">Nights</span>
                                    <span>{nights}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="text-muted">Subtotal</span>
                                    <span>₹{subtotalBeforeGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted">GST ({gstRate}%)</span>
                                    <span>₹{(subtotalBeforeGst * gstRate / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                    <span className="fw-bold">Total Payable</span>
                                    <span className="fw-bold fs-5 text-primary">₹{formData.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="row g-4">
                            <div className="col-md-12">
                                <label className="admin-form-label">Payment Method</label>
                                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="admin-form-select w-100">
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
        </Modal>
    );
};

export default OfflineBookingModal;
