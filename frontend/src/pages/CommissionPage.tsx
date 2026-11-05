import { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calculator,
  CheckCircle,
  Circle,
  DollarSign,
  AlertCircle,
  ChevronDown,
  Users,
} from 'lucide-react';
import {
  useCommissions,
  useCommissionSummary,
  useMarkAsPaid,
  useMarkBulkAsPaid,
  useCalculateCommissions,
  type Commission,
  type CommissionSummaryItem,
} from '../hooks/useCommissions';
import { useStaff } from '../hooks/useStaff';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(period: string) {
  const [year, month] = period.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

// Build list of periods (last 12 months including current)
function buildPeriods() {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return periods;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ isPaid }: { isPaid: boolean }) {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle size={10} /> Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      <Circle size={10} /> Unpaid
    </span>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  period: string;
}

function SummaryCards({ period }: SummaryCardsProps) {
  const { data: summary, isLoading } = useCommissionSummary(period);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
            <div className="h-6 bg-gray-100 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  // summary is CommissionSummaryItem[] — an array returned directly from the backend
  const summaryItems: CommissionSummaryItem[] = Array.isArray(summary) ? summary : [];

  if (summaryItems.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {summaryItems.map((s) => (
        <div key={s.staffId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary-600">
                {(s.staffName ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{s.staffName ?? '—'}</p>
              <p className="text-xs text-gray-500">{s.period}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Earned</span>
              <span className="font-bold text-gray-800">{formatCurrency(s.totalEarned ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(s.totalPaid ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Unpaid</span>
              <span className="font-semibold text-amber-600">{formatCurrency(s.totalUnpaid ?? 0)}</span>
            </div>
          </div>
          {(s.totalUnpaid ?? 0) > 0 && (
            <div className="mt-3 bg-amber-50 rounded-lg px-3 py-1.5 text-xs text-amber-700 font-medium">
              Awaiting payout: {formatCurrency(s.totalUnpaid)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommissionPage() {
  const periods = useMemo(() => buildPeriods(), []);
  const [period, setPeriod] = useState(currentPeriod);
  const [staffFilter, setStaffFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCalcConfirm, setShowCalcConfirm] = useState(false);

  const params = useMemo(
    () => ({
      period,
      staffId: staffFilter || undefined,
      isPaid: paidFilter === 'all' ? undefined : paidFilter === 'paid',
      limit: 200,
    }),
    [period, staffFilter, paidFilter]
  );

  const { data, isLoading, error } = useCommissions(params);
  const { data: staffData } = useStaff({ limit: 100, isActive: true });
  const markPaid = useMarkAsPaid();
  const bulkPaid = useMarkBulkAsPaid();
  const calcMutation = useCalculateCommissions();

  const commissions: Commission[] = data?.commissions ?? [];
  const staffList = staffData?.staff ?? [];

  // Selection helpers
  const unpaidIds = commissions.filter((c) => !c.isPaid).map((c) => c.id);
  const selectedUnpaid = [...selected].filter((id) => unpaidIds.includes(id));
  const allUnpaidSelected = unpaidIds.length > 0 && unpaidIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    if (allUnpaidSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        unpaidIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        unpaidIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleMarkPaid(commissionId: string) {
    await markPaid.mutateAsync(commissionId);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(commissionId);
      return next;
    });
  }

  async function handleBulkPay() {
    if (selectedUnpaid.length === 0) return;
    await bulkPaid.mutateAsync({ ids: selectedUnpaid });
    setSelected(new Set());
  }

  async function handleCalculate() {
    await calcMutation.mutateAsync({ period });
    setShowCalcConfirm(false);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <TrendingUp size={20} className="text-primary-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Commissions</h2>
            <p className="text-sm text-gray-500">Track staff commissions and payouts</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period picker */}
          <div className="relative">
            <select
              className="input-field py-2 pl-3 pr-8 text-sm font-medium appearance-none w-48"
              value={period}
              onChange={(e) => { setPeriod(e.target.value); setSelected(new Set()); }}
            >
              {periods.map((p) => (
                <option key={p} value={p}>{periodLabel(p)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Calculate */}
          <button
            onClick={() => setShowCalcConfirm(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Calculator size={15} />
            Calculate Commissions
          </button>
        </div>
      </div>

      {/* Calculate Confirm Banner */}
      {showCalcConfirm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Calculator size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Recalculate commissions for <strong>{periodLabel(period)}</strong>? This will update all commission records for this period.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowCalcConfirm(false)} className="btn-secondary text-sm py-1.5">Cancel</button>
            <button
              onClick={handleCalculate}
              disabled={calcMutation.isPending}
              className="btn-gold text-sm py-1.5"
            >
              {calcMutation.isPending ? 'Calculating…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {calcMutation.isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 font-medium">
          Commissions recalculated successfully for {periodLabel(period)}.
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards period={period} />

      {/* Filters + Bulk Action */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap gap-3">
            {/* Staff filter */}
            <div className="relative">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                className="input-field pl-8 py-2 text-sm w-48"
                value={staffFilter}
                onChange={(e) => { setStaffFilter(e.target.value); setSelected(new Set()); }}
              >
                <option value="">All Staff</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Paid filter */}
            <select
              className="input-field py-2 text-sm w-36"
              value={paidFilter}
              onChange={(e) => { setPaidFilter(e.target.value as 'all' | 'paid' | 'unpaid'); setSelected(new Set()); }}
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          {/* Bulk pay */}
          {selectedUnpaid.length > 0 && (
            <button
              onClick={handleBulkPay}
              disabled={bulkPaid.isPending}
              className="btn-gold flex items-center gap-2 text-sm"
            >
              <DollarSign size={14} />
              {bulkPaid.isPending
                ? 'Marking Paid…'
                : `Mark ${selectedUnpaid.length} as Paid`}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p className="text-sm">Failed to load commissions.</p>
          </div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No commissions found</p>
            <p className="text-sm mt-1">
              {period ? `No data for ${periodLabel(period)}.` : 'Try adjusting filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allUnpaidSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-rose-500"
                      title="Select all unpaid"
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Staff</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Appointment Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Service</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Svc Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Rate</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Commission</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Period</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => {
                  const staffName = c.staffName ?? c.staff?.name ?? '—';
                  const apptDate = c.appointmentDate ?? c.appointment?.date;
                  const svcName = c.serviceName ?? c.appointment?.service?.name ?? '—';
                  const svcAmount = c.serviceAmount ?? c.appointment?.totalPrice ?? 0;
                  const rate = c.commissionRate ?? c.rate ?? 0;
                  const earned = c.commissionAmount ?? c.amount ?? 0;
                  return (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                      selected.has(c.id) ? 'bg-primary-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      {!c.isPaid ? (
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="w-4 h-4 accent-rose-500"
                        />
                      ) : (
                        <span className="w-4 h-4 block" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-600">
                            {staffName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">{staffName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(apptDate)}</td>
                    <td className="px-4 py-3 text-gray-700">{svcName}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(svcAmount)}</td>
                    <td className="px-4 py-3">
                      <span className="badge-gold">{(rate * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {formatCurrency(earned)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{periodLabel(c.period)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge isPaid={c.isPaid} />
                    </td>
                    <td className="px-4 py-3">
                      {!c.isPaid ? (
                        <button
                          onClick={() => handleMarkPaid(c.id)}
                          disabled={markPaid.isPending}
                          className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <DollarSign size={11} />
                          Pay
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">{c.paidAt ? formatDate(c.paidAt) : 'Paid'}</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer with totals */}
        {commissions.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60 flex flex-wrap gap-6">
            <div className="text-sm">
              <span className="text-gray-500">Total commissions: </span>
              <span className="font-bold text-gray-800">
                {formatCurrency(commissions.reduce((sum, c) => sum + (c.commissionAmount ?? c.amount ?? 0), 0))}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Unpaid: </span>
              <span className="font-bold text-amber-600">
                {formatCurrency(commissions.filter((c) => !c.isPaid).reduce((sum, c) => sum + (c.commissionAmount ?? c.amount ?? 0), 0))}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Paid: </span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(commissions.filter((c) => c.isPaid).reduce((sum, c) => sum + (c.commissionAmount ?? c.amount ?? 0), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
