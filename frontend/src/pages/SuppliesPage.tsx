import React, { useState, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  X,
  ChevronUp,
  Minus,
} from 'lucide-react';
import {
  useSupplies,
  useLowStockAlerts,
  useCreateSupply,
  useUpdateSupply,
  useRestockSupply,
  Supply,
  CreateSupplyPayload,
  UpdateSupplyPayload,
} from '../hooks/useSupplies';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Nail Polish',
  'Acrylic',
  'Gel',
  'Tools',
  'Sanitizer',
  'Towels',
  'Foils',
  'Lotions',
  'Other',
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// ─── Supply Modal ─────────────────────────────────────────────────────────────

interface SupplyModalProps {
  supply?: Supply;
  onClose: () => void;
}

function SupplyModal({ supply, onClose }: SupplyModalProps) {
  const isEdit = !!supply;
  const createMutation = useCreateSupply();
  const updateMutation = useUpdateSupply();

  const [form, setForm] = useState({
    name: supply?.name ?? '',
    category: supply?.category ?? CATEGORIES[0],
    quantity: supply?.quantity ?? 0,
    unit: supply?.unit ?? '',
    reorderLevel: supply?.reorderLevel ?? 0,
    costPerUnit: supply?.costPerUnit ?? 0,
    supplier: supply?.supplier ?? '',
    notes: supply?.notes ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.unit.trim()) e.unit = 'Unit is required';
    if (form.quantity < 0) e.quantity = 'Quantity must be >= 0';
    if (form.reorderLevel < 0) e.reorderLevel = 'Reorder level must be >= 0';
    if (form.costPerUnit < 0) e.costPerUnit = 'Cost must be >= 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isEdit && supply) {
      const payload: UpdateSupplyPayload = {
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        reorderLevel: Number(form.reorderLevel),
        costPerUnit: Number(form.costPerUnit),
        supplier: form.supplier.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      await updateMutation.mutateAsync({ id: supply.id, payload });
    } else {
      const payload: CreateSupplyPayload = {
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        reorderLevel: Number(form.reorderLevel),
        costPerUnit: Number(form.costPerUnit),
        supplier: form.supplier.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      await createMutation.mutateAsync(payload);
    }
    onClose();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{isEdit ? 'Edit Supply' : 'Add New Supply'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. OPI Gel Top Coat"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
              />
              {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <input
                className="input-field"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="bottles, packs, etc."
              />
              {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit}</p>}
            </div>
          </div>

          {/* Reorder Level + Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
              <input
                type="number"
                min="0"
                className="input-field"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: parseFloat(e.target.value) || 0 })}
              />
              {errors.reorderLevel && <p className="text-xs text-red-500 mt-1">{errors.reorderLevel}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                value={form.costPerUnit}
                onChange={(e) => setForm({ ...form, costPerUnit: parseFloat(e.target.value) || 0 })}
              />
              {errors.costPerUnit && <p className="text-xs text-red-500 mt-1">{errors.costPerUnit}</p>}
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              className="input-field"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              placeholder="Supplier name or contact"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
            />
          </div>

          {/* Error from API */}
          {(createMutation.error || updateMutation.error) && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              Something went wrong. Please try again.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Restock Modal ────────────────────────────────────────────────────────────

interface RestockModalProps {
  supply: Supply;
  onClose: () => void;
}

function RestockModal({ supply, onClose }: RestockModalProps) {
  const restockMutation = useRestockSupply();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity <= 0) return;
    await restockMutation.mutateAsync({ id: supply.id, payload: { quantity, notes: notes.trim() || undefined } });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-800">Restock Supply</h3>
            <p className="text-xs text-gray-500 mt-0.5">{supply.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-rose-50 rounded-xl p-3 text-sm">
            <span className="text-gray-600">Current stock: </span>
            <span className="font-semibold text-gray-800">{supply.quantity} {supply.unit}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Quantity</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min="1"
                className="input-field text-center w-24"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Plus size={14} />
              </button>
              <span className="text-sm text-gray-500">{supply.unit}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">New total: {supply.quantity + quantity} {supply.unit}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Batch number, vendor, etc."
            />
          </div>

          {restockMutation.error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">Something went wrong. Try again.</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={restockMutation.isPending} className="btn-primary flex-1">
              {restockMutation.isPending ? 'Restocking…' : 'Confirm Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuppliesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSupply, setEditSupply] = useState<Supply | null>(null);
  const [restockSupply, setRestockSupply] = useState<Supply | null>(null);

  const params = useMemo(
    () => ({ search: search || undefined, category: category || undefined, lowStockOnly: lowStockOnly || undefined, limit: 100 }),
    [search, category, lowStockOnly]
  );

  const { data, isLoading, error } = useSupplies(params);
  const { data: lowStockData } = useLowStockAlerts();
  const updateMutation = useUpdateSupply();

  const supplies = data?.supplies ?? [];
  const lowAlerts = lowStockData?.alerts ?? [];

  function isLowStock(s: Supply) {
    return s.quantity <= s.reorderLevel;
  }

  function handleQuantityChange(supply: Supply, delta: number) {
    const newQty = Math.max(0, supply.quantity + delta);
    updateMutation.mutate({ id: supply.id, payload: { quantity: newQty } });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <Package size={20} className="text-primary-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Supplies</h2>
            <p className="text-sm text-gray-500">Manage inventory and stock levels</p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Supply
        </button>
      </div>

      {/* Low Stock Alert Banner */}
      {lowAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">
                {lowAlerts.length} item{lowAlerts.length > 1 ? 's' : ''} below reorder level
              </p>
              <div className="flex flex-wrap gap-2">
                {lowAlerts.map((alert) => (
                  <span
                    key={alert.id}
                    className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full"
                  >
                    {alert.name}
                    <span className="text-red-500">({alert.quantity}/{alert.reorderLevel} {alert.unit})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9 py-2 text-sm"
              placeholder="Search supplies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input-field py-2 text-sm w-44"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="w-4 h-4 accent-rose-500"
            />
            <span className="text-sm font-medium text-gray-700">Low Stock Only</span>
          </label>
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
            <AlertTriangle size={32} className="mx-auto mb-2" />
            <p className="text-sm">Failed to load supplies.</p>
          </div>
        ) : supplies.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No supplies found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new supply.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Quantity</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Unit</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Reorder Lvl</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cost/Unit</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Supplier</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Restocked</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((supply) => {
                  const low = isLowStock(supply);
                  return (
                    <tr
                      key={supply.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                        low ? 'border-l-2 border-l-red-400' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{supply.name}</div>
                        {low && (
                          <span className="text-xs text-red-500 font-medium flex items-center gap-1 mt-0.5">
                            <AlertTriangle size={10} /> Low stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge-rose">{supply.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuantityChange(supply, -1)}
                            disabled={supply.quantity === 0 || updateMutation.isPending}
                            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                          >
                            <Minus size={10} />
                          </button>
                          <span className={`w-10 text-center font-semibold ${low ? 'text-red-600' : 'text-gray-800'}`}>
                            {supply.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(supply, 1)}
                            disabled={updateMutation.isPending}
                            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors"
                          >
                            <ChevronUp size={10} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{supply.unit}</td>
                      <td className="px-4 py-3 text-gray-600">{supply.reorderLevel}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(supply.costPerUnit)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{supply.supplier || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(supply.lastRestocked)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setRestockSupply(supply)}
                            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                          >
                            <RefreshCw size={11} />
                            Restock
                          </button>
                          <button
                            onClick={() => setEditSupply(supply)}
                            className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Edit2 size={11} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && <SupplyModal onClose={() => setShowAddModal(false)} />}
      {editSupply && <SupplyModal supply={editSupply} onClose={() => setEditSupply(null)} />}
      {restockSupply && <RestockModal supply={restockSupply} onClose={() => setRestockSupply(null)} />}
    </div>
  );
}
