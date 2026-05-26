import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { shopApi, shopNearbyApi } from '../services/api';

export function useShopList(params?: { categoryId?: number; keyword?: string; sort?: string }) {
  return useInfiniteQuery({
    queryKey: ['shops', params],
    queryFn: ({ pageParam = 1 }) => shopApi.list({ ...params, page: pageParam, limit: 10 }),
    getNextPageParam: (lastPage: any) => {
      const { page, limit, total } = lastPage.data;
      return page * limit < total ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecommendedShops() {
  return useInfiniteQuery({
    queryKey: ['shops', 'recommended'],
    queryFn: ({ pageParam = 1 }) => shopApi.recommended({ page: pageParam, limit: 10 }),
    getNextPageParam: (lastPage: any) => {
      const { page, limit, total } = lastPage.data;
      return page * limit < total ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShopDetail(id: number) {
  return useQuery({
    queryKey: ['shops', id],
    queryFn: () => shopApi.detail(id),
    enabled: !!id,
  });
}

export function useNearbyShops(params: { latitude: number; longitude: number; radius?: number; limit?: number } | null) {
  return useQuery({
    queryKey: ['shops', 'nearby', params],
    queryFn: () => shopNearbyApi.list(params!),
    enabled: !!params,
    staleTime: 2 * 60 * 1000,
  });
}
