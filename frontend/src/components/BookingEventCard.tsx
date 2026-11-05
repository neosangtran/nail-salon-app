import { CheckCircle } from 'lucide-react';
import type { Booking } from '../hooks/useBookings';

// ─── Staff color palette ──────────────────────────────────────────────────────

export const STAFF_COLORS: Record<
  number,
  { bg: string; text: string; border: string; dimBg: string }
> = {
  0: { bg: 'bg-rose-500',   text: 'text-white', border: 'border-rose-600',   dimBg: 'bg-rose-200'   },
  1: { bg: 'bg-blue-500',   text: 'text-white', border: 'border-blue-600',   dimBg: 'bg-blue-200'   },
  2: { bg: 'bg-green-500',  text: 'text-white', border: 'border-green-600',  dimBg: 'bg-green-200'  },
  3: { bg: 'bg-amber-500',  text: 'text-white', border: 'border-amber-600',  dimBg: 'bg-amber-200'  },
  4: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600', dimBg: 'bg-purple-200' },
  5: { bg: 'bg-teal-500',   text: 'text-white', border: 'border-teal-600',   dimBg: 'bg-teal-200'   },
  6: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', dimBg: 'bg-orange-200' },
  7: { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-600', dimBg: 'bg-indigo-200' },
};

export function getStaffColorIndex(staffIdOrIndex: string | number): number {
  if (typeof staffIdOrIndex === 'number') return staffIdOrIndex % 8;
  // Hash the string to a consistent index
  let hash = 0;
  for (let i = 0; i < staffIdOrIndex.length; i++) {
    hash = (hash * 31 + staffIdOrIndex.charCodeAt(i)) >>> 0;
  }
  return hash % 8;
}

// ─── Helper: get initials ─────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── Helper: abbreviate service name ─────────────────────────────────────────

function abbreviateService(name: string): string {
  if (name.length <= 14) return name;
  return name.slice(0, 13) + '…';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BookingEventCardProps {
  booking: Booking;
  staffColorIndex: number;
  compact?: boolean;
}

export default function BookingEventCard({
  booking,
  staffColorIndex,
  compact = false,
}: BookingEventCardProps) {
  const palette = STAFF_COLORS[staffColorIndex % 8];
  const isCancelled = booking.status === 'cancelled';
  const isCompleted = booking.status === 'completed';
  const customerName = booking.customer?.name ?? 'Unknown';
  const serviceName = booking.service?.name ?? 'Service';
  const extraServices = 0;

  if (isCancelled) {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-200 border border-gray-300 opacity-70 h-full overflow-hidden">
        <span className="text-[10px] font-semibold text-gray-500 line-through truncate">
          {initials(customerName)}
        </span>
        <span className="text-[10px] text-gray-400 line-through truncate hidden sm:block">
          {abbreviateService(serviceName)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded border h-full overflow-hidden ${palette.bg} ${palette.border}`}
    >
      {/* Customer initials badge */}
      <span
        className={`flex-shrink-0 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-[9px] font-bold ${palette.text}`}
      >
        {initials(customerName)}
      </span>

      {/* Service name */}
      {!compact && (
        <span className={`text-[10px] font-medium truncate leading-tight ${palette.text}`}>
          {abbreviateService(serviceName)}
          {extraServices > 0 && ` +${extraServices}`}
        </span>
      )}

      {/* Completed checkmark */}
      {isCompleted && (
        <CheckCircle size={10} className={`flex-shrink-0 ml-auto ${palette.text} opacity-80`} />
      )}
    </div>
  );
}
