import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CommissionStaff {
  id: string;
  name: string;
}

export interface CommissionAppointment {
  id: string;
  date: string;
  totalPrice: number;
  service: { id: string; name: string };
}

export interface Commission {
  id: string;
  staffId: string;
  appointmentId?: string;
  amount: number;
  rate: number;
  period: string;
  isPaid: boolean;
  paidAt?: string;
  createdAt?: string;
  staff?: CommissionStaff;
  appointment?: CommissionAppointment;
  staffName?: string;
  appointmentDate?: string;
  serviceName?: string;
  serviceAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
}

export interface CommissionSummaryItem {
  staffId: string;
  staffName: string;
  period: string;
  totalEarned: number;
  totalPaid: number;
  totalUnpaid: number;
}

export type CommissionSummaryResponse = CommissionSummaryItem[];

export interface CommissionPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CommissionListResponse {
  commissions: Commission[];
  pagination: CommissionPagination;
}

export interface CommissionListParams {
  staffId?: string;
  period?: string;
  isPaid?: boolean;
  page?: number;
  limit?: number;
}

export interface BulkPayPayload {
  ids: string[];
}

export interface CalculateCommissionsPayload {
  period: string;
  staffId?: string;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const commissionKeys = {
  all: ['commissions'] as const,
  lists: () => [...commissionKeys.all, 'list'] as const,
  list: (params?: CommissionListParams) => [...commissionKeys.lists(), params] as const,
  summary: (period?: string) => [...commissionKeys.all, 'summary', period] as const,
  byStaff: (staffId: string) => [...commissionKeys.all, 'staff', staffId] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCommissions(params?: CommissionListParams) {
  return useQuery({
    queryKey: commissionKeys.list(params),
    queryFn: async (): Promise<CommissionListResponse> => {
      const queryParams = new URLSearchParams();
      if (params?.staffId) queryParams.set('staffId', params.staffId);
      if (params?.period) queryParams.set('period', params.period);
      if (params?.isPaid !== undefined) queryParams.set('isPaid', String(params.isPaid));
      if (params?.page !== undefined) queryParams.set('page', String(params.page));
      if (params?.limit !== undefined) queryParams.set('limit', String(params.limit));
      const res = await api.get<CommissionListResponse>(`/commissions?${queryParams.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCommissionSummary(period?: string) {
  return useQuery({
    queryKey: commissionKeys.summary(period),
    queryFn: async (): Promise<CommissionSummaryResponse> => {
      const queryParams = new URLSearchParams();
      if (period) queryParams.set('period', period);
      const res = await api.get<CommissionSummaryResponse>(
        `/commissions/summary?${queryParams.toString()}`
      );
      return res.data;
    },
  });
}

export function useMarkAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<Commission> => {
      const res = await api.put<{ commission: Commission }>(`/commissions/${id}/pay`);
      return res.data.commission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commissionKeys.all });
    },
  });
}

export function useMarkBulkAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkPayPayload): Promise<{ updated: number }> => {
      const res = await api.put<{ updated: number }>('/commissions/bulk-pay', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commissionKeys.all });
    },
  });
}

export function useCalculateCommissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: CalculateCommissionsPayload
    ): Promise<{ calculated: number; period: string }> => {
      const res = await api.post<{ calculated: number; period: string }>(
        '/commissions/calculate',
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commissionKeys.all });
    },
  });
}
