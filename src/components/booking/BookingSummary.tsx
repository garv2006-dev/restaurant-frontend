import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { BookingState } from '../../pages/Booking';
import type { Room } from '../../types';

interface BookingSummaryProps {
    booking: BookingState;
    subtotal: number;
    onContinue: () => void;
    onUpdateRoomQty: (room: Room, qty: number) => void;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
    booking,
    subtotal,
    onContinue,
    onUpdateRoomQty,
}) => {
    const { selectedRooms, checkInDate, checkOutDate, nights } = booking;
    const ready = !!(selectedRooms.length > 0 && checkInDate && checkOutDate);

    const fmt = (d: string) => {
        if (!d) return '—';
        const date = new Date(d);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };

    const primaryRoomName = selectedRooms.length === 0 ? 'No rooms selected'
        : selectedRooms.length === 1 ? selectedRooms[0].room.name
            : 'Multiple Rooms';

    // Room removing logic: Decrement by 1
    const handleRemove = (item: any) => {
        const newQty = Math.max(0, item.count - 1);
        onUpdateRoomQty(item.room, newQty);
    };

    return (
        <div className="booking-summary-card">
            <div className="booking-summary-header">
                <div className="booking-summary-hotel">LUXURY HOTEL</div>
                <div className="booking-summary-title">{primaryRoomName}</div>
            </div>

            <div className="booking-summary-body" style={{ paddingBottom: '0' }}>
                <div className="summary-row">
                    <span className="summary-row-label">Check-in</span>
                    <span className="summary-row-value">{fmt(checkInDate)}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Check-out</span>
                    <span className="summary-row-value">{fmt(checkOutDate)}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Nights</span>
                    <span className="summary-row-value">{nights || 0}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Rooms</span>
                    <span className="summary-row-value">{selectedRooms.reduce((acc, curr) => acc + curr.count, 0)}</span>
                </div>

                <div style={{ marginTop: '24px' }}>
                    {selectedRooms.map((item, idx) => {
                        const roomSub = item.room.price.basePrice * nights * item.count;
                        return (
                            <div key={idx} style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--booking-text-muted)' }}>
                                        {item.room.name} x{item.count}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--booking-navy)' }}>
                                        ₹{roomSub.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => handleRemove(item)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#ef4444',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            padding: 0,
                                            letterSpacing: '1px',
                                            textTransform: 'uppercase'
                                        }}
                                    >
                                        REMOVE
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {ready && (
                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--booking-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--booking-text-muted)' }}>Room rate :</span>
                            <span style={{ fontSize: '15px', color: 'var(--booking-navy)' }}>
                                Rs {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--booking-text-muted)' }}>Tax :</span>
                            <span style={{ fontSize: '15px', color: 'var(--booking-navy)' }}>
                                Rs {(subtotal * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--booking-border)' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--booking-navy)' }}>Total</span>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--booking-navy)' }}>
                                Rs {(subtotal * 1.18).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {ready ? (
                <div style={{ padding: '24px', borderTop: '1px solid var(--booking-border)', display: 'flex', flexDirection: 'column', gap: '24px', background: 'white' }}>

                    <button
                        className="btn-booking-continue"
                        onClick={onContinue}
                    >
                        CONTINUE TO GUEST DETAILS <ChevronRight size={16} />
                    </button>
                </div>
            ) : (
                <div className="lux-card-body" style={{ background: 'white' }}>
                    <button
                        className="btn-booking-continue"
                        onClick={onContinue}
                        disabled={true}
                    >
                        CONTINUE TO GUEST DETAILS <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default BookingSummary;
