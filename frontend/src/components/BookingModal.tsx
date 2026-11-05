import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format, addMinutes, parse } from 'date-fns';
import api from '../lib/api';
import { useCreateBooking, useUpdateBooking, type Booking, type UpdateBookingPayload } from '../hooks/useBookings';

// ─── Static service list (seed data) ─────────────────────────────────────────

export const SERVICES = [
  { id:'svc-001', name: 'Classic Manicure',   duration: 30,  price: 25  },
  { id:'svc-002', name: 'Gel Manicure',        duration: 45,  price: 40  },
  { id:'svc-003', name: 'Classic Pedicure',    duration: 45,  price: 35  },
  { id:'svc-004', name: 'Gel Pedicure',        duration: 60,  price: 55  },
  { id:'svc-005', name: 'Acrylic Full Set',    duration: 90,  price: 65  },
  { id:'svc-006', name: 'Acrylic Fill',        duration: 60,  price: 45  },
  { id:'svc-007', name: 'Nail Art (per nail)', duration: 15,  price: 5   },
  { id:'svc-008', name: 'Dip Powder Manicure', duration: 60,  price: 50  },
];

// ─── Time slot helpers ────────────────────────────────────────────────────────

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  // 9:00 AM to 6:30 PM in 30-min increments
  for (let h = 9; h <= 18; h++) {
    for (const m of [0, 30]) {
      if (h === 18 && m === 30) break; // stop at 6:30pm (last start)
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function calcEndTime(startTime: string, durationMinutes: number): string {
  try {
    const base = parse(startTime, 'HH:mm', new Date());
    return format(addMinutes(base, durationMinutes), 'HH:mm');
  } catch {
    return '';
  }
}

function displayTime(time24: string): string {
  try {
    const d = parse(time24, 'HH:mm', new Date());
    return format(d, 'h:mm a');
  } catch {
    return time24;
  }
}

// ─── Customer search ──────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface CustomersResponse {
  customers: Customer[];
  total: number;
}

interface StaffMember {
  id: string;
  name: string;
  specialization?: string;
  isActive: boolean;
}

interface StaffResponse {
  staff: StaffMember[];
  total: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialTime?: string;
  existingBooking?: Booking | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingModal({
  isOpen,
  onClose,
  initialDate,
  initialTime,
  existingBooking,
}: BookingModalProps) {
  const isEditing = !!existingBooking;

  // Form state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(() =>
    initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState(initialTime ?? '10:00');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');

  const customerSearchRef = useRef<HTMLDivElement>(null);

  // Pre-fill when editing
  useEffect(() => {
    if (existingBooking) {
      setSelectedCustomer(existingBooking.customer as Customer);
      setCustomerSearch(existingBooking.customer?.name ?? '');
      setSelectedStaffId(existingBooking.staff?.id ?? '');
      setSelectedServiceIds(existingBooking.serviceId ? [existingBooking.serviceId] : []);
      setDate(existingBooking.date ?? '');
      setStartTime(existingBooking.startTime ?? '10:00');
      setNotes(existingBooking.notes ?? '');
    } else {
      // Reset for new booking
      setSelectedCustomer(null);
      setCustomerSearch('');
      setSelectedStaffId('');
      setSelectedServiceIds([]);
      setDate(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setStartTime(initialTime ?? '10:00');
      setNotes('');
    }
    setSubmitError('');
  }, [existingBooking, initialDate, initialTime, isOpen]);

  // Customer search query
  const customerQuery = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: async (): Promise<CustomersResponse> => {
      const qp = new URLSearchParams();
      if (customerSearch.trim()) qp.set('search', customerSearch.trim());
      qp.set('limit', '8');
      const res = await api.get<CustomersResponse>(`/customers?${qp.toString()}`);
      return res.data;
    },
    enabled: showCustomerDropdown && customerSearch.length >= 1,
    staleTime: 10_000,
  });

  // Staff query
  const staffQuery = useQuery({
    queryKey: ['staff-active'],
    queryFn: async (): Promise<StaffResponse> => {
      const res = await api.get<StaffResponse>('/staff?isActive=true&limit=50');
      return res.data;
    },
    staleTime: 60_000,
  });

  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const isSaving = createBooking.isPending || updateBooking.isPending;

  // Computed total duration + end time
  const totalDuration = selectedServiceIds.reduce((sum, id) => {
    const svc = SERVICES.find((s) => s.id === id);
    return sum + (svc?.duration ?? 0);
  }, 0);
  const endTime = totalDuration > 0 ? calcEndTime(startTime, totalDuration) : '';
  const totalPrice = selectedServiceIds.reduce((sum, id) => {
    const svc = SERVICES.find((s) => s.id === id);
    return sum + (svc?.price ?? 0);
  }, 0);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleServiceToggle = useCallback((id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedCustomer) { setSubmitError('Please select a customer.'); return; }
    if (!selectedStaffId)   { setSubmitError('Please select a staff member.'); return; }
    if (selectedServiceIds.length === 0) { setSubmitError('Please select at least one service.'); return; }
    if (!date)      { setSubmitError('Please select a date.'); return; }
    if (!startTime) { setSubmitError('Please select a start time.'); return; }

    try {
      if (isEditing && existingBooking) {
        const payload: UpdateBookingPayload = {
          customerId: selectedCustomer.id,
          staffId: selectedStaffId,
          serviceIds: selectedServiceIds,
          date,
          startTime,
          notes: notes || undefined,
        };
        await updateBooking.mutateAsync({ id: existingBooking.id, payload });
      } else {
        await createBooking.mutateAsync({
          customerId: selectedCustomer.id,
          staffId: selectedStaffId,
          serviceIds: selectedServiceIds,
          date,
          startTime,
          notes: notes || undefined,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save booking. Please try again.';
      setSubmitError(msg);
    }
  };

  if (!isOpen) return null;

  const staffList: StaffMember[] = staffQuery.data?.staff ?? [];
  const customers: Customer[] = customerQuery.data?.customers ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {isEditing ? 'Edit Booking' : 'New Booking'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEditing ? 'Update appointment details' : 'Schedule a new appointment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Customer search */}
          <div ref={customerSearchRef} className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Customer <span className="text-primary-500">*</span>
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input-field pl-9"
                placeholder="Search by name, phone or email…"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomer(null);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
              />
              {customerQuery.isLoading && (
                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Customer dropdown */}
            {showCustomerDropdown && customerSearch.length >= 1 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {customerQuery.isLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
                ) : customers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No customers found</div>
                ) : (
                  customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors border-b border-gray-50 last:border-0"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerSearch(c.name);
                        setShowCustomerDropdown(false);
                      }}
                    >
                      <div className="text-sm font-medium text-gray-800">{c.name}</div>
                      {(c.phone || c.email) && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {c.phone ?? c.email}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedCustomer && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-full">
                <div className="w-4 h-4 rounded-full bg-primary-200 flex items-center justify-center text-[9px] font-bold">
                  {selectedCustomer.name[0]}
                </div>
                {selectedCustomer.name}
              </div>
            )}
          </div>

          {/* Staff select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Staff Member <span className="text-primary-500">*</span>
            </label>
            <select
              className="input-field"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">Select staff…</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.specialization ? ` — ${s.specialization}` : ''}
                </option>
              ))}
            </select>
            {staffQuery.isLoading && (
              <p className="text-xs text-gray-400 mt-1">Loading staff…</p>
            )}
          </div>

          {/* Services */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Services <span className="text-primary-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICES.map((svc) => {
                const checked = selectedServiceIds.includes(svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleServiceToggle(svc.id)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                      checked
                        ? 'border-primary-400 bg-primary-50 text-primary-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium leading-tight">{svc.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {svc.duration} min · ${svc.price}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedServiceIds.length > 0 && (
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Total duration: <strong className="text-gray-700">{totalDuration} min</strong></span>
                <span>Total price: <strong className="text-primary-600">${totalPrice}</strong></span>
              </div>
            )}
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Date <span className="text-primary-500">*</span>
              </label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Start Time <span className="text-primary-500">*</span>
              </label>
              <select
                className="input-field"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{displayTime(t)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* End time computed */}
          {endTime && (
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span>Estimated end time:</span>
              <span className="font-semibold text-gray-700">{displayTime(endTime)}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Notes <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Any special requests or notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Error */}
          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2.5">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {submitError}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-secondary"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
            disabled={isSaving}
          >
            {isSaving && <Loader2 size={15} className="animate-spin" />}
            {isEditing ? 'Save Changes' : 'Book Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}
