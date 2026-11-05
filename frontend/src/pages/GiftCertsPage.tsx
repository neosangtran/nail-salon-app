import React, { useState, useMemo } from 'react';
import {
  Gift,
  Plus,
  Search,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  useGiftCerts,
  useGiftCertStats,
  useCreateGiftCert,
  useRedeemGiftCert,
  useGiftCertByCode,
  GiftCert,
  GiftCertStatus,
  CreateGiftCertPayload,
} from '../hooks/useGiftCerts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: GiftCertStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle size={10} /> Active
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
        <Clock size={10} /> Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
      <XCircle size={10} /> Depleted
    </span>
  );
}

// ─── Balance Progress Bar ─────────────────────────────────────────────────────

function BalanceBar({ cert }: { cert: GiftCert }) {
  const pct = cert.originalAmount > 0 ? (cert.remainingBalance / cert.originalAmount) * 100 : 0;
  const color = pct > 50 ? 'bg-emerald-400' : pct > 20 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-gray-800">{formatCurrency(cert.remainingBalance)}</span>
        <span className="text-gray-400">/ {formatCurrency(cert.originalAmount)}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Gift Cert Modal ──────────────────────────────────────────────────────────

interface GiftCertModalProps {
  onClose: () => void;
}

function GiftCertModal({ onClose }: GiftCertModalProps) {
  const createMutation = useCreateGiftCert();

  const today = new Date();
  const defaultExpiry = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0];

  const [form, setForm] = useState({
    purchaserName: '',
    purchaserEmail: '',
    recipientName: '',
    amount: '',
    notes: '',
    expiresAt: defaultExpiry,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.purchaserName.trim()) e.purchaserName = 'Purchaser name is required';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = 'Valid amount is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: CreateGiftCertPayload = {
      purchaserName: form.purchaserName.trim(),
      purchaserEmail: form.purchaserEmail.trim() || undefined,
      recipientName: form.recipientName.trim() || undefined,
      amount: parseFloat(form.amount),
      notes: form.notes.trim() || undefined,
      expiresAt: form.expiresAt || undefined,
    };
    await createMutation.mutateAsync(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
              <Gift size={18} className="text-primary-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Issue Gift Certificate</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchaser Name *</label>
            <input
              className="input-field"
              value={form.purchaserName}
              onChange={(e) => setForm({ ...form, purchaserName: e.target.value })}
              placeholder="Who is buying?"
            />
            {errors.purchaserName && <p className="text-xs text-red-500 mt-1">{errors.purchaserName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchaser Email</label>
            <input
              type="email"
              className="input-field"
              value={form.purchaserEmail}
              onChange={(e) => setForm({ ...form, purchaserEmail: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name</label>
            <input
              className="input-field"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              placeholder="Who is receiving? (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($) *</label>
            <input
              type="number"
              min="1"
              step="0.01"
              className="input-field"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
            <input
              type="date"
              className="input-field"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special instructions..."
            />
          </div>

          {createMutation.error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">Something went wrong. Please try again.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
              {createMutation.isPending ? 'Issuing…' : 'Issue Certificate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Redeem Modal ─────────────────────────────────────────────────────────────

interface RedeemModalProps {
  onClose: () => void;
}

function RedeemModal({ onClose }: RedeemModalProps) {
  const redeemMutation = useRedeemGiftCert();
  const [code, setCode] = useState('');
  const [lookedUpCode, setLookedUpCode] = useState('');
  const [amount, setAmount] = useState('');

  const { data: certData, isFetching, error: lookupError } = useGiftCertByCode(lookedUpCode);
  const cert = certData?.giftCert;

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim()) setLookedUpCode(code.trim().toUpperCase());
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!lookedUpCode || isNaN(amt) || amt <= 0) return;
    await redeemMutation.mutateAsync({ code: lookedUpCode, amount: amt });
    onClose();
  }

  const maxRedeem = cert?.remainingBalance ?? 0;
  const redeemAmt = parseFloat(amount) || 0;
  const isValidAmount = redeemAmt > 0 && redeemAmt <= maxRedeem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-800">Redeem Gift Certificate</h3>
            <p className="text-xs text-gray-500 mt-0.5">Enter the certificate code to look up balance</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Code lookup */}
          <form onSubmit={handleLookup}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Code</label>
            <div className="flex gap-2">
              <input
                className="input-field font-mono uppercase flex-1"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="GC-XXXX-XXXX"
              />
              <button type="submit" className="btn-primary px-3 py-2">
                {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>
          </form>

          {/* Lookup result */}
          {lookedUpCode && !isFetching && (
            <>
              {lookupError ? (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-xl">
                  <AlertCircle size={16} />
                  Certificate not found or invalid.
                </div>
              ) : cert ? (
                <div className="bg-rose-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{cert.purchaserName}</p>
                      {cert.recipientName && <p className="text-xs text-gray-500">For: {cert.recipientName}</p>}
                    </div>
                    <StatusBadge status={cert.status} />
                  </div>
                  <BalanceBar cert={cert} />
                  {cert.expiresAt && (
                    <p className="text-xs text-gray-500">Expires: {formatDate(cert.expiresAt)}</p>
                  )}
                </div>
              ) : null}
            </>
          )}

          {/* Redeem amount */}
          {cert && cert.status === 'active' && (
            <form onSubmit={handleRedeem} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Redemption Amount (max {formatCurrency(maxRedeem)})
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={maxRedeem}
                  step="0.01"
                  className="input-field"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                {redeemAmt > maxRedeem && (
                  <p className="text-xs text-red-500 mt-1">Amount exceeds remaining balance.</p>
                )}
              </div>

              {redeemMutation.error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">Something went wrong. Try again.</p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button
                  type="submit"
                  disabled={!isValidAmount || redeemMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {redeemMutation.isPending ? 'Redeeming…' : 'Redeem'}
                </button>
              </div>
            </form>
          )}

          {(!cert || cert.status !== 'active') && !lookupError && (
            <button onClick={onClose} className="btn-secondary w-full">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GiftCertsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GiftCertStatus | ''>('');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  const params = useMemo(
    () => ({ search: search || undefined, status: statusFilter || undefined, limit: 100 }),
    [search, statusFilter]
  );

  const { data, isLoading, error } = useGiftCerts(params);
  const { data: stats } = useGiftCertStats();

  const certs = data?.giftCertificates ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <Gift size={20} className="text-primary-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Gift Certificates</h2>
            <p className="text-sm text-gray-500">Issue and redeem gift certificates</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRedeemModal(true)} className="btn-secondary flex items-center gap-2">
            <Tag size={15} />
            Redeem Certificate
          </button>
          <button onClick={() => setShowIssueModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} />
            Issue New Certificate
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Issued', value: stats.totalIssued, isMoney: false },
            { label: 'Total Value', value: stats.totalValue, isMoney: true },
            { label: 'Redeemed Value', value: stats.totalRedeemedValue, isMoney: true },
            { label: 'Active Certs', value: stats.activeCertsCount, isMoney: false },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-gray-800">
                {s.isMoney ? formatCurrency(s.value as number) : s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9 py-2 text-sm"
              placeholder="Search by code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field py-2 text-sm w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as GiftCertStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="depleted">Depleted</option>
          </select>
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
            <p className="text-sm">Failed to load gift certificates.</p>
          </div>
        ) : certs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Gift size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No gift certificates found</p>
            <p className="text-sm mt-1">Issue a new certificate to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Purchaser</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Recipient</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Original</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-40">Balance</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Expires</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((cert) => (
                  <tr key={cert.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded-lg">
                        {cert.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{cert.purchaserName}</div>
                      {cert.purchaserEmail && (
                        <div className="text-xs text-gray-400">{cert.purchaserEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{cert.recipientName || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {formatCurrency(cert.originalAmount)}
                    </td>
                    <td className="px-4 py-3 min-w-40">
                      <BalanceBar cert={cert} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(cert.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={cert.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showIssueModal && <GiftCertModal onClose={() => setShowIssueModal(false)} />}
      {showRedeemModal && <RedeemModal onClose={() => setShowRedeemModal(false)} />}
    </div>
  );
}
