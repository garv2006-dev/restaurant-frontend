/**
 * Utility functions for hotel booking date calculations and safe formatting.
 * Prevents timezone/off-by-one shifts and DST issues.
 */

/**
 * Formats a date-only string ("YYYY-MM-DD" or ISO string) into a clean display string ("21 Aug 2026").
 * Prevents UTC-to-local timezone shift (e.g. converting 2026-08-21T00:00:00Z to 20 Aug in negative UTC offsets).
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';

  // Extract date components directly if YYYY-MM-DD or ISO string format
  const dateOnly = dateStr.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(monthIdx) && !isNaN(day)) {
      const utcDate = new Date(Date.UTC(year, monthIdx, day));
      const monthName = utcDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
      const dayStr = day.toString().padStart(2, '0');
      return `${dayStr} ${monthName} ${year}`;
    }
  }

  // Fallback for non-standard formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const monthName = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const dayStr = date.getUTCDate().toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${dayStr} ${monthName} ${year}`;
}

/**
 * Calculates the number of stay nights between check-in and check-out dates safely.
 * Check-out date is NOT included as a night.
 * Formula: nights = checkOutDate - checkInDate (in days)
 * Same day check-in/out = 0 nights.
 * Invalid range (checkOut <= checkIn) = 0 nights.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;

  const inStr = checkIn.split('T')[0];
  const outStr = checkOut.split('T')[0];

  const pIn = inStr.split('-').map(Number);
  const pOut = outStr.split('-').map(Number);

  if (pIn.length !== 3 || pOut.length !== 3 || pIn.some(isNaN) || pOut.some(isNaN)) {
    return 0;
  }

  const startUTC = Date.UTC(pIn[0], pIn[1] - 1, pIn[2]);
  const endUTC = Date.UTC(pOut[0], pOut[1] - 1, pOut[2]);

  const diffDays = Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Helper to extract unique Room ID consistently regardless of _id or id field.
 */
export function getRoomId(room: { _id?: string; id?: string } | null | undefined): string {
  if (!room) return '';
  return (room._id || room.id || '').toString();
}

/**
 * Returns today's date in YYYY-MM-DD format (local date, not shifted).
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns tomorrow's date in YYYY-MM-DD format based on reference date or today.
 */
export function getTomorrowDateString(fromDateStr?: string): string {
  let base: Date;
  if (fromDateStr) {
    const parts = fromDateStr.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      base = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      base = new Date();
    }
  } else {
    base = new Date();
  }

  const tomorrow = new Date(base);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
  const day = tomorrow.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
