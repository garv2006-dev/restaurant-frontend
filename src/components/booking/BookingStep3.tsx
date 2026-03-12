import React, { useState } from 'react';
import type { BookingState } from '../../pages/Booking';
import { bookingsAPI } from '../../services/api';
import { ArrowLeft, Lock, CreditCard, Wallet, Tag, CheckCircle, AlertTriangle } from 'lucide-react';

const getImageUrl = (room: any) => {
    if (!room.images?.length) return 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';
    const cloud = room.images.filter((i: any) => i.url?.includes('cloudinary'));
    const prim = cloud.find((i: any) => i.isPrimary) || cloud[0] || room.images.find((i: any) => i.isPrimary) || room.images[0];
    return prim?.url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';
};

// ── Payment methods ───────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
    { methodId: 'Razorpay', label: 'Online Payment', desc: 'Credit Card, UPI, Wallets etc.', icon: <CreditCard size={20} /> },
    { methodId: 'Cash', label: 'Pay at Hotel', desc: 'Cash on arrival', icon: <Wallet size={20} /> },
];

// ── Booking summary (full) ───────────────────────────────────────────────────
const FullSummary: React.FC<{
    booking: BookingState;
    subtotal: number;
    finalAmount: number;
    appliedDiscount: any;
    gstPercentage: number;
}> = ({ booking, subtotal, finalAmount, appliedDiscount, gstPercentage }) => {
    const { selectedRooms, checkInDate, checkOutDate, nights, guests, guestDetails } = booking;
    if (selectedRooms.length === 0) return null;

    const firstRoom = selectedRooms[0].room;
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const imgSrc = getImageUrl(firstRoom);

    const taxAmount = subtotal * (gstPercentage / 100);

    return (
        <div className="booking-summary-card">
            <div className="booking-summary-header">
                <div className="booking-summary-hotel">FINAL REVIEW</div>
                <div className="booking-summary-title">Your Luxury Stay</div>
            </div>
            <div className="booking-summary-body" style={{ padding: 0 }}>
                <div style={{ height: '200px', overflow: 'hidden' }}>
                    <img src={imgSrc} alt="Stay Overview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <div className="lux-card-body">
                    <div className="summary-row">
                        <span className="summary-row-label">Check-in</span>
                        <span className="summary-row-value">{fmt(checkInDate)}</span>
                    </div>
                    <div className="summary-row">
                        <span className="summary-row-label">Check-out</span>
                        <span className="summary-row-value">{fmt(checkOutDate)}</span>
                    </div>
                    <div className="summary-row">
                        <span className="summary-row-label">Occupancy</span>
                        <span className="summary-row-value">{guests.adults} Adults{guests.children > 0 ? `, ${guests.children} Children` : ''}</span>
                    </div>
                    <div className="summary-row">
                        <span className="summary-row-label">Primary Guest</span>
                        <span className="summary-row-value">{guestDetails.name}</span>
                    </div>

                    <div style={{ margin: '24px 0 16px 0', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--booking-gold-dark)' }}>Stay Details</div>

                    {selectedRooms.map((item: any, idx: number) => {
                        const roomSub = item.room.price.basePrice * nights * item.count;
                        return (
                            <div key={idx} style={{ padding: '16px', background: 'var(--booking-cream)', borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--booking-border)' }}>
                                <div className="summary-row" style={{ border: 'none', padding: 0 }}>
                                    <span className="summary-row-label" style={{ color: 'var(--booking-navy)', fontWeight: 700 }}>{item.room.name} x{item.count}</span>
                                    <span className="summary-row-value">₹{roomSub.toLocaleString()}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--booking-text-muted)', marginTop: '6px', fontWeight: 500 }}>
                                    {nights} Nights × ₹{item.room.price.basePrice.toLocaleString()}
                                </div>
                            </div>
                        );
                    })}

                    <div style={{ borderTop: '1px solid var(--booking-border)', paddingTop: '16px', marginTop: '16px' }}>
                        <div className="summary-row" style={{ border: 'none', padding: '4px 0' }}>
                            <span className="summary-row-label" style={{ fontSize: '14px' }}>Subtotal</span>
                            <span className="summary-row-value" style={{ fontSize: '14px' }}>₹{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="summary-row" style={{ border: 'none', padding: '4px 0' }}>
                            <span className="summary-row-label" style={{ fontSize: '14px' }}>Tax ({gstPercentage}%)</span>
                            <span className="summary-row-value" style={{ fontSize: '14px' }}>₹{taxAmount.toLocaleString()}</span>
                        </div>
                        {appliedDiscount && (
                            <div className="summary-row" style={{ border: 'none', padding: '4px 0', color: '#10b981' }}>
                                <span className="summary-row-label" style={{ color: '#10b981', fontSize: '14px' }}>Discount ({appliedDiscount.code})</span>
                                <span className="summary-row-value" style={{ fontSize: '14px' }}>-₹{appliedDiscount.discountAmount.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="summary-total-section">
                        <span className="summary-total-label">Payable Amount</span>
                        <span className="summary-total-amount">₹{finalAmount.toLocaleString()}</span>
                    </div>

                    {appliedDiscount && (
                        <div className="booking-alert success" style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #10b981', color: '#065f46', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px', justifyContent: 'center' }}>
                            <CheckCircle size={14} />
                            <span>Total Savings: ₹{appliedDiscount.savings?.toLocaleString() || appliedDiscount.discountAmount?.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Discount code widget ──────────────────────────────────────────────────────
const DiscountWidget: React.FC<{ subtotal: number; onApplied: (d: any) => void; appliedDiscount: any }> = ({ subtotal, onApplied, appliedDiscount }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apply = async () => {
        if (!code.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await bookingsAPI.validateDiscount(code.toUpperCase(), subtotal);
            if (res.success && res.data) {
                onApplied(res.data);
                setCode('');
            } else {
                setError(res.message || 'Invalid discount code');
                onApplied(null);
            }
        } catch {
            setError('Failed to validate discount code');
        } finally { setLoading(false); }
    };

    return (
        <div className="promo-card-lux">
            <div className="lux-form-label" style={{ color: 'var(--booking-gold-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={15} /> Offers & Coupons
            </div>

            {appliedDiscount ? (
                <div className="booking-alert success" style={{ marginBottom: 0 }}>
                    <CheckCircle size={20} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{appliedDiscount.discount?.code || appliedDiscount.code} APPLIED!</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Saved ₹{(appliedDiscount.savings || appliedDiscount.discountAmount).toLocaleString()}</div>
                    </div>
                    <button
                        onClick={() => onApplied(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}
                    >
                        Remove
                    </button>
                </div>
            ) : (
                <>
                    <div className="promo-input-group">
                        <input
                            className="lux-form-input"
                            style={{ textTransform: 'uppercase', flex: 1 }}
                            value={code}
                            onChange={e => setCode(e.target.value.toUpperCase())}
                            placeholder="PROMO CODE"
                            onKeyDown={e => e.key === 'Enter' && apply()}
                        />
                        <button
                            className="btn-promo-apply"
                            onClick={apply}
                            disabled={loading || !code.trim()}
                        >
                            {loading ? '…' : 'APPLY'}
                        </button>
                    </div>
                    {error && (
                        <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ── Step 3 ────────────────────────────────────────────────────────────────────
interface Step3Props {
    booking: BookingState;
    subtotal: number;
    finalAmount: number;
    appliedDiscount: any;
    gstPercentage: number;
    processing: boolean;
    onPaymentMethodChange: (m: string) => void;
    onDiscountApplied: (d: any) => void;
    onBack: () => void;
    onPayNow: () => void;
}

const BookingStep3: React.FC<Step3Props> = ({
    booking, subtotal, finalAmount, appliedDiscount, gstPercentage, processing,
    onPaymentMethodChange, onDiscountApplied, onBack, onPayNow,
}) => {
    const [selectedLabel, setSelectedLabel] = useState('Online Payment');

    const handleMethodSelect = (method: typeof PAYMENT_METHODS[0]) => {
        setSelectedLabel(method.label);
        onPaymentMethodChange(method.methodId);
    };

    return (
        <div className="booking-step-layout">
            {/* Left – Payment form */}
            <div className="booking-main-content">
                <h1 className="booking-section-title">Payment</h1>
                <p className="booking-section-subtitle">Choose your preferred payment method and complete your booking</p>

                {/* Payment Options */}
                <div className="lux-card" style={{ marginBottom: '40px' }}>
                    <div className="lux-card-header">
                        <h2 className="lux-card-title">Secure Checkout</h2>
                        <p className="lux-card-subtitle">Your transaction is encrypted and secure</p>
                    </div>

                    <div className="lux-card-body">
                        <div className="lux-form-label" style={{ color: 'var(--booking-gold-dark)', marginBottom: '24px' }}>Select Payment Method</div>

                        <div className="payment-methods-grid">
                            {PAYMENT_METHODS.map((m, idx) => (
                                <div
                                    key={idx}
                                    className={`payment-method-card ${selectedLabel === m.label ? 'selected' : ''}`}
                                    onClick={() => handleMethodSelect(m)}
                                >
                                    <div className="payment-method-icon">{m.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div className="payment-method-name">{m.label}</div>
                                        <div className="payment-method-desc">{m.desc}</div>
                                    </div>
                                    <div className="payment-method-radio"><div /></div>
                                </div>
                            ))}
                        </div>

                        <div className="booking-alert info" style={{ marginTop: '32px' }}>
                            <Lock size={16} />
                            <span style={{ fontWeight: 500 }}>Payments are securely handled by Razorpay. Your details are never stored on our servers.</span>
                        </div>

                        {/* Discount */}
                        <div style={{ marginTop: '40px' }}>
                            <DiscountWidget subtotal={subtotal} onApplied={onDiscountApplied} appliedDiscount={appliedDiscount} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="booking-nav-row">
                    <button className="btn-back-step" onClick={onBack} disabled={processing}>
                        <ArrowLeft size={18} /> Back to Details
                    </button>
                    <button className="btn-pay-now" onClick={onPayNow} disabled={processing}>
                        {processing ? (
                            <>Processing… <div className="booking-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /></>
                        ) : (
                            <><Lock size={18} /> Pay ₹{Math.round(finalAmount).toLocaleString()} Securely</>
                        )}
                    </button>
                </div>
            </div>

            {/* Right – Full summary */}
            <div className="booking-sidebar booking-sidebar-sticky">
                <FullSummary booking={booking} subtotal={subtotal} finalAmount={finalAmount} appliedDiscount={appliedDiscount} gstPercentage={gstPercentage} />
            </div>
        </div>
    );
};

export default BookingStep3;
