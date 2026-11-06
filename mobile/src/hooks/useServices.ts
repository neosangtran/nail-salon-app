import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  category: string;
}

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async (): Promise<Service[]> => {
      const res = await api.get<{ services: Service[] }>('/services');
      return res.data.services;
    },
    staleTime: 1000 * 60 * 10,
  });
}
