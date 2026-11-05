import { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Users,
  Scissors,
  FileText,
  CheckCircle,
  XCircle,
  Edit3,
  CreditCard,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../lib/auth';
import { useCancelBooking, useCompleteBooking, type Booking, type BookingStatus } from '../hooks/useBookings';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending:   { label: 'Pending',   className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmed', className: 'bg-green-100  text-green-700  border-green-200'  },
  completed: { label: 'Completed', className: 'bg-blue-100   text-blue-700   border-blue-200'   },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100   text-gray-500   border-gray-200'   },
  'no-show': { label: 'No Show',   className: 'bg-red-100    text-red-600    border-red-200'    },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border ${cfg.className}`}
    >
      {status === 'completed' && <CheckCircle size={11} />}
      {status === 'cancelled' && <XCircle size={11} />}
      {cfg.label}
    </span>
  );
}

// ─── Payment methods ──────────────────────────────────────────────────────────

const PAYMENT_METHODS = ['cash', 'card', 'venmo', 'zelle', 'gift_card'];

function formatPayment(m: string): string {
  const map: Record<string, string> = {
    cash: 'Cash', card: 'Credit / Debit Card',
    venmo: 'Venmo', zelle: 'Zelle', gift_card: 'Gift Card',
  };
  return map[m] ?? m;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function displayTime(time24: string): string {
  try {
    const [h, m] = time24.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0);
    return format(d, 'h:mm a');
  } catch {
    return time24;
  }
}

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onEdit?: (booking: Booking) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  onEdit,
}: BookingDetailModalProps) {
  const { user } = useAuth();
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [actionError, setActionError] = useState('');

  const cancelBooking   = useCancelBooking();
  const completeBooking = useCompleteBooking();

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const isTerminal = booking?.status === 'cancelled' || booking?.status === 'completed';

  const handleCancel = async () => {
    if (!booking) return;
    if (!window.confirm('Cancel this appointment?')) return;
    setActionError('');
    try {
      await cancelBooking.mutateAsync(booking._id);
      onClose();
    } catch {
      setActionError('Failed to cancel booking.');
    }
  };

  const handleComplete = async (paymentMethod: string) => {
    if (!booking) return;
    setActionError('');
    try {
      await completeBooking.mutateAsync({ id: booking._id, paymentMethod });
      setShowPaymentPicker(false);
      onClose();
    } catch {
      setActionError('Failed to mark as complete.');
    }
  };

  if (!isOpen || !booking) return null;

  const isBusy = cancelBooking.isPending || completeBooking.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">Appointment</h2>
            <StatusBadge status={booking.status} />
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Customer */}
          <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-gold-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {booking.customer?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{booking.customer?.name ?? '—'}</p>
              {booking.customer?.phone && (
                <p className="text-xs text-gray-500">{booking.customer.phone}</p>
              )}
              {booking.customer?.email && (
                <p className="text-xs text-gray-400">{booking.customer.email}</p>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <InfoRow
              icon={<Calendar size={15} className="text-primary-400" />}
              label="Date"
              value={formatDate(booking.date)}
            />
            <InfoRow
              icon={<Clock size={15} className="text-primary-400" />}
              label="Time"
              value={
                booking.endTime
                  ? `${displayTime(booking.startTime)} – ${displayTime(booking.endTime)}`
                  : displayTime(booking.startTime)
              }
            />
            <InfoRow
              icon={<Users size={15} className="text-primary-400" />}
              label="Staff"
              value={booking.staff?.name ?? '—'}
            />
            <InfoRow
              icon={<Scissors size={15} className="text-primary-400" />}
              label="Services"
              value={
                <div className="space-y-1 mt-1">
                  {(booking.services ?? []).map((svc) => (
                    <div key={svc._id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{svc.name}</span>
                      <span className="text-sm text-gray-500">${svc.price}</span>
                    </div>
                  ))}
                </div>
              }
            />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-primary-600">
              ${booking.totalPrice?.toFixed(2) ?? '0.00'}
            </span>
          </div>

          {/* Payment method (if completed) */}
          {booking.status === 'completed' && booking.paymentMethod && (
            <InfoRow
              icon={<CreditCard size={15} className="text-green-500" />}
              label="Payment"
              value={formatPayment(booking.paymentMethod)}
            />
          )}

          {/* Notes */}
          {booking.notes && (
            <InfoRow
              icon={<FileText size={15} className="text-gray-400" />}
              label="Notes"
              value={booking.notes}
            />
          )}

          {/* Staff name under info */}
          {booking.staff?.specialization && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <User size={12} />
              Specialization: {booking.staff.specialization}
            </div>
          )}

          {/* Error */}
          {actionError && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {actionError}
            </div>
          )}

          {/* Payment picker */}
          {showPaymentPicker && (
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleComplete(m)}
                    className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition-all text-gray-700"
                  >
                    {isBusy
                      ? <Loader2 size={14} className="animate-spin mx-auto" />
                      : formatPayment(m)
                    }
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentPicker(false)}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full text-center"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isTerminal && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            {/* Edit + Cancel row */}
            <div className="flex gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => { onClose(); onEdit(booking); }}
                  className="flex-1 btn-secondary flex items-center justify-center gap-1.5 text-sm"
                >
                  <Edit3 size={14} />
                  Reschedule
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                disabled={isBusy}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm transition-colors"
              >
                {cancelBooking.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <XCircle size={14} />
                }
                Cancel
              </button>
            </div>

            {/* Complete & Pay — admin/manager only */}
            {isAdminOrManager && !showPaymentPicker && (
              <button
                type="button"
                onClick={() => setShowPaymentPicker(true)}
                disabled={isBusy}
                className="w-full btn-gold flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle size={15} />
                Complete &amp; Pay
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
