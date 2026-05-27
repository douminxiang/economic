import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../services/api';

export function useOrderList(params?: { status?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderApi.list(params),
    staleTime: 30 * 1000,
  });
}

export function useOrderDetail(id: number) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => orderApi.detail(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { addressId: number; remark?: string }) => orderApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function usePayOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payMethod }: { id: number; payMethod?: string }) => orderApi.pay(id, payMethod),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => orderApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useConfirmOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => orderApi.confirm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
