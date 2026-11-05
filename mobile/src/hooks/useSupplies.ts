import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Supply {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  costPerUnit: number;
  supplier?: string;
  lastRestocked?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplyPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupplyListResponse {
  supplies: Supply[];
  pagination: SupplyPagination;
}

export interface LowStockAlert {
  id: string;
  name: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  unit: string;
  supplier?: string;
}

export interface LowStockResponse {
  alerts: LowStockAlert[];
  total: number;
}

export interface SupplyListParams {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateSupplyPayload {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  costPerUnit: number;
  supplier?: string;
  notes?: string;
}

export interface UpdateSupplyPayload {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  reorderLevel?: number;
  costPerUnit?: number;
  supplier?: string;
  notes?: string;
}

export interface RestockPayload {
  quantity: number;
  notes?: string;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const supplyKeys = {
  all: ['supplies'] as const,
  lists: () => [...supplyKeys.all, 'list'] as const,
  list: (params?: SupplyListParams) => [...supplyKeys.lists(), params] as const,
  lowStock: () => [...supplyKeys.all, 'low-stock'] as const,
  detail: (id: string) => [...supplyKeys.all, 'detail', id] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useSupplies(params?: SupplyListParams) {
  return useQuery({
    queryKey: supplyKeys.list(params),
    queryFn: async (): Promise<SupplyListResponse> => {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.category) queryParams.set('category', params.category);
      if (params?.lowStockOnly) queryParams.set('lowStockOnly', 'true');
      if (params?.page !== undefined) queryParams.set('page', String(params.page));
      if (params?.limit !== undefined) queryParams.set('limit', String(params.limit));
      const res = await api.get<SupplyListResponse>(`/supplies?${queryParams.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: supplyKeys.lowStock(),
    queryFn: async (): Promise<LowStockResponse> => {
      const res = await api.get<LowStockResponse>('/supplies/low-stock');
      return res.data;
    },
  });
}

export function useCreateSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplyPayload): Promise<Supply> => {
      const res = await api.post<{ supply: Supply }>('/supplies', payload);
      return res.data.supply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplyKeys.lowStock() });
    },
  });
}

export function useUpdateSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateSupplyPayload;
    }): Promise<Supply> => {
      const res = await api.put<{ supply: Supply }>(`/supplies/${id}`, payload);
      return res.data.supply;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: supplyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplyKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: supplyKeys.detail(variables.id) });
    },
  });
}

export function useRestockSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: RestockPayload;
    }): Promise<Supply> => {
      const res = await api.post<{ supply: Supply }>(`/supplies/${id}/restock`, payload);
      return res.data.supply;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: supplyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: supplyKeys.lowStock() });
      queryClient.invalidateQueries({ queryKey: supplyKeys.detail(variables.id) });
    },
  });
}
