import { useState, useMemo } from 'react';
import {
  DollarSign,
  Scissors,
  Gift,
  Heart,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import RevenueKPICard from '../components/RevenueKPICard';
import {
  useRevenueSummary,
  useDailyRevenue,
  useRevenueTransactions,
  useTopServices,
  useTopStaff,
  RevenuePeriod,
  TransactionType,
  PaymentMethod,
} from '../hooks/useRevenue';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

// ─── Period helpers ───────────────────────────────────────────────────────────

function getDateRangeForPeriod(period: Exclude<RevenuePeriod, 'custom'>): { start: Date; end: Date } {
  const today = new Date();
  switch (period) {
    case 'today':
      return { start: today, end: today };
    case 'week':
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case 'year':
      return { start: startOfYear(today), end: endOfYear(today) };
  }
}

// ─── Period selector ──────────────────────────────────────────────────────────

type PeriodButton = { label: string; value: RevenuePeriod };

const PERIOD_BUTTONS: PeriodButton[] = [
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week'  },
  { label: 'This Month', value: 'month' },
  { label: 'This Year',  value: 'year'  },
  { label: 'Custom',     value: 'custom' },
];

// ─── Colour palettes ──────────────────────────────────────────────────────────

const PIE_COLORS = ['#fb7185', '#f59e0b', '#94a3b8', '#6366f1', '#10b981', '#f97316'];

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  CASH:              { label: 'Cash',      cls: 'bg-green-100 text-green-700'  },
  CARD:              { label: 'Card',      cls: 'bg-blue-100 text-blue-700'    },
  GIFT_CERT:         { label: 'Gift Cert', cls: 'bg-primary-100 text-primary-700' },
};

const TXN_TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  SERVICE:              { label: 'Service',         cls: 'bg-primary-100 text-primary-700' },
  TIP:                  { label: 'Tip',             cls: 'bg-green-100 text-green-700'     },
  GIFT_CERT_SALE:       { label: 'Gift Cert Sale',  cls: 'bg-gold-100 text-gold-700'       },
  GIFT_CERT_REDEMPTION: { label: 'GC Redemption',   cls: 'bg-indigo-100 text-indigo-700'   },
};

function PaymentBadge({ method }: { method: string }) {
  const info = PAYMENT_BADGE[method] ?? { label: method, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${info.cls}`}>
      {info.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const info = TXN_TYPE_BADGE[type] ?? { label: type, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${info.cls}`}>
      {info.label}
    </span>
  );
}

// ─── Custom tooltip for LineChart ─────────────────────────────────────────────

