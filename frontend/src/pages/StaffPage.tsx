import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  type StaffMember,
  type CreateStaffPayload,
  type UpdateStaffPayload,
} from '../hooks/useStaff';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roleBadge(role: string) {
  const styles: Record<string, string> = {
    admin: 'bg-primary-100 text-primary-700',
    manager: 'bg-gold-100 text-gold-700',
    technician: 'bg-green-100 text-green-700',
    staff: 'bg-blue-100 text-blue-700',
  };
  const cls = styles[role] ?? 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}
    >
      {role}
    </span>
  );
}

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

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: i === 0 ? 160 : 80 }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Staff Modal ──────────────────────────────────────────────────────────────

interface StaffModalProps {
  staff?: StaffMember | null;
  onClose: () => void;
}

function StaffModal({ staff, onClose }: StaffModalProps) {
  const isEdit = !!staff;
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();

  const [form, setForm] = useState({
    name: staff?.name ?? '',
    email: staff?.email ?? '',
    phone: staff?.phone ?? '',
    specialization: staff?.specialization ?? '',
    commissionRate: staff?.commissionRate?.toString() ?? '40',
    password: '',
    isActive: staff?.isActive ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  const isPending = createStaff.isPending || updateStaff.isPending;

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && staff) {
        const payload: UpdateStaffPayload = {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          specialization: form.specialization || undefined,
          commissionRate: parseFloat(form.commissionRate),
          isActive: form.isActive,
        };
        await updateStaff.mutateAsync({ id: staff.id, payload });
      } else {
        const payload: CreateStaffPayload = {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          specialization: form.specialization || undefined,
          commissionRate: parseFloat(form.commissionRate),
          password: form.password,
        };
        await createStaff.mutateAsync(payload);
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
            {isEdit ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
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
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Email <span className="text-primary-500">*</span>
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="jane@salon.com"
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
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Specialization</label>
              <input
                type="text"
                value={form.specialization}
                onChange={(e) => set('specialization', e.target.value)}
                placeholder="e.g. Acrylic, Gel"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Commission Rate (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.commissionRate}
                onChange={(e) => set('commissionRate', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>

            {!isEdit && (
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Password <span className="text-primary-500">*</span>
                </label>
                <input
                  type="password"
                  required={!isEdit}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                />
              </div>
            )}

            {isEdit && (
              <div className="col-span-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set('isActive', !form.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    form.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            )}
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
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function StaffPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useStaff({
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const staffList = data?.staff ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  function openAdd() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditTarget(member);
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
            <Users size={20} className="text-primary-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Staff</h2>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading…' : `${total} team member${total !== 1 ? 's' : ''}`}
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
              placeholder="Search staff…"
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

          {canManage && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-rose-500 hover:from-primary-600 hover:to-rose-600 rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} />
              Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isError ? (
          <div className="flex items-center gap-3 p-8 text-red-600">
            <AlertTriangle size={18} />
            <span className="text-sm font-medium">Failed to load staff. Please try again.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-5 py-3.5">Staff Member</th>
                  <th className="text-left px-5 py-3.5">Role</th>
                  <th className="text-left px-5 py-3.5">Specialization</th>
                  <th className="text-left px-5 py-3.5">Commission</th>
                  <th className="text-left px-5 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  : staffList.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                        {debouncedSearch ? 'No staff match your search.' : 'No staff members yet.'}
                      </td>
                    </tr>
                  )
                  : staffList.map((member) => (
                    <tr key={member.id} className="hover:bg-rose-50/30 transition-colors">
                      {/* Avatar + Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(member.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                          >
                            {initials(member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{member.name}</p>
                            {member.email && (
                              <p className="text-xs text-gray-400 truncate">{member.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">{roleBadge(member.user?.role ?? 'staff')}</td>

                      {/* Specialization */}
                      <td className="px-5 py-4 text-gray-600 text-sm">
                        {member.specialization || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Commission Rate */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-gold-700 font-semibold text-sm">
                          {member.commissionRate ?? 0}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            member.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/staff/${member.id}`)}
                            title="View profile"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => openEdit(member)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
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
      {modalOpen && <StaffModal staff={editTarget} onClose={closeModal} />}
    </div>
  );
}
