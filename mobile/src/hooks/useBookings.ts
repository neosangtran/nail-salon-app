import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

// Matches the values the API stores and accepts.
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface BookingCustomer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface BookingStaff {
  id: string;
  name: string;
  specialization?: string;
}

export interface BookingService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface Booking {
  id: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  customer: BookingCustomer;
  staff: BookingStaff;
  service: BookingService;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  totalPrice: number;
  tip?: number;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BookingsListResponse {
  appointments: Booking[];
  pagination?: BookingsPagination;
}

export interface BookingsParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  staffId?: string;
  status?: BookingStatus;
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface CreateBookingPayload {
  customerId: string;
  staffId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  notes?: string;
}

// The API cannot change a booking's customer, staff or service once created.
export interface UpdateBookingPayload {
  date?: string;
  startTime?: string;
  notes?: string;
  status?: BookingStatus;
}

export interface AvailabilityResponse {
  staffId: string;
  date: string;
  serviceDuration: number;
  slots: { startTime: string; endTime: string; available: boolean; serviceEndTime?: string }[];
  bookedAppointments: { startTime: string; endTime: string; status: string }[];
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (params?: BookingsParams) => [...bookingKeys.lists(), params] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
  availabilityAll: () => [...bookingKeys.all, 'availability'] as const,
  availability: (staffId: string, date: string, serviceId: string) =>
    [...bookingKeys.availabilityAll(), staffId, date, serviceId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useBookings(params?: BookingsParams) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: async (): Promise<BookingsListResponse> => {
      const qp = new URLSearchParams();
      if (params?.date) qp.set('date', params.date);
      if (params?.startDate) qp.set('startDate', params.startDate);
      if (params?.endDate) qp.set('endDate', params.endDate);
      if (params?.staffId) qp.set('staffId', params.staffId);
      if (params?.status) qp.set('status', params.status);
      if (params?.customerId) qp.set('customerId', params.customerId);
      if (params?.page !== undefined) qp.set('page', String(params.page));
      if (params?.limit !== undefined) qp.set('limit', String(params.limit));
      const res = await api.get<BookingsListResponse>(`/bookings?${qp.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: async (): Promise<Booking> => {
      const res = await api.get<Booking>(`/bookings/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useAvailability(staffId: string, date: string, serviceId: string) {
  return useQuery({
    queryKey: bookingKeys.availability(staffId, date, serviceId),
    queryFn: async (): Promise<AvailabilityResponse> => {
      const qp = new URLSearchParams({ staffId, date, serviceId });
      const res = await api.get<AvailabilityResponse>(`/bookings/availability?${qp.toString()}`);
      return res.data;
    },
    enabled: !!staffId && !!date && !!serviceId,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBookingPayload): Promise<Booking> => {
      const res = await api.post<Booking>('/bookings', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.availabilityAll() });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateBookingPayload;
    }): Promise<Booking> => {
      const res = await api.put<Booking>(`/bookings/${id}`, payload);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.availabilityAll() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Booking> => {
      const res = await api.put<Booking>(`/bookings/${id}/cancel`);
      return res.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.availabilityAll() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id) });
    },
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paymentMethod,
    }: {
      id: string;
      paymentMethod: string;
    }): Promise<Booking> => {
      const res = await api.put<Booking>(`/bookings/${id}/complete`, {
        paymentMethod,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.availabilityAll() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.id) });
    },
  });
}