interface LineTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function LineTooltipContent({ active, payload, label }: LineTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-gray-700 mb-0.5">{label}</p>
      <p className="text-primary-600 font-semibold">{formatCurrencyFull(payload[0].value)}</p>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [period, setPeriod] = useState<RevenuePeriod>('month');
  const [customStart, setCustomStart] = useState<string>(isoDate(subDays(new Date(), 29)));
  const [customEnd, setCustomEnd] = useState<string>(isoDate(new Date()));

  // Transaction table filters
  const [txnPage, setTxnPage] = useState(1);
  const [txnType, setTxnType] = useState<TransactionType | ''>('');
  const [txnPayment, setTxnPayment] = useState<PaymentMethod | ''>('');
  const TXN_LIMIT = 10;

  // Derive ISO date strings for the selected period
  const { startDate, endDate } = useMemo(() => {
    if (period === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }
    const { start, end } = getDateRangeForPeriod(period);
    return { startDate: isoDate(start), endDate: isoDate(end) };
  }, [period, customStart, customEnd]);

  // Data hooks
  const summary    = useRevenueSummary(period, startDate, endDate);
  const daily      = useDailyRevenue(startDate, endDate);
  const topSvc     = useTopServices(startDate, endDate);
  const topStaff   = useTopStaff(startDate, endDate);
  const txns       = useRevenueTransactions({
    page: txnPage,
    limit: TXN_LIMIT,
    type: txnType || undefined,
    paymentMethod: txnPayment || undefined,
    startDate,
    endDate,
  });

  const s = summary.data;
  const prevPeriod = s?.previousPeriod;

  // Reset page when filters change
  function handleTxnTypeChange(val: TransactionType | '') {
    setTxnType(val);
    setTxnPage(1);
  }
  function handleTxnPaymentChange(val: PaymentMethod | '') {
    setTxnPayment(val);
    setTxnPage(1);
  }

  // ─── Date range display ─────────────────────────────────────────────────────
  const dateRangeLabel = useMemo(() => {
    if (startDate === endDate) {
      try { return format(parseISO(startDate), 'MMM d, yyyy'); } catch { return startDate; }
    }
    try {
      return `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d, yyyy')}`;
    } catch {
      return `${startDate} – ${endDate}`;
    }
  }, [startDate, endDate]);

  // ─── Chart data ─────────────────────────────────────────────────────────────
  const dailyChartData = useMemo(() => {
    return (daily.data?.dailyRevenue ?? []).map((pt) => ({
      ...pt,
      revenue: pt.total,
      label: (() => { try { return format(parseISO(pt.date), 'MMM d'); } catch { return pt.date; } })(),
    }));
  }, [daily.data]);

  const pieData = useMemo(() => {
    return (topSvc.data?.topServices ?? []).map((s) => ({
      name: s.category,
      value: s.total,
    }));
  }, [topSvc.data]);

  const staffBarData = useMemo(() => {
    return (topStaff.data?.topStaff ?? []).map((m) => ({
      name: m.staffName.split(' ')[0],
      revenue: m.total,
    }));
  }, [topStaff.data]);

  const paymentBreakdown = s?.paymentBreakdown ?? [];

  const txnData = txns.data;
  const totalTxnPages = txnData?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gold-50 rounded-xl flex items-center justify-center">
          <DollarSign size={20} className="text-gold-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Revenue & Reports</h2>
          <p className="text-sm text-gray-500">
            Financial analytics, payment breakdown, and transaction history
          </p>
        </div>
      </div>

      {/* ── Period selector bar ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => { setPeriod(btn.value); setTxnPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === btn.value
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {/* Custom date pickers */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <CalendarDays size={14} />
                <span>From</span>
              </div>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => { setCustomStart(e.target.value); setTxnPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={isoDate(new Date())}
                onChange={(e) => { setCustomEnd(e.target.value); setTxnPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          )}

          <span className="ml-auto text-xs text-gray-400 hidden sm:block">{dateRangeLabel}</span>
        </div>
      </div>

      {/* ── KPI cards row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <RevenueKPICard
          title="Total Revenue"
          value={summary.isLoading ? '…' : formatCurrency(s?.totalRevenue ?? 0)}
          change={s && prevPeriod ? calcChange(s.totalRevenue, prevPeriod.totalRevenue) : null}
          icon={<DollarSign size={20} />}
          colorVariant="gold"
          loading={summary.isLoading}
        />
        <RevenueKPICard
          title="Service Revenue"
          value={summary.isLoading ? '…' : formatCurrency(s?.totalServices ?? s?.serviceRevenue ?? 0)}
          change={s && prevPeriod ? calcChange(s.totalServices ?? s.serviceRevenue ?? 0, prevPeriod.serviceRevenue) : null}
          icon={<Scissors size={20} />}
          colorVariant="rose"
          loading={summary.isLoading}
        />
        <RevenueKPICard
          title="Tips"
          value={summary.isLoading ? '…' : formatCurrency(s?.totalTips ?? s?.tips ?? 0)}
          change={s && prevPeriod ? calcChange(s.totalTips ?? s.tips ?? 0, prevPeriod.tips) : null}
          icon={<Heart size={20} />}
          colorVariant="green"
          loading={summary.isLoading}
        />
        <RevenueKPICard
          title="Gift Cert Sales"
          value={summary.isLoading ? '…' : formatCurrency(s?.totalGiftCerts ?? s?.giftCertSales ?? 0)}
          change={s && prevPeriod ? calcChange(s.totalGiftCerts ?? s.giftCertSales ?? 0, prevPeriod.giftCertSales) : null}
          icon={<Gift size={20} />}
          colorVariant="indigo"
          loading={summary.isLoading}
        />
      </div>

      {/* ── Payment method breakdown ─────────────────────────────────────── */}
      {!summary.isLoading && paymentBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Payment Method Breakdown
          </p>
          <div className="flex flex-wrap gap-3">
            {paymentBreakdown.map((pb) => {
              const info = PAYMENT_BADGE[pb.method] ?? { label: pb.method, cls: 'bg-gray-100 text-gray-600' };
              return (
                <div
                  key={pb.method}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${info.cls}`}
                >
                  <span className="font-semibold">{info.label}</span>
                  <span className="opacity-80">{formatCurrencyFull(pb.amount)}</span>
                  <span className="text-xs opacity-60">({pb.count} txn{pb.count !== 1 ? 's' : ''})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Daily revenue line chart ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Daily Revenue</h3>
        {daily.isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : daily.isError ? (
          <div className="flex items-center gap-2 text-red-500 text-sm py-10 justify-center">
            <AlertTriangle size={16} /> Failed to load chart data.
          </div>
        ) : dailyChartData.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No data for this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={48}
              />
              <Tooltip content={<LineTooltipContent />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#fb7185"
                strokeWidth={2.5}
                dot={dailyChartData.length <= 14}
                activeDot={{ r: 5, fill: '#fb7185' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Pie + Bar charts side by side ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue by service category — PieChart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue by Category</h3>
          {topSvc.isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : topSvc.isError ? (
            <div className="flex items-center gap-2 text-red-500 text-sm py-10 justify-center">
              <AlertTriangle size={16} /> Failed to load.
            </div>
          ) : pieData.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No category data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [formatCurrencyFull(val), 'Revenue']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: '#6b7280' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top staff by revenue — BarChart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Top Staff by Revenue</h3>
          {topStaff.isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : topStaff.isError ? (
            <div className="flex items-center gap-2 text-red-500 text-sm py-10 justify-center">
              <AlertTriangle size={16} /> Failed to load.
            </div>
          ) : staffBarData.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No staff revenue data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={staffBarData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  width={48}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrencyFull(val), 'Revenue']}
                  cursor={{ fill: '#fef3c7' }}
                />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Transaction table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table header + filters */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex-shrink-0">Transactions</h3>
          <div className="flex flex-wrap gap-2 ml-auto">
            {/* Type filter */}
            <select
              value={txnType}
              onChange={(e) => handleTxnTypeChange(e.target.value as TransactionType | '')}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              <option value="">All Types</option>
              <option value="SERVICE">Service</option>
              <option value="TIP">Tip</option>
              <option value="GIFT_CERT_SALE">Gift Cert Sale</option>
              <option value="GIFT_CERT_REDEMPTION">GC Redemption</option>
            </select>
            {/* Payment method filter */}
            <select
              value={txnPayment}
              onChange={(e) => handleTxnPaymentChange(e.target.value as PaymentMethod | '')}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
            >
              <option value="">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="GIFT_CERT">Gift Cert</option>
            </select>
          </div>
        </div>

        {/* Table body */}
        {txns.isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : txns.isError ? (
          <div className="flex items-center gap-2 p-6 text-red-500 text-sm">
            <AlertTriangle size={16} /> Failed to load transactions.
          </div>
        ) : (txnData?.transactions?.length ?? 0) === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No transactions found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Date</th>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Payment</th>
                  <th className="text-left px-6 py-3 hidden md:table-cell">Notes</th>
                  <th className="text-left px-6 py-3 hidden lg:table-cell">Appointment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {txnData?.transactions?.map((txn) => (
                  <tr key={txn.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-6 py-3 text-gray-700 whitespace-nowrap">
                      {(() => { try { return format(parseISO(txn.date), 'MMM d, yyyy'); } catch { return txn.date; } })()}
                    </td>
                    <td className="px-6 py-3">
                      <TypeBadge type={txn.type} />
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                      {formatCurrencyFull(txn.amount)}
                    </td>
                    <td className="px-6 py-3">
                      <PaymentBadge method={txn.paymentMethod} />
                    </td>
                    <td className="px-6 py-3 text-gray-500 hidden md:table-cell max-w-[200px] truncate">
                      {txn.notes ?? '—'}
                    </td>
                    <td className="px-6 py-3 hidden lg:table-cell">
                      {txn.appointmentId ? (
                        <a
                          href={`/bookings?id=${txn.appointmentId}`}
                          className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-700 text-xs font-medium"
                        >
                          View <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalTxnPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {txnPage} of {totalTxnPages}
              {txnData?.pagination?.total != null && (
                <span className="ml-1 text-gray-400">({txnData.pagination.total} total)</span>
              )}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTxnPage((p) => Math.max(1, p - 1))}
                disabled={txnPage <= 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {/* Page number pills */}
              {Array.from({ length: Math.min(5, totalTxnPages) }, (_, i) => {
                const pageNum = totalTxnPages <= 5
                  ? i + 1
                  : txnPage <= 3
                  ? i + 1
                  : txnPage >= totalTxnPages - 2
                  ? totalTxnPages - 4 + i
                  : txnPage - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setTxnPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      pageNum === txnPage
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setTxnPage((p) => Math.min(totalTxnPages, p + 1))}
                disabled={txnPage >= totalTxnPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
