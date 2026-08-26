import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { BookingState } from '../../pages/Booking';
import type { Room } from '../../types';
import { formatDateDisplay, calculateNights } from '../../utils/bookingDateUtils';

interface BookingSummaryProps {
    booking: BookingState;
    subtotal: number;
    gstPercentage: number;
    onContinue: () => void;
    onUpdateRoomQty: (room: Room, qty: number) => void;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
    booking,
    subtotal,
    gstPercentage,
    onContinue,
    onUpdateRoomQty,
}) => {
    const { selectedRooms, checkInDate, checkOutDate } = booking;
    const nights = calculateNights(checkInDate, checkOutDate);
    const roomsCount = selectedRooms.reduce((acc, curr) => acc + (curr.count || 1), 0);
    const ready = selectedRooms.length > 0 && !!checkInDate && !!checkOutDate && nights >= 1;

    const primaryRoomName = selectedRooms.length === 0 ? 'No rooms selected'
        : selectedRooms.length === 1 ? selectedRooms[0].room.name
            : `Multiple Rooms (${roomsCount})`;

    // Room removal: set quantity to 0
    const handleRemove = (item: any) => {
        onUpdateRoomQty(item.room, 0);
    };

    const taxAmount = subtotal * (gstPercentage / 100);
    const totalAmount = subtotal + taxAmount;

    return (
        <div className="booking-summary-card">
            <div className="booking-summary-header">
                <div className="booking-summary-hotel">LUXURY HOTEL</div>
                <div className="booking-summary-title">{primaryRoomName}</div>
            </div>

            <div className="booking-summary-body" style={{ paddingBottom: '0' }}>
                <div className="summary-row">
                    <span className="summary-row-label">Check-in</span>
                    <span className="summary-row-value">{formatDateDisplay(checkInDate)}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Check-out</span>
                    <span className="summary-row-value">{formatDateDisplay(checkOutDate)}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Nights</span>
                    <span className="summary-row-value">{nights}</span>
                </div>
                <div className="summary-row">
                    <span className="summary-row-label">Rooms</span>
                    <span className="summary-row-value">{roomsCount}</span>
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
                            <span style={{ fontSize: '15px', color: 'var(--booking-navy)', fontWeight: 600 }}>
                                ₹{subtotal.toLocaleString()}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--booking-text-muted)' }}>Tax ({gstPercentage}%) :</span>
                            <span style={{ fontSize: '15px', color: 'var(--booking-navy)', fontWeight: 600 }}>
                                ₹{taxAmount.toLocaleString()}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--booking-border)' }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--booking-navy)' }}>Total</span>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--booking-navy)' }}>
                                ₹{totalAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
            </div>
            {ready ? (
                <div style={{ padding: '24px', borderTop: '1px solid var(--booking-border)', display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--booking-card-bg, white)' }}>
                    <button
                        className="btn-booking-continue"
                        onClick={onContinue}
                    >
                        CONTINUE TO GUEST DETAILS <ChevronRight size={16} />
                    </button>
                </div>
            ) : (
                <div className="lux-card-body" style={{ background: 'var(--booking-card-bg, white)' }}>
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
