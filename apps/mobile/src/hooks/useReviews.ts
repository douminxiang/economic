import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../services/api';

export function useShopReviews(shopId: number, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['reviews', 'shop', shopId, params],
    queryFn: () => reviewApi.shopReviews(shopId, params),
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => reviewApi.submit(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
}
