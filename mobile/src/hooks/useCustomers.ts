import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthday?: string;
  notes?: string;
  loyaltyPoints: number;
  lastVisitDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerVisit {
  id: string;
  date: string;
  startTime?: string;
  status: string;
  totalPrice: number;
  services?: string[];
  staff?: { id: string; name: string };
}

export interface CustomerPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: CustomerPagination;
}

export interface CustomerVisitsResponse {
  visits: CustomerVisit[];
  total: number;
}

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'loyaltyPoints' | 'lastVisitDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  email?: string;
  birthday?: string;
  notes?: string;
}

export interface UpdateCustomerPayload {
  name?: string;
  phone?: string;
  email?: string;
  birthday?: string;
  notes?: string;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: CustomerListParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  visits: (id: string) => [...customerKeys.detail(id), 'visits'] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCustomers(params?: CustomerListParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: async (): Promise<CustomerListResponse> => {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.page !== undefined) queryParams.set('page', String(params.page));
      if (params?.limit !== undefined) queryParams.set('limit', String(params.limit));
      if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
      if (params?.sortOrder) queryParams.set('sortOrder', params.sortOrder);
      const res = await api.get<CustomerListResponse>(`/customers?${queryParams.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: async (): Promise<{ customer: Customer }> => {
      const res = await api.get<{ customer: Customer }>(`/customers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCustomerPayload): Promise<Customer> => {
      const res = await api.post<{ customer: Customer }>('/customers', payload);
      return res.data.customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCustomerPayload;
    }): Promise<Customer> => {
      const res = await api.put<{ customer: Customer }>(`/customers/${id}`, payload);
      return res.data.customer;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
    },
  });
}

export function useCustomerVisits(id: string) {
  return useQuery({
    queryKey: customerKeys.visits(id),
    queryFn: async (): Promise<CustomerVisitsResponse> => {
      const res = await api.get<CustomerVisitsResponse>(`/customers/${id}/visits`);
      return res.data;
    },
    enabled: !!id,
  });
}
