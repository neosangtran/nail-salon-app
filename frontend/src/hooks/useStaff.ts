import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  photoUrl?: string;
  commissionRate: number;
  isActive: boolean;
  hireDate?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: { email: string; role: string };
}

export interface StaffAppointment {
  id: string;
  date: string;
  startTime?: string;
  status: string;
  totalPrice: number;
  services?: string[];
  customer?: { id: string; name: string };
}

export interface StaffStats {
  totalAppointments: number;
  totalCommissionEarned: number;
  commissionRate: number;
  recentAppointments: StaffAppointment[];
}

export interface StaffPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StaffListResponse {
  staff: StaffMember[];
  pagination: StaffPagination;
}

export interface StaffListParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  specialization?: string;
  commissionRate?: number;
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  commissionRate?: number;
  isActive?: boolean;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (params?: StaffListParams) => [...staffKeys.lists(), params] as const,
  details: () => [...staffKeys.all, 'detail'] as const,
  detail: (id: string) => [...staffKeys.details(), id] as const,
  stats: (id: string) => [...staffKeys.detail(id), 'stats'] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useStaff(params?: StaffListParams) {
  return useQuery({
    queryKey: staffKeys.list(params),
    queryFn: async (): Promise<StaffListResponse> => {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.isActive !== undefined) queryParams.set('isActive', String(params.isActive));
      if (params?.page !== undefined) queryParams.set('page', String(params.page));
      if (params?.limit !== undefined) queryParams.set('limit', String(params.limit));
      const res = await api.get<StaffListResponse>(`/staff?${queryParams.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export interface StaffDetailResponse {
  staff: StaffMember;
  appointments?: StaffAppointment[];
  commissionsSummary?: {
    totalEarned: number;
    totalPaid: number;
    totalUnpaid: number;
  };
  stats?: StaffStats;
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: async (): Promise<StaffDetailResponse> => {
      const res = await api.get<StaffDetailResponse>(`/staff/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStaffPayload): Promise<StaffMember> => {
      const res = await api.post<{ staff: StaffMember }>('/staff', payload);
      return res.data.staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateStaffPayload;
    }): Promise<StaffMember> => {
      const res = await api.put<{ staff: StaffMember }>(`/staff/${id}`, payload);
      return res.data.staff;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.id) });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
    },
  });
}
