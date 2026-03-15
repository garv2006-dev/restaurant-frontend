import React, { useState, useEffect, useRef } from 'react';
import type { Room } from '../../types';
import type { BookingState } from '../../pages/Booking';
import { roomsAPI } from '../../services/api';
import {
    Wifi, Wind, Tv, Coffee, Car, Star, Users,
    Calendar, Check, ShieldAlert, Bed, Maximize, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BookingSummary from './BookingSummary';

// ── Feature icon helper ────────────────────────────────────────────────────
const FEATURE_ICONS: Record<string, React.ReactNode> = {
    wifi: <Wifi size={13} />,
    airConditioning: <Wind size={13} />,
    television: <Tv size={13} />,
    breakfast: <Coffee size={13} />,
    parkingIncluded: <Car size={13} />,
    miniBar: <Coffee size={13} />,
    balcony: <Star size={13} />,
    seaView: <Star size={13} />,
    cityView: <Star size={13} />,
};

const FEATURE_LABELS: Record<string, string> = {
    wifi: 'WiFi', airConditioning: 'AC', television: 'TV',
    breakfast: 'Breakfast', parkingIncluded: 'Parking',
    miniBar: 'Mini Bar', balcony: 'Balcony', seaView: 'Sea View', cityView: 'City View',
};

const getImageUrl = (room: Room) => {
    if (!room.images?.length) return 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';
    const cloud = room.images.filter(i => i.url?.includes('cloudinary'));
    const prim = cloud.find(i => i.isPrimary) || cloud[0] || room.images.find(i => i.isPrimary) || room.images[0];
    return prim?.url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80';
};

// ── Room Card ─────────────────────────────────────────────────────────────
interface RoomCardProps {
    room: Room;
    booking: BookingState;
    isSelected: boolean;
    onSelect: (room: Room, qty: number) => void;
    selectedQty: number;
    isAdmin?: boolean;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, booking, isSelected, onSelect, selectedQty, isAdmin = false }) => {
    const [available, setAvailable] = useState<number | null>(null);
    const [fetching, setFetching] = useState(false);
    const [localQty, setLocalQty] = useState(1);

    const hasDates = !!(booking.checkInDate && booking.checkOutDate);

    // Fetch available count when dates change
    useEffect(() => {
        if (!hasDates) { setAvailable(null); return; }
        const fetch = async () => {
            setFetching(true);
            try {
                const res = await roomsAPI.getRoomNumbers(room._id || room.id, {
                    checkInDate: booking.checkInDate,
                    checkOutDate: booking.checkOutDate,
                    status: 'Available',
                });
                const cnt = res.success ? (res.data?.length ?? 0) : (room.availableCount ?? room.totalRoomNumbers ?? 5);
                setAvailable(cnt);
            } catch {
                setAvailable(room.availableCount ?? room.totalRoomNumbers ?? 5);
            } finally { setFetching(false); }
        };
        fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking.checkInDate, booking.checkOutDate, room._id, room.id, hasDates, room.availableCount, room.totalRoomNumbers]);

    const maxQty = available ?? (room.availableCount ?? room.totalRoomNumbers ?? 5);
    const isUnavailable = room.status !== 'Available' || (hasDates && available === 0) || isAdmin;

    // Real-time calculation of remaining available rooms
    const currentAvailable = available !== null ? Math.max(0, available - (isSelected ? selectedQty : 0)) : null;

    const changeQty = (delta: number) => {
        const next = Math.max(1, Math.min(maxQty, (isSelected ? selectedQty : localQty) + delta));
        if (isSelected) {
            onSelect(room, next);
        } else {
            setLocalQty(next);
        }
    };

    const handleToggle = () => {
        if (isUnavailable) return;
        if (isSelected) {
            onSelect(room, 0); // Remove
        } else {
            onSelect(room, localQty); // Add
        }
    };

    const badgeText = fetching ? 'Checking…' : !hasDates ? 'Select dates' : currentAvailable === 0 ? 'Fully Booked' : currentAvailable !== null && currentAvailable <= 3 ? `Only ${currentAvailable} Left!` : currentAvailable !== null ? `${currentAvailable} Available` : '';
    const badgeCls = currentAvailable === 0 ? 'unavailable' : currentAvailable !== null && currentAvailable <= 3 ? 'limited' : 'available';

    const features = room.features
        ? Object.entries(room.features).filter(([, v]) => v).slice(0, 5)
        : [];

    return (
        <div className={`room-card-lux ${isSelected ? 'selected' : ''}`}>
            <div className="room-card-img-wrap">
                <img src={getImageUrl(room)} alt={room.name} loading="lazy" />
                <div className="room-card-badge-wrap">
                    <span className="room-type-badge">{room.type}</span>
                    {badgeText && <span className={`room-avail-badge ${badgeCls}`}>{badgeText}</span>}
                </div>
                {room.averageRating > 0 && (
                    <div className="room-rating-overlay" style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={12} fill="currentColor" /> {room.averageRating.toFixed(1)}
                        {room.totalReviews > 0 && <span style={{ opacity: 0.7 }}>({room.totalReviews})</span>}
                    </div>
                )}
            </div>

            <div className="room-card-body">
                <div className="room-card-name">{room.name}</div>
                <div className="room-card-desc">{room.description}</div>

                <div className="room-amenities-row">
                    <span className="amenity-chip"><Users size={13} /> {room.capacity.adults}A{room.capacity.children > 0 ? ` ${room.capacity.children}C` : ''}</span>
                    <span className="amenity-chip"><Bed size={13} /> {room.bedType}</span>
                    <span className="amenity-chip"><Maximize size={13} /> {room.area} sq.ft</span>
                    <span className="amenity-chip"><Layers size={13} /> Floor {room.floor}</span>
                    {features.map(([key]) => (
                        <span key={key} className="amenity-chip">
                            {FEATURE_ICONS[key] || <Star size={13} />}
                            {FEATURE_LABELS[key] || key}
                        </span>
                    ))}
                </div>

                <div className="room-card-footer">
                    <div className="room-price-block">
                        <div className="room-price-amount">₹{room.price.basePrice.toLocaleString()}</div>
                        <div className="room-price-label">per night</div>
                    </div>
                    <button
                        className={`room-book-btn ${isSelected ? 'selected-btn' : ''}`}
                        onClick={handleToggle}
                        disabled={isUnavailable}
                    >
                        {isUnavailable ? 'UNAVAILABLE' : isSelected ? (
                            <>
                                <Check size={14} style={{ marginRight: 6 }} strokeWidth={3} />
                                SELECTED
                            </>
                        ) : 'SELECT ROOM'}
                    </button>
                </div>
            </div>

            {/* Quantity selector — only show AFTER selection */}
            {isSelected && hasDates && !isUnavailable && (
                <div className="room-qty-area">
                    <div className="room-qty-title">ROOM QUANTITY</div>
                    <div className="room-qty-row">
                        <span className="qty-label">Rooms to book</span>
                        <div className="qty-control">
                            <button className="gcount-btn" onClick={() => changeQty(-1)} disabled={selectedQty <= 1}>–</button>
                            <span className="gcount-val">{selectedQty}</span>
                            <button className="gcount-btn" onClick={() => changeQty(1)} disabled={selectedQty >= maxQty}>+</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Step 1 Main ──────────────────────────────────────────────────────────────
interface Step1Props {
    rooms: Room[];
    loading: boolean;
    booking: BookingState;
    subtotal: number;
    gstPercentage: number;
    onDateChange: (field: 'checkInDate' | 'checkOutDate', value: string) => void;
    onSelectRoom: (room: Room, qty: number) => void;
    onContinue: () => void;
    error?: string | null;
    onClearError?: () => void;
}

const BookingStep1: React.FC<Step1Props> = ({
    rooms, loading, booking, subtotal, gstPercentage,
    onDateChange, onSelectRoom, onContinue, error, onClearError
}) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const today = new Date().toISOString().split('T')[0];
    const checkInRef = useRef<HTMLInputElement>(null);
    const checkOutRef = useRef<HTMLInputElement>(null);

    const dateError = booking.checkInDate && booking.checkOutDate &&
        new Date(booking.checkOutDate) <= new Date(booking.checkInDate)
        ? 'Check-out must be after check-in' : '';

    const handleFieldClick = (ref: React.RefObject<HTMLInputElement | null>) => {
        const el = ref.current as any;
        if (!el) return;

        if (el.showPicker) {
            el.showPicker();
        } else {
            el.focus();
        }
    };

    return (
        <div className="booking-step-layout">
            <div className="booking-main-content">
                <h1 className="booking-section-title">Choose Your Rooms</h1>
                <p className="booking-section-subtitle">Select multiple room types if needed for your stay</p>

                {error && (
                    <div className="animate-fade-in booking-alert warning" style={{
                        borderLeft: '4px solid #f56565',
                        position: 'relative'
                    }}>
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
                                    color: 'inherit',
                                    fontSize: '18px',
                                    cursor: 'pointer',
                                    opacity: 0.5
                                }}
                            >×</button>
                        )}
                    </div>
                )}

                {/* Date bar */}
                <div className="booking-date-bar">
                    <div className="booking-date-field clickable" onClick={() => handleFieldClick(checkInRef)}>
                        <label className="booking-date-label"><Calendar size={14} style={{ marginRight: '6px' }} /> Check-in</label>
                        <input
                            ref={checkInRef}
                            type="date"
                            className="booking-date-input"
                            value={booking.checkInDate}
                            min={today}
                            onChange={e => onDateChange('checkInDate', e.target.value)}
                        />
                    </div>

                    <div className="date-bar-divider">
                        {booking.nights > 0 && booking.checkInDate && booking.checkOutDate && !dateError && (
                            <div className="date-bar-nights-circle">
                                <span>{booking.nights} N</span>
                            </div>
                        )}
                    </div>

                    <div className="booking-date-field clickable" onClick={() => handleFieldClick(checkOutRef)}>
                        <label className="booking-date-label"><Calendar size={14} style={{ marginRight: '6px' }} /> Check-out</label>
                        <input
                            ref={checkOutRef}
                            type="date"
                            className="booking-date-input"
                            value={booking.checkOutDate}
                            min={booking.checkInDate || today}
                            onChange={e => onDateChange('checkOutDate', e.target.value)}
                        />
                    </div>
                </div>

                {dateError && (
                    <div className="booking-error-alert booking-alert warning" style={{ borderLeft: '4px solid #f56565' }}>
                        {/* Icon removed */} {dateError}
                    </div>
                )}

                {isAdmin && (
                    <div className="booking-alert warning" style={{
                        borderLeft: '4px solid #F1C40F',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px',
                    }}>
                        <ShieldAlert size={20} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>Admin Access</div>
                            <div style={{ fontSize: '13px' }}>You are viewing this page as an Administrator. You can view room availability, but booking functionality is disabled for admin accounts.</div>
                        </div>
                    </div>
                )}

                {/* Room Grid */}
                {loading ? (
                    <div className="booking-loading" style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div className="booking-spinner" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: 'var(--booking-text-muted)', fontWeight: 600 }}>Curating our finest rooms for you…</p>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="no-rooms-state" style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--booking-card-bg, white)', borderRadius: '24px', border: '1px dashed var(--booking-border)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏨</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--booking-navy)' }}>No Rooms Available</h3>
                        <p style={{ color: 'var(--booking-text-muted)' }}>Please check back later or try different dates.</p>
                    </div>
                ) : (
                    <div className="booking-rooms-grid">
                        {rooms.map(room => {
                            const selectedItem = booking.selectedRooms.find(i => (i.room.id || i.room._id) === (room.id || room._id));
                            return (
                                <RoomCard
                                    key={room.id || room._id}
                                    room={room}
                                    booking={booking}
                                    isSelected={!!selectedItem}
                                    selectedQty={selectedItem?.count || 0}
                                    onSelect={onSelectRoom}
                                    isAdmin={isAdmin}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Right sidebar */}
            <div className="booking-sidebar booking-sidebar-sticky">
                <BookingSummary
                    booking={booking}
                    subtotal={subtotal}
                    gstPercentage={gstPercentage}
                    onContinue={onContinue}
                    onUpdateRoomQty={onSelectRoom}
                />
            </div>
        </div>
    );
};

export default BookingStep1;
