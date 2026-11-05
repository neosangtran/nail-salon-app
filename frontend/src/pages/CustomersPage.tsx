import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircle,
  Search,
  Plus,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Star,
  ArrowUpDown,
} from 'lucide-react';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  type Customer,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
  type CustomerListParams,
} from '../hooks/useCustomers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(str?: string): string {
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

function loyaltyBadge(points: number) {
  let tier: string;
  let cls: string;
  if (points >= 500) {
    tier = 'Gold';
    cls = 'bg-gold-100 text-gold-700';
  } else if (points >= 200) {
    tier = 'Silver';
    cls = 'bg-gray-200 text-gray-700';
  } else {
    tier = 'Bronze';
    cls = 'bg-orange-100 text-orange-700';
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      <Star size={10} />
      {points} pts · {tier}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: i === 0 ? 160 : 90 }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Customer Modal ───────────────────────────────────────────────────────────

interface CustomerModalProps {
  customer?: Customer | null;
  onClose: () => void;
}

function CustomerModal({ customer, onClose }: CustomerModalProps) {
  const isEdit = !!customer;
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [form, setForm] = useState({
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    birthday: customer?.birthday ? customer.birthday.substring(0, 10) : '',
    notes: customer?.notes ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && customer) {
        const payload: UpdateCustomerPayload = {
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          birthday: form.birthday || undefined,
          notes: form.notes || undefined,
        };
        await updateCustomer.mutateAsync({ id: customer.id, payload });
      } else {
        const payload: CreateCustomerPayload = {
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          birthday: form.birthday || undefined,
          notes: form.notes || undefined,
        };
        await createCustomer.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong';
      setError(message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Full Name <span className="text-primary-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@email.com"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Birthday</label>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => set('birthday', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Allergies, preferences, or other notes…"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
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
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-rose-500 hover:from-primary-600 hover:to-rose-600 rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sort Button ──────────────────────────────────────────────────────────────

type SortField = CustomerListParams['sortBy'];

interface SortButtonProps {
  label: string;
  field: SortField;
  current: SortField;
  order: 'asc' | 'desc';
  onClick: (field: SortField) => void;
}

function SortButton({ label, field, current, order, onClick }: SortButtonProps) {
  const isActive = current === field;
  return (
    <button
      onClick={() => onClick(field)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
        isActive ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      {label}
      <ArrowUpDown size={11} className={isActive ? (order === 'asc' ? 'rotate-0' : 'rotate-180') : ''} />
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useCustomers({
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortOrder,
  });

  const customers = data?.customers ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  }

  function openAdd() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditTarget(customer);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
            <UserCircle size={20} className="text-primary-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Customers</h2>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading…' : `${total} client${total !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-rose-500 hover:from-primary-600 hover:to-rose-600 rounded-lg shadow-sm transition-all"
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isError ? (
          <div className="flex items-center gap-3 p-8 text-red-600">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">Failed to load customers. Please try again.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-5 py-3.5">
                    <SortButton
                      label="Name"
                      field="name"
                      current={sortBy}
                      order={sortOrder}
                      onClick={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3.5">Phone</th>
                  <th className="text-left px-5 py-3.5">Email</th>
                  <th className="text-left px-5 py-3.5">
                    <SortButton
                      label="Loyalty"
                      field="loyaltyPoints"
                      current={sortBy}
                      order={sortOrder}
                      onClick={handleSort}
                    />
                  </th>
                  <th className="text-left px-5 py-3.5">
                    <SortButton
                      label="Last Visit"
                      field="lastVisitDate"
                      current={sortBy}
                      order={sortOrder}
                      onClick={handleSort}
                    />
                  </th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  : customers.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                        {debouncedSearch ? 'No customers match your search.' : 'No customers yet.'}
                      </td>
                    </tr>
                  )
                  : customers.map((c) => (
                    <tr key={c.id} className="hover:bg-rose-50/30 transition-colors">
                      {/* Name */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-800">{c.name}</p>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 text-gray-600">
                        {c.phone ?? <span className="text-gray-300">—</span>}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-gray-600">
                        {c.email ? (
                          <span className="truncate max-w-[200px] block">{c.email}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Loyalty */}
                      <td className="px-5 py-4">{loyaltyBadge(c.loyaltyPoints ?? 0)}</td>

                      {/* Last visit */}
                      <td className="px-5 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(c.lastVisitDate)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/customers/${c.id}`)}
                            title="View profile"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} &middot; {total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && <CustomerModal customer={editTarget} onClose={closeModal} />}
    </div>
  );
}
