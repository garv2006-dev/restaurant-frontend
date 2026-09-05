import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AvailableRoom } from '../../services/aiService';
import { Users, Bed, Wifi, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface AIChatRoomCardProps {
  room: AvailableRoom;
  checkIn?: string | null;
  checkOut?: string | null;
  onSelect?: () => void;
}

const AIChatRoomCard: React.FC<AIChatRoomCardProps> = ({ room, checkIn, checkOut, onSelect }) => {
  const navigate = useNavigate();

  const handleBookNow = () => {
    let bookingUrl = `/booking?room=${encodeURIComponent(room.roomId)}`;
    if (checkIn) bookingUrl += `&checkIn=${encodeURIComponent(checkIn)}`;
    if (checkOut) bookingUrl += `&checkOut=${encodeURIComponent(checkOut)}`;
    if (room.capacity) bookingUrl += `&adults=${encodeURIComponent(room.capacity)}`;

    if (onSelect) onSelect();
    navigate(bookingUrl);
  };

  const handleViewRoom = () => {
    let bookingUrl = `/booking?room=${encodeURIComponent(room.roomId)}`;
    if (onSelect) onSelect();
    navigate(bookingUrl);
  };

  const displayImage = room.image || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="ai-room-card shadow-sm border rounded-3 overflow-hidden bg-white mb-3 text-dark">
      <div className="position-relative">
        <img
          src={displayImage}
          alt={room.roomName}
          className="w-100 object-fit-cover"
          style={{ height: '140px' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=80';
          }}
        />
        <span className="badge bg-primary position-absolute top-0 start-0 m-2 shadow-sm">
          {room.roomType}
        </span>
        {room.availableCount && room.availableCount > 0 ? (
          <span className="badge bg-success position-absolute top-0 end-0 m-2 shadow-sm d-flex align-items-center gap-1">
            <CheckCircle2 size={12} /> {room.availableCount} Available
          </span>
        ) : null}
      </div>

      <div className="p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h6 className="fw-bold m-0 text-truncate" style={{ maxWidth: '70%' }}>
            {room.roomName}
          </h6>
          <div className="text-end">
            <div className="fw-bold text-primary fs-6">
              ₹{room.pricePerNight.toLocaleString()} <small className="text-muted fs-7">/ night</small>
            </div>
            {room.totalPrice && room.totalPrice !== room.pricePerNight && (
              <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                Total: ₹{room.totalPrice.toLocaleString()}
              </small>
            )}
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 text-muted mb-2 fs-7">
          <span className="d-inline-flex align-items-center gap-1">
            <Users size={14} className="text-secondary" /> {room.capacity} Guests
          </span>
          <span className="d-inline-flex align-items-center gap-1">
            <Bed size={14} className="text-secondary" /> {room.bedType || 'King Bed'}
          </span>
        </div>

        {room.amenities && room.amenities.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mb-3">
            {room.amenities.slice(0, 3).map((amenity, idx) => (
              <span key={idx} className="badge bg-light text-secondary border fw-normal" style={{ fontSize: '0.7rem' }}>
                {amenity}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="badge bg-light text-muted border fw-normal" style={{ fontSize: '0.7rem' }}>
                +{room.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="d-grid gap-2 d-flex justify-content-end">
          <button
            onClick={handleViewRoom}
            className="btn btn-outline-secondary btn-sm flex-grow-1"
            style={{ fontSize: '0.8rem' }}
          >
            View Details
          </button>
          <button
            onClick={handleBookNow}
            className="btn btn-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1 fw-medium"
            style={{ fontSize: '0.8rem' }}
          >
            Book Now <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatRoomCard;
