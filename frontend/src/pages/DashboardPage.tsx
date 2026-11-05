import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  DollarSign,
  Users,
  UserCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import api from '../lib/api';

// ─── API response types ────────────────────────────────────────────────────────

interface RevenueSummary {
  totalRevenue: number;
  appointmentCount: number;
  averageTicket: number;
}

interface StaffSummaryData {
  activeCount: number;
}

interface CustomerSummaryData {
  totalCount: number;
}

interface BookingCustomer {
  name: string;
}

interface BookingStaff {
  name: string;
}

interface Booking {
  _id: string;
  date: string;
  startTime: string;
  status: string;
  totalPrice: number;
  customer?: BookingCustomer;
  staff?: BookingStaff;
  services?: string[];
}

interface BookingsResponse {
  bookings: Booking[];
  total: number;
}

interface SupplyItem {
  _id: string;
  name: string;
  currentQuantity: number;
  reorderThreshold: number;
  unit: string;
}

interface LowStockResponse {
  items: SupplyItem[];
}

// ─── Fetch helpers ──────────────────────────────────────────────────────────────

async function fetchRevenueSummary(period: string): Promise<RevenueSummary> {
  const res = await api.get<RevenueSummary>(`/revenue/summary?period=${period}`);
  return res.data;
}

async function fetchRecentBookings(): Promise<BookingsResponse> {
  const res = await api.get<BookingsResponse>(
    '/bookings?limit=5&sortBy=date&sortOrder=desc'
  );
  return res.data;
}

async function fetchLowStock(): Promise<LowStockResponse> {
  const res = await api.get<LowStockResponse>('/supplies/low-stock');
  return res.data;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg: string;
  loading: boolean;
}

function KpiCard({ title, value, subtitle, icon, iconBg, loading }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`${iconBg} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="mt-1 h-7 w-24 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
        )}
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    confirmed:  'bg-green-100 text-green-700',
    pending:    'bg-yellow-100 text-yellow-700',
    completed:  'bg-blue-100 text-blue-700',
    cancelled:  'bg-red-100 text-red-600',
    'no-show':  'bg-gray-100 text-gray-600',
  };
  const cls = styles[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const todaySummary = useQuery({
    queryKey: ['revenue-summary', 'today'],
    queryFn: () => fetchRevenueSummary('today'),
  });

  const monthSummary = useQuery({
    queryKey: ['revenue-summary', 'month'],
    queryFn: () => fetchRevenueSummary('month'),
  });

  const recentBookings = useQuery({
    queryKey: ['bookings-recent'],
    queryFn: fetchRecentBookings,
  });

  const lowStock = useQuery({
    queryKey: ['low-stock'],
    queryFn: fetchLowStock,
  });

  const todayAppointments = todaySummary.data?.appointmentCount ?? 0;
  const monthRevenue      = monthSummary.data?.totalRevenue ?? 0;

  // We use static placeholders for staff/customer counts since they may come
  // from dedicated endpoints — show 0 gracefully if the revenue summary
  // doesn't include them.
  const activeStaff    = (monthSummary.data as unknown as StaffSummaryData)?.activeCount ?? '—';
  const totalCustomers = (monthSummary.data as unknown as CustomerSummaryData)?.totalCount ?? '—';

  const kpiLoading = todaySummary.isLoading || monthSummary.isLoading;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Today's Appointments"
            value={todayAppointments}
            subtitle="Scheduled for today"
            icon={<CalendarDays size={22} className="text-primary-500" />}
            iconBg="bg-primary-50"
            loading={todaySummary.isLoading}
          />
          <KpiCard
            title="This Month Revenue"
            value={kpiLoading ? '…' : formatCurrency(monthRevenue)}
            subtitle="Current calendar month"
            icon={<DollarSign size={22} className="text-gold-500" />}
            iconBg="bg-gold-50"
            loading={monthSummary.isLoading}
          />
          <KpiCard
            title="Active Staff"
            value={activeStaff}
            subtitle="Currently employed"
            icon={<Users size={22} className="text-indigo-500" />}
            iconBg="bg-indigo-50"
            loading={false}
          />
          <KpiCard
            title="Total Customers"
            value={totalCustomers}
            subtitle="All-time clients"
            icon={<UserCircle size={22} className="text-teal-500" />}
            iconBg="bg-teal-50"
            loading={false}
          />
        </div>
      </section>

      {/* Recent Appointments + Low Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Appointments */}
        <section className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary-400" />
              <h3 className="font-semibold text-gray-800">Recent Appointments</h3>
            </div>
            <span className="text-xs text-gray-400">Last 5</span>
          </div>

          {recentBookings.isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentBookings.isError ? (
            <div className="flex items-center gap-2 p-6 text-red-500 text-sm">
              <AlertTriangle size={16} />
              Failed to load appointments.
            </div>
          ) : (recentBookings.data?.bookings?.length ?? 0) === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">No recent appointments.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-6 py-3">Date</th>
                    <th className="text-left px-6 py-3">Customer</th>
                    <th className="text-left px-6 py-3">Staff</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-right px-6 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentBookings.data?.bookings?.map((b) => (
                    <tr key={b._id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="px-6 py-3 text-gray-700 whitespace-nowrap">
                        {formatDate(b.date)}
                        {b.startTime && (
                          <span className="ml-1 text-xs text-gray-400">{b.startTime}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-800 font-medium">
                        {b.customer?.name ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {b.staff?.name ?? '—'}
                      </td>
                      <td className="px-6 py-3">{statusBadge(b.status)}</td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-800">
                        {formatCurrency(b.totalPrice ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Low Stock Alerts */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <AlertTriangle size={16} className="text-gold-500" />
            <h3 className="font-semibold text-gray-800">Low Stock Alerts</h3>
          </div>

          {lowStock.isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : lowStock.isError ? (
            <div className="flex items-center gap-2 p-6 text-red-500 text-sm">
              <AlertTriangle size={16} />
              Failed to load supply data.
            </div>
          ) : (lowStock.data?.items?.length ?? 0) === 0 ? (
            <div className="p-6 text-sm text-gray-400 text-center">
              All supplies are well-stocked.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {lowStock.data?.items?.map((item) => {
                const pct = Math.min(
                  100,
                  Math.round((item.currentQuantity / item.reorderThreshold) * 100)
                );
                const barColor = pct <= 25 ? 'bg-red-400' : pct <= 50 ? 'bg-gold-400' : 'bg-green-400';
                return (
                  <li key={item._id} className="px-6 py-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate max-w-[65%]">
                        {item.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {item.currentQuantity} / {item.reorderThreshold} {item.unit}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
