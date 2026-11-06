import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { BookingFormScreenProps } from '../navigation/types';
import {
  useBooking,
  useAvailability,
  useCreateBooking,
  useUpdateBooking,
  useCancelBooking,
  type BookingCustomer,
} from '../hooks/useBookings';
import { useCustomers } from '../hooks/useCustomers';
import { useStaff } from '../hooks/useStaff';
import { useServices } from '../hooks/useServices';
import { getErrorMessage } from '../lib/api';
import { FormField, FieldLabel, ChipSelect, FormButton, FormError } from '../components/FormField';
import SearchBar from '../components/SearchBar';
import LoadingView from '../components/LoadingView';
import StatusBadge from '../components/StatusBadge';
import {
  addDays,
  formatCurrency,
  formatDate,
  formatTime,
  getTodayString,
  isValidDateInput,
  toDateInput,
  toTimeInput,
} from '../utils/format';

// Salon hours used by the API's availability check (last service must end by close).
const CLOSE_MINUTES = 19 * 60;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export default function BookingFormScreen({ route, navigation }: BookingFormScreenProps) {
  const bookingId = route.params?.bookingId;
  const isEditing = !!bookingId;

  const { data: booking, isLoading: loadingBooking } = useBooking(bookingId ?? '');
  const { data: staffData, isLoading: loadingStaff } = useStaff({ isActive: true, limit: 50 });
  const { data: services, isLoading: loadingServices } = useServices();

  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const cancelBooking = useCancelBooking();

  const [customer, setCustomer] = useState<BookingCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');

  const { data: customerResults, isFetching: searchingCustomers } = useCustomers({
    search: customerSearch.trim(),
    limit: 8,
  });

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Booking' : 'New Booking' });
  }, [navigation, isEditing]);

  // Prefill when editing
  useEffect(() => {
    if (!booking) return;
    setCustomer(booking.customer);
    setStaffId(booking.staffId);
    setServiceId(booking.serviceId);
    setDate(toDateInput(booking.date));
    setStartTime(toTimeInput(booking.startTime));
    setNotes(booking.notes ?? '');
  }, [booking]);

  const dateIsValid = isValidDateInput(date);
  const isLocked = booking?.status === 'COMPLETED' || booking?.status === 'CANCELLED';

  const { data: availability, isFetching: loadingSlots } = useAvailability(
    staffId,
    dateIsValid ? date : '',
    serviceId,
  );

  // The API's availability check counts the booking being edited as a conflict,
  // so recompute availability here without it.
  const slots = useMemo(() => {
    if (!availability) return [];
    const duration = availability.serviceDuration;
    const ownStart = booking && toDateInput(booking.date) === date ? toTimeInput(booking.startTime) : null;
    const ownEnd = booking && ownStart ? toTimeInput(booking.endTime) : null;
    const booked = availability.bookedAppointments.filter(
      (a) => !(ownStart && a.startTime === ownStart && a.endTime === ownEnd),
    );
    return availability.slots.map((slot) => {
      const start = toMinutes(slot.startTime);
      const end = start + duration;
      const conflict = booked.some((a) => start < toMinutes(a.endTime) && toMinutes(a.startTime) < end);
      return { time: slot.startTime, available: end <= CLOSE_MINUTES && !conflict };
    });
  }, [availability, booking, date]);

  // Clear a chosen time that is no longer available after staff/service/date changes.
  useEffect(() => {
    if (!startTime || slots.length === 0) return;
    const slot = slots.find((s) => s.time === startTime);
    if (slot && !slot.available) setStartTime('');
  }, [slots, startTime]);

  const selectedService = services?.find((s) => s.id === (serviceId || booking?.serviceId));
  const staffList = staffData?.staff ?? [];
  const saving = createBooking.isPending || updateBooking.isPending;

  const handleSubmit = async () => {
    setSubmitError('');
    if (!customer) return setSubmitError('Please select a customer.');
    if (!staffId) return setSubmitError('Please select a staff member.');
    if (!serviceId) return setSubmitError('Please select a service.');
    if (!dateIsValid) return setSubmitError('Please enter a valid date (YYYY-MM-DD).');
    if (!startTime) return setSubmitError('Please select a start time.');

    try {
      if (isEditing && bookingId) {
        await updateBooking.mutateAsync({
          id: bookingId,
          payload: { date, startTime, notes: notes.trim() },
        });
      } else {
        await createBooking.mutateAsync({
          customerId: customer.id,
          staffId,
          serviceId,
          date,
          startTime,
          notes: notes.trim() || undefined,
        });
      }
      navigation.goBack();
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to save booking. Please try again.'));
    }
  };

  const handleConfirm = async () => {
    if (!bookingId) return;
    setSubmitError('');
    try {
      await updateBooking.mutateAsync({ id: bookingId, payload: { status: 'CONFIRMED' } });
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Failed to confirm booking.'));
    }
  };

  const handleCancel = () => {
    if (!bookingId) return;
    Alert.alert('Cancel booking?', 'This appointment will be marked as cancelled.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          setSubmitError('');
          try {
            await cancelBooking.mutateAsync(bookingId);
            navigation.goBack();
          } catch (err) {
            setSubmitError(getErrorMessage(err, 'Failed to cancel booking.'));
          }
        },
      },
    ]);
  };

  if (isEditing && loadingBooking) return <LoadingView message="Loading booking..." />;
  if (isEditing && !booking) return <LoadingView message="Booking not found" />;
  if (loadingStaff || loadingServices) return <LoadingView message="Loading..." />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormError message={submitError} />

          {/* ── Edit mode: fixed details ───────────────────────────────── */}
          {isEditing && booking ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryName}>{booking.customer?.name}</Text>
                <StatusBadge status={booking.status} />
              </View>
              <SummaryRow label="Service" value={booking.service?.name ?? '—'} />
              <SummaryRow label="Staff" value={booking.staff?.name ?? '—'} />
              <SummaryRow label="Price" value={formatCurrency(booking.totalPrice)} />
              <SummaryRow
                label="Scheduled"
                value={`${formatDate(booking.date)} · ${formatTime(booking.startTime)}`}
              />
              {!isLocked ? (
                <Text style={styles.summaryHint}>
                  To change customer, staff or service, cancel this booking and create a new one.
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* ── Create mode: customer, staff, service ──────────────────── */}
          {!isEditing ? (
            <>
              <View style={styles.section}>
                <FieldLabel label="Customer" required />
                {customer ? (
                  <View style={styles.selectedCustomer}>
                    <View style={styles.flex}>
                      <Text style={styles.selectedName}>{customer.name}</Text>
                      {customer.phone ? <Text style={styles.selectedSub}>{customer.phone}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => setCustomer(null)}>
                      <Text style={styles.link}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <SearchBar
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                      placeholder="Search by name or phone..."
                    />
                    <View style={styles.resultsCard}>
                      {searchingCustomers && !customerResults ? (
                        <ActivityIndicator style={styles.resultsLoading} color="#e11d48" />
                      ) : (customerResults?.customers ?? []).length === 0 ? (
                        <Text style={styles.resultsEmpty}>No customers found</Text>
                      ) : (
                        (customerResults?.customers ?? []).map((c, i) => (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.resultRow, i > 0 && styles.resultDivider]}
                            onPress={() =>
                              setCustomer({ id: c.id, name: c.name, phone: c.phone, email: c.email })
                            }
                          >
                            <Text style={styles.resultName}>{c.name}</Text>
                            {c.phone ? <Text style={styles.resultSub}>{c.phone}</Text> : null}
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <FieldLabel label="Staff" required />
                {staffList.length === 0 ? (
                  <Text style={styles.muted}>No active staff members</Text>
                ) : (
                  <ChipSelect
                    options={staffList.map((s) => ({ value: s.id, label: s.name }))}
                    value={staffId}
                    onChange={setStaffId}
                  />
                )}
              </View>

              <View style={styles.section}>
                <FieldLabel label="Service" required />
                {(services ?? []).length === 0 ? (
                  <Text style={styles.muted}>No services available</Text>
                ) : (
                  <ChipSelect
                    options={(services ?? []).map((s) => ({
                      value: s.id,
                      label: s.name,
                      sublabel: `${s.duration} min · ${formatCurrency(s.price)}`,
                    }))}
                    value={serviceId}
                    onChange={setServiceId}
                  />
                )}
              </View>
            </>
          ) : null}

          {/* ── Date & time (both modes) ───────────────────────────────── */}
          {!isLocked ? (
            <>
              <View style={styles.section}>
                <FieldLabel label="Date" required />
                <View style={styles.dateRow}>
                  <TouchableOpacity
                    style={styles.dateStep}
                    onPress={() => dateIsValid && setDate(addDays(date, -1))}
                  >
                    <Feather name="chevron-left" size={20} color="#374151" />
                  </TouchableOpacity>
                  <View style={styles.flex}>
                    <FormField
                      label=""
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      keyboardType="numbers-and-punctuation"
                      maxLength={10}
                      style={styles.dateInput}
                      error={date.length === 10 && !dateIsValid ? 'Invalid date' : undefined}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.dateStep}
                    onPress={() => dateIsValid && setDate(addDays(date, 1))}
                  >
                    <Feather name="chevron-right" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
                {dateIsValid ? <Text style={styles.dateLabel}>{formatDate(date)}</Text> : null}
              </View>

              <View style={styles.section}>
                <FieldLabel label="Start time" required />
                {!staffId || !serviceId ? (
                  <Text style={styles.muted}>Select staff and service to see available times</Text>
                ) : !dateIsValid ? (
                  <Text style={styles.muted}>Enter a valid date to see available times</Text>
                ) : loadingSlots && slots.length === 0 ? (
                  <ActivityIndicator color="#e11d48" />
                ) : (
                  <ChipSelect
                    options={slots.map((s) => ({
                      value: s.time,
                      label: formatTime(s.time),
                      disabled: !s.available,
                    }))}
                    value={startTime}
                    onChange={setStartTime}
                  />
                )}
                {selectedService && startTime ? (
                  <Text style={styles.timeSummary}>
                    {formatTime(startTime)} – {formatTime(addMinutesToTime(startTime, selectedService.duration))}
                    {' · '}
                    {selectedService.duration} min
                  </Text>
                ) : null}
              </View>

              <FormField
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes for this appointment"
                multiline
              />

              <FormButton
                title={isEditing ? 'Save Changes' : 'Create Booking'}
                onPress={handleSubmit}
                loading={saving}
              />

              {isEditing && booking?.status === 'PENDING' ? (
                <FormButton
                  title="Mark as Confirmed"
                  variant="outline"
                  onPress={handleConfirm}
                  disabled={saving}
                />
              ) : null}
              {isEditing ? (
                <FormButton
                  title="Cancel Booking"
                  variant="danger"
                  onPress={handleCancel}
                  loading={cancelBooking.isPending}
                  disabled={saving}
                />
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>
              This booking is {booking?.status.toLowerCase()} and can no longer be edited.
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const total = toMinutes(hhmm) + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  muted: { fontSize: 13, color: '#9ca3af' },
  link: { fontSize: 14, fontWeight: '600', color: '#e11d48' },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  summaryName: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: '#9ca3af' },
  summaryValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  summaryHint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e11d48',
    padding: 12,
  },
  selectedName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  selectedSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 8,
  },
  resultsLoading: { padding: 16 },
  resultsEmpty: { padding: 14, fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  resultRow: { paddingHorizontal: 12, paddingVertical: 10 },
  resultDivider: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  resultName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  resultSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dateStep: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInput: { textAlign: 'center' },
  dateLabel: { fontSize: 12, color: '#6b7280', marginTop: -8 },
  timeSummary: { fontSize: 12, color: '#6b7280', marginTop: 8 },
});
