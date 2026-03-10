import React from 'react';
import type { BookingState } from '../../pages/Booking';
import { ArrowLeft, ChevronRight, User, Mail, Phone, Users } from 'lucide-react';

// ── Mini summary panel ────────────────────────────────────────────────────────
const MiniSummary: React.FC<{ booking: BookingState; subtotal: number; finalAmount: number; appliedDiscount: any }> = ({ booking, subtotal, finalAmount, appliedDiscount }) => {
    const { selectedRooms, checkInDate, checkOutDate, nights, guests } = booking;
    if (selectedRooms.length === 0) return null;
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    // Get the name of the first selected room for the header title (consistency)
    const primaryRoomName = selectedRooms.length > 0 ? selectedRooms[0].room.name : 'Booking Summary';

    return (
        <div className="booking-summary-card">
            <div className="booking-summary-header">
                <div className="booking-summary-hotel">YOUR STAY</div>
                <div className="booking-summary-title">{primaryRoomName}</div>
            </div>

            <div className="booking-summary-body">
                <div className="summary-row">
                    <span className="summary-row-label">Check-in</span>
                    <span className="summary-row-value">{fmt(checkInDate)}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Check-out</span>
                    <span className="summary-row-value">{fmt(checkOutDate)}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Stay</span>
                    <span className="summary-row-value">{nights} Night{nights !== 1 ? 's' : ''}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Guests</span>
                    <span className="summary-row-value">{`${guests.adults} Adults${guests.children > 0 ? `, ${guests.children} Children` : ''}`}</span>
                </div>

                {selectedRooms.map((item, idx) => {
                    const roomSub = item.room.price.basePrice * nights * item.count;
                    return (
                        <div key={idx} className="summary-item-wrap" style={{ marginTop: '12px' }}>
                            <div className="summary-row" style={{ borderBottom: 'none', paddingBottom: '4px' }}>
                                <span className="summary-row-label">{item.room.name} x{item.count}</span>
                                <span className="summary-row-value">₹{roomSub.toLocaleString()}</span>
                            </div>
                        </div>
                    );
                })}

                <div className="summary-total-section">
                    <span className="summary-total-label">Total Amount</span>
                    <span className="summary-total-amount">₹{finalAmount.toLocaleString()}</span>
                </div>

                {appliedDiscount && (
                    <div className="booking-alert success" style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #10b981', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                        <span style={{ fontSize: '12px' }}>Code <strong>{appliedDiscount.code}</strong> applied</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Step 2 Component ──────────────────────────────────────────────────────────
interface Step2Props {
    booking: BookingState;
    subtotal: number;
    finalAmount: number;
    appliedDiscount: any;
    onGuestChange: (field: 'name' | 'email' | 'phone', value: string) => void;
    onGuestsChange: (field: 'adults' | 'children', value: number) => void;
    onBack: () => void;
    onContinue: () => void;
    error?: string | null;
    onClearError?: () => void;
}

const BookingStep2: React.FC<Step2Props> = ({
    booking, subtotal, finalAmount, appliedDiscount,
    onGuestChange, onGuestsChange, onBack, onContinue, error, onClearError
}) => {
    // Sum capacity across all selected rooms/quantities
    const maxAdults = booking.selectedRooms.reduce((sum, item) => sum + (item.room.capacity.adults * item.count), 0) || 4;
    const maxChildren = booking.selectedRooms.reduce((sum, item) => sum + (item.room.capacity.children * item.count), 0) || 4;

    const totalRooms = booking.selectedRooms.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="booking-step-layout">
            {/* Left – Form */}
            <div className="booking-main-content">
                <h1 className="booking-section-title">Guest Details</h1>
                <p className="booking-section-subtitle">Tell us about yourself — we'll pre-fill from your profile</p>

                <div className="lux-card">
                    <div className="lux-card-header">
                        <h2 className="lux-card-title">Primary Guest Information</h2>
                        <p className="lux-card-subtitle">Required information for your stay</p>
                    </div>

                    <div className="lux-card-body">
                        {error && (
                            <div className="animate-fade-in" style={{
                                backgroundColor: '#fff5f5',
                                border: '1px solid #feb2b2',
                                borderLeft: '4px solid #f56565',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                color: '#c53030',
                                fontSize: '14px',
                                position: 'relative'
                            }}>
                                {/* Icon removed */}
                                <span style={{ fontWeight: 600 }}>{error}</span>
                                {onClearError && (
                                    <button
                                        onClick={onClearError}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#c53030',
                                            fontSize: '18px',
                                            cursor: 'pointer',
                                            opacity: 0.5
                                        }}
                                    >×</button>
                                )}
                            </div>
                        )}
                        {/* ── Guest Count ──────────────────────────────── */}
                        <div className="lux-form-label" style={{ color: 'var(--booking-gold-dark)', marginBottom: '24px' }}>Stay Occupancy</div>
                        <div style={{ marginBottom: '32px' }}>
                            {/* Adults */}
                            <div className="guest-counter-item">
                                <div className="guest-counter-info">
                                    <span className="guest-counter-type">Adults</span>
                                    <span className="guest-counter-sub">Age 13+</span>
                                </div>
                                <div className="guest-counter-ctrl">
                                    <button className="gcount-btn" onClick={() => onGuestsChange('adults', Math.max(1, booking.guests.adults - 1))} disabled={booking.guests.adults <= 1}>–</button>
                                    <span className="gcount-val">{booking.guests.adults}</span>
                                    <button className="gcount-btn" onClick={() => onGuestsChange('adults', Math.min(maxAdults, booking.guests.adults + 1))} disabled={booking.guests.adults >= maxAdults}>+</button>
                                </div>
                            </div>
                            {/* Children */}
                            <div className="guest-counter-item">
                                <div className="guest-counter-info">
                                    <span className="guest-counter-type">Children</span>
                                    <span className="guest-counter-sub">Age 0–12</span>
                                </div>
                                <div className="guest-counter-ctrl">
                                    <button className="gcount-btn" onClick={() => onGuestsChange('children', Math.max(0, booking.guests.children - 1))} disabled={booking.guests.children <= 0}>–</button>
                                    <span className="gcount-val">{booking.guests.children}</span>
                                    <button className="gcount-btn" onClick={() => onGuestsChange('children', Math.min(maxChildren, booking.guests.children + 1))} disabled={booking.guests.children >= maxChildren}>+</button>
                                </div>
                            </div>
                        </div>

                        {totalRooms > 0 && (
                            <div className="booking-alert info">
                                <Users size={18} />
                                <span style={{ fontWeight: 600 }}>Max capacity: {maxAdults} adult{maxAdults > 1 ? 's' : ''} and {maxChildren} child{maxChildren !== 1 ? 'ren' : ''} for {totalRooms} room{totalRooms > 1 ? 's' : ''}</span>
                            </div>
                        )}

                        <div className="lux-form-label" style={{ color: 'var(--booking-gold-dark)', borderBottom: '1px solid var(--booking-border)', paddingBottom: '10px', marginBottom: '32px' }}>
                            Contact Information
                        </div>

                        <FormInput
                            label="Full Name"
                            required
                            icon={<User size={18} />}
                            value={booking.guestDetails.name}
                            onChange={(v: string) => onGuestChange('name', v)}
                            placeholder="Enter your full name"
                            error={error === 'Full name is required.' ? error : undefined}
                        />

                        <div className="lux-form-grid">
                            <FormInput
                                label="Email Address"
                                required
                                type="email"
                                icon={<Mail size={18} />}
                                value={booking.guestDetails.email}
                                onChange={(v: string) => onGuestChange('email', v)}
                                placeholder="you@example.com"
                                error={error === 'Valid email is required.' ? error : undefined}
                            />
                            <FormInput
                                label="Phone Number"
                                required
                                type="tel"
                                icon={<Phone size={18} />}
                                value={booking.guestDetails.phone}
                                onChange={(v: string) => onGuestChange('phone', v.replace(/[^0-9]/g, '').slice(0, 10))}
                                placeholder="10-digit mobile number"
                                maxLength={10}
                                error={error === 'Valid 10-digit phone number is required.' ? error : undefined}
                            />
                        </div>
                    </div>
                </div>

                <div className="booking-nav-row">
                    <button className="btn-back-step" onClick={onBack}><ArrowLeft size={18} /> Back</button>
                    <button className="btn-next-step" onClick={onContinue}>
                        Continue to Payment <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Right – Mini summary */}
            <div className="booking-sidebar booking-sidebar-sticky">
                <MiniSummary booking={booking} subtotal={subtotal} finalAmount={finalAmount} appliedDiscount={appliedDiscount} />
            </div>
        </div>
    );
};

// ── Reusable labelled input ───────────────────────────────────────────────────
interface FormInputProps {
    label: string;
    required?: boolean;
    type?: string;
    icon?: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    maxLength?: number;
    error?: string;
}

const FormInput: React.FC<FormInputProps> = ({ label, required, type = 'text', icon, value, onChange, placeholder, maxLength, error }) => (
    <div className="lux-form-group">
        <label className="lux-form-label">
            {label} {required && <span className="required">*</span>}
        </label>
        <div style={{ position: 'relative' }}>
            {icon && (
                <span className="lux-form-icon-wrap" style={{ color: error ? '#ef4444' : undefined }}>
                    {icon}
                </span>
            )}
            <input
                type={type}
                className={`lux-form-input ${icon ? 'has-icon' : ''}`}
                style={{
                    borderColor: error ? '#ef4444' : undefined,
                    boxShadow: error ? '0 0 0 4px rgba(239, 68, 68, 0.1)' : undefined
                }}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
            />
        </div>
        {error && (
            <div className="text-danger" style={{ fontSize: '11px', fontWeight: 700, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {error}
            </div>
        )}
    </div>
);

export default BookingStep2;
