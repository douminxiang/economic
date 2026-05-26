import { useQuery } from '@tanstack/react-query';
import { productApi } from '../services/api';

export function useProductList(params?: { shopId?: number; categoryId?: number }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.list(params),
    enabled: !!(params?.shopId || params?.categoryId),
  });
}

export function useProductDetail(id: number) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productApi.detail(id),
    enabled: !!id,
  });
}
