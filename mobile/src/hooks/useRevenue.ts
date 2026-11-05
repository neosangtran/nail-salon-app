import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RevenuePeriod = 'today' | 'week' | 'month' | 'year' | 'custom';
export type PaymentMethod = 'CASH' | 'CARD' | 'GIFT_CERT';
export type TransactionType = 'SERVICE' | 'TIP' | 'GIFT_CERT_SALE' | 'GIFT_CERT_REDEMPTION';

export interface PaymentBreakdown {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalServices: number;
  totalTips: number;
  totalGiftCerts: number;
  appointmentCount: number;
  byPaymentMethod: Record<string, number>;
  byType: Record<string, number>;
  serviceRevenue?: number;
  tips?: number;
  giftCertSales?: number;
  averageTicket?: number;
  previousPeriod?: {
    totalRevenue: number;
    serviceRevenue: number;
    tips: number;
    giftCertSales: number;
  };
  paymentBreakdown?: PaymentBreakdown[];
}

export interface DailyRevenuePoint {
  date: string;
  total: number;
  serviceRevenue: number;
  tips: number;
}

export interface DailyRevenueResponse {
  dailyRevenue: DailyRevenuePoint[];
}

export interface RevenueTransaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  appointmentId?: string;
  staffName?: string;
  customerName?: string;
}

export interface RevenuePagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RevenueTransactionsResponse {
  transactions: RevenueTransaction[];
  pagination: RevenuePagination;
}

export interface RevenueTransactionsParams {
  page?: number;
  limit?: number;
  type?: TransactionType | '';
  paymentMethod?: PaymentMethod | '';
  startDate?: string;
  endDate?: string;
}

export interface TopService {
  category: string;
  total: number;
  count: number;
}

export interface TopServicesResponse {
  topServices: TopService[];
}

export interface TopStaffMember {
  staffId: string;
  staffName: string;
  total: number;
  serviceRevenue: number;
  tips: number;
}

export interface TopStaffResponse {
  topStaff: TopStaffMember[];
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const revenueKeys = {
  all: ['revenue'] as const,
  summary: (period: RevenuePeriod, startDate?: string, endDate?: string) =>
    [...revenueKeys.all, 'summary', period, startDate, endDate] as const,
  daily: (startDate: string, endDate: string) =>
    [...revenueKeys.all, 'daily', startDate, endDate] as const,
  transactions: (params: RevenueTransactionsParams) =>
    [...revenueKeys.all, 'transactions', params] as const,
  topServices: (startDate: string, endDate: string) =>
    [...revenueKeys.all, 'top-services', startDate, endDate] as const,
  topStaff: (startDate: string, endDate: string) =>
    [...revenueKeys.all, 'top-staff', startDate, endDate] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useRevenueSummary(
  period: RevenuePeriod,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: revenueKeys.summary(period, startDate, endDate),
    queryFn: async (): Promise<RevenueSummary> => {
      const params = new URLSearchParams({ period });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await api.get<RevenueSummary>(`/revenue/summary?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useDailyRevenue(startDate: string, endDate: string) {
  return useQuery({
    queryKey: revenueKeys.daily(startDate, endDate),
    queryFn: async (): Promise<DailyRevenueResponse> => {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await api.get<DailyRevenueResponse>(`/revenue/daily?${params.toString()}`);
      return res.data;
    },
    enabled: !!startDate && !!endDate,
    placeholderData: (prev) => prev,
  });
}

export function useRevenueTransactions(params: RevenueTransactionsParams) {
  return useQuery({
    queryKey: revenueKeys.transactions(params),
    queryFn: async (): Promise<RevenueTransactionsResponse> => {
      const qp = new URLSearchParams();
      if (params.page !== undefined) qp.set('page', String(params.page));
      if (params.limit !== undefined) qp.set('limit', String(params.limit));
      if (params.type) qp.set('type', params.type);
      if (params.paymentMethod) qp.set('paymentMethod', params.paymentMethod);
      if (params.startDate) qp.set('startDate', params.startDate);
      if (params.endDate) qp.set('endDate', params.endDate);
      const res = await api.get<RevenueTransactionsResponse>(
        `/revenue/transactions?${qp.toString()}`
      );
      return res.data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useTopServices(startDate: string, endDate: string) {
  return useQuery({
    queryKey: revenueKeys.topServices(startDate, endDate),
    queryFn: async (): Promise<TopServicesResponse> => {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await api.get<TopServicesResponse>(
        `/revenue/top-services?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!startDate && !!endDate,
    placeholderData: (prev) => prev,
  });
}

export function useTopStaff(startDate: string, endDate: string) {
  return useQuery({
    queryKey: revenueKeys.topStaff(startDate, endDate),
    queryFn: async (): Promise<TopStaffResponse> => {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await api.get<TopStaffResponse>(
        `/revenue/top-staff?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!startDate && !!endDate,
    placeholderData: (prev) => prev,
  });
}
