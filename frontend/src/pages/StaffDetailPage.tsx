import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  AlertTriangle,
} from 'lucide-react';
import { useStaffMember } from '../hooks/useStaff';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'from-primary-400 to-rose-500',
  'from-gold-400 to-amber-500',
  'from-indigo-400 to-violet-500',
  'from-teal-400 to-green-500',
  'from-pink-400 to-fuchsia-500',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

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

function roleBadge(role: string) {
  const styles: Record<string, string> = {
    admin: 'bg-primary-100 text-primary-700',
    manager: 'bg-gold-100 text-gold-700',
    technician: 'bg-green-100 text-green-700',
    staff: 'bg-blue-100 text-blue-700',
  };
  const cls = styles[role] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full ${cls}`}>
      {role}
    </span>
  );
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

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function StatCard({ label, value, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`${iconBg} w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}>
        <span className={iconColor}>{icon}</span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useStaffMember(id ?? '');

  const staff = data?.staff;
  const stats = data?.stats;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">Failed to load staff member.</p>
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
        onClick={() => navigate('/staff')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Staff
      </button>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-rose-500 via-primary-500 to-gold-400" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            {isLoading ? (
              <Skeleton className="w-20 h-20 rounded-full ring-4 ring-white" />
            ) : (
              <div
                className={`w-20 h-20 rounded-full ring-4 ring-white bg-gradient-to-br ${avatarColor(staff?.name ?? '')} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}
              >
                {initials(staff?.name ?? '?')}
              </div>
            )}

            <div className="flex-1 min-w-0 sm:pb-1">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">{staff?.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      {roleBadge(staff?.role ?? '')}
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          staff?.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {staff?.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact info row */}
          {!isLoading && staff && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {staff.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{staff.email}</span>
                </div>
              )}
              {staff.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  <span>{staff.phone}</span>
                </div>
              )}
              {staff.hireDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                  <span>Hired {formatDate(staff.hireDate)}</span>
                </div>
              )}
              {staff.specialization && (
                <div className="flex items-center gap-2 text-sm text-gray-600 col-span-full">
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wide">
                    Specialization:
                  </span>
                  <span className="font-medium text-gray-700">{staff.specialization}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Total Appointments"
              value={stats?.totalAppointments ?? 0}
              icon={<CalendarCheck size={20} />}
              iconBg="bg-primary-50"
              iconColor="text-primary-500"
            />
            <StatCard
              label="Commission Earned"
              value={formatCurrency(stats?.totalCommissionEarned ?? 0)}
              icon={<DollarSign size={20} />}
              iconBg="bg-gold-50"
              iconColor="text-gold-600"
            />
            <StatCard
              label="Commission Rate"
              value={`${stats?.commissionRate ?? staff?.commissionRate ?? 0}%`}
              icon={<TrendingUp size={20} />}
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
          </>
        )}
      </div>

      {/* Recent appointments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Appointments</h3>
          <span className="text-xs text-gray-400">Last 5</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !stats?.recentAppointments?.length ? (
          <div className="px-6 py-10 text-sm text-gray-400 text-center">
            No appointments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Date</th>
                  <th className="text-left px-6 py-3">Customer</th>
                  <th className="text-left px-6 py-3">Services</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-right px-6 py-3">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentAppointments.map((appt) => (
                  <tr key={appt._id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">
                      {formatDateShort(appt.date)}
                      {appt.startTime && (
                        <span className="ml-1.5 text-xs text-gray-400">{appt.startTime}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">
                      {appt.customer?.name ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-600 max-w-xs truncate">
                      {appt.services?.join(', ') || '—'}
                    </td>
                    <td className="px-6 py-3">{statusBadge(appt.status)}</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-800">
                      {formatCurrency(appt.totalPrice ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
