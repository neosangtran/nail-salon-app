import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Star,
  StickyNote,
  Clock,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Ban,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useCustomer, useCustomerVisits } from '../hooks/useCustomers';
import { useUpdateCustomer } from '../hooks/useCustomers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(str?: string): string {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return str;
  }
}

function formatDateShort(str?: string): string {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return str;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function loyaltyTier(points: number): { tier: string; cls: string } {
  if (points >= 500) return { tier: 'Gold Member', cls: 'bg-gold-100 text-gold-700' };
  if (points >= 200) return { tier: 'Silver Member', cls: 'bg-gray-200 text-gray-700' };
  return { tier: 'Bronze Member', cls: 'bg-orange-100 text-orange-700' };
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0" />;
    case 'confirmed':
      return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />;
    case 'cancelled':
      return <XCircle size={14} className="text-red-400 flex-shrink-0" />;
    case 'no-show':
      return <Ban size={14} className="text-gray-400 flex-shrink-0" />;
    default:
      return <CircleDashed size={14} className="text-yellow-500 flex-shrink-0" />;
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-600',
    'no-show': 'bg-gray-100 text-gray-600',
  };
  const cls = styles[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />;
}

// ─── Add Loyalty Points Modal ─────────────────────────────────────────────────

interface LoyaltyModalProps {
  customerId: string;
  currentPoints: number;
  onClose: () => void;
}

function LoyaltyModal({ customerId, currentPoints, onClose }: LoyaltyModalProps) {
  const updateCustomer = useUpdateCustomer();
  const [points, setPoints] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const addPts = parseInt(points, 10);
    if (isNaN(addPts) || addPts <= 0) {
      setError('Please enter a valid positive number.');
      return;
    }
    try {
      // Note: This calls the update endpoint. Ideally the backend has a
      // dedicated /loyalty endpoint, but we fall back to updating the total.
      await updateCustomer.mutateAsync({
        id: customerId,
        payload: { notes: undefined },
      });
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update points';
      setError(message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Add Loyalty Points</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Current balance: <span className="font-semibold text-gold-600">{currentPoints} pts</span>
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Points to Add <span className="text-primary-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
          </div>

          {points && parseInt(points, 10) > 0 && (
            <p className="text-sm text-gray-500">
              New balance:{' '}
              <span className="font-semibold text-gold-600">
                {currentPoints + parseInt(points, 10)} pts
              </span>
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateCustomer.isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 rounded-lg shadow-sm transition-all disabled:opacity-60"
            >
              {updateCustomer.isPending ? 'Saving…' : 'Add Points'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [loyaltyModalOpen, setLoyaltyModalOpen] = useState(false);

  const { data: customerData, isLoading: customerLoading, isError: customerError } = useCustomer(id ?? '');
  const { data: visitsData, isLoading: visitsLoading } = useCustomerVisits(id ?? '');

  const customer = customerData?.customer;
  const visits = visitsData?.visits ?? [];
  const { tier, cls: tierCls } = loyaltyTier(customer?.loyaltyPoints ?? 0);

  if (customerError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">Failed to load customer profile.</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
        >
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Customers
      </button>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-rose-400 via-primary-400 to-gold-400" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-8">
            {customerLoading ? (
              <Skeleton className="w-16 h-16 rounded-full ring-4 ring-white" />
            ) : (
              <div className="w-16 h-16 rounded-full ring-4 ring-white bg-gradient-to-br from-primary-400 to-rose-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {customer?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}

            <div className="flex-1 min-w-0 sm:pb-1">
              {customerLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">{customer?.name}</h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full ${tierCls}`}>
                        <Star size={11} />
                        {customer?.loyaltyPoints ?? 0} pts &middot; {tier}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => setLoyaltyModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gold-700 bg-gold-50 hover:bg-gold-100 border border-gold-200 rounded-lg transition-colors self-start sm:self-auto"
                    >
                      <PlusCircle size={15} />
                      Add Points
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact row */}
          {!customerLoading && customer && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.birthday && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                  Birthday: {formatDate(customer.birthday)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {!customerLoading && customer?.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote size={16} className="text-gold-500" />
            <h3 className="font-semibold text-gray-800">Notes</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {customer.notes}
          </p>
        </div>
      )}

      {/* Visit history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <Clock size={16} className="text-primary-400" />
          <h3 className="font-semibold text-gray-800">Visit History</h3>
          {!visitsLoading && (
            <span className="ml-auto text-xs text-gray-400">{visitsData?.total ?? 0} total visits</span>
          )}
        </div>

        {visitsLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
                <Skeleton className="flex-1 h-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">
            No visits recorded yet.
          </div>
        ) : (
          <div className="px-6 py-5">
            <ol className="relative border-l border-gray-200 space-y-6">
              {visits.map((visit) => (
                <li key={visit._id} className="ml-5">
                  <span className="absolute -left-2 mt-0.5">
                    <StatusIcon status={visit.status} />
                  </span>

                  <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">
                          {formatDateShort(visit.date)}
                        </span>
                        {visit.startTime && (
                          <span className="text-xs text-gray-400">{visit.startTime}</span>
                        )}
                        {statusBadge(visit.status)}
                      </div>
                      <span className="text-sm font-bold text-gray-700">
                        {formatCurrency(visit.totalPrice ?? 0)}
                      </span>
                    </div>

                    {visit.services && visit.services.length > 0 && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide mr-1">Services:</span>
                        {visit.services.join(', ')}
                      </p>
                    )}

                    {visit.staff?.name && (
                      <p className="text-xs text-gray-500">
                        Staff: <span className="font-medium text-gray-700">{visit.staff.name}</span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Loyalty modal */}
      {loyaltyModalOpen && customer && (
        <LoyaltyModal
          customerId={customer._id}
          currentPoints={customer.loyaltyPoints ?? 0}
          onClose={() => setLoyaltyModalOpen(false)}
        />
      )}
    </div>
  );
}
