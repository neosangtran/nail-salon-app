import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export type GiftCertStatus = 'active' | 'depleted' | 'expired';

export interface GiftCert {
  id: string;
  code: string;
  purchaserName: string;
  purchaserEmail?: string;
  recipientName?: string;
  originalAmount: number;
  remainingBalance: number;
  notes?: string;
  expiresAt?: string;
  status: GiftCertStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface GiftCertStats {
  totalIssued: number;
  totalValue: number;
  totalRedeemedValue: number;
  activeCertsCount: number;
  expiredCertsCount: number;
}

export interface GiftCertPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GiftCertListResponse {
  giftCertificates: GiftCert[];
  pagination: GiftCertPagination;
}

export interface GiftCertListParams {
  search?: string;
  status?: GiftCertStatus;
  page?: number;
  limit?: number;
}

export interface CreateGiftCertPayload {
  purchaserName: string;
  purchaserEmail?: string;
  recipientName?: string;
  amount: number;
  notes?: string;
  expiresAt?: string;
}

export interface RedeemGiftCertPayload {
  code: string;
  amount: number;
  notes?: string;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const giftCertKeys = {
  all: ['gift-certs'] as const,
  lists: () => [...giftCertKeys.all, 'list'] as const,
  list: (params?: GiftCertListParams) => [...giftCertKeys.lists(), params] as const,
  stats: () => [...giftCertKeys.all, 'stats'] as const,
  byCode: (code: string) => [...giftCertKeys.all, 'code', code] as const,
  detail: (id: string) => [...giftCertKeys.all, 'detail', id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useGiftCerts(params?: GiftCertListParams) {
  return useQuery({
    queryKey: giftCertKeys.list(params),
    queryFn: async (): Promise<GiftCertListResponse> => {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.page !== undefined) queryParams.set('page', String(params.page));
      if (params?.limit !== undefined) queryParams.set('limit', String(params.limit));
      const res = await api.get<GiftCertListResponse>(`/gift-certs?${queryParams.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useGiftCertStats() {
  return useQuery({
    queryKey: giftCertKeys.stats(),
    queryFn: async (): Promise<GiftCertStats> => {
      const res = await api.get<GiftCertStats>('/gift-certs/stats');
      return res.data;
    },
  });
}

export function useGiftCertByCode(code: string) {
  return useQuery({
    queryKey: giftCertKeys.byCode(code),
    queryFn: async (): Promise<{ giftCert: GiftCert }> => {
      const res = await api.get<{ giftCert: GiftCert }>(`/gift-certs/code/${code}`);
      return res.data;
    },
    enabled: !!code,
    retry: false,
  });
}

export function useCreateGiftCert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGiftCertPayload): Promise<GiftCert> => {
      const res = await api.post<{ giftCert: GiftCert }>('/gift-certs', payload);
      return res.data.giftCert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCertKeys.lists() });
      queryClient.invalidateQueries({ queryKey: giftCertKeys.stats() });
    },
  });
}

export function useRedeemGiftCert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RedeemGiftCertPayload): Promise<{ giftCert: GiftCert; amountRedeemed: number }> => {
      const res = await api.post<{ giftCert: GiftCert; amountRedeemed: number }>('/gift-certs/redeem', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: giftCertKeys.lists() });
      queryClient.invalidateQueries({ queryKey: giftCertKeys.stats() });
      queryClient.invalidateQueries({ queryKey: giftCertKeys.all });
    },
  });
}
