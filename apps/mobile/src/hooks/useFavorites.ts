import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoriteApi } from '../services/api';

export function useFavoriteList() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoriteApi.list(),
    staleTime: 60 * 1000,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shopId: number) => favoriteApi.toggle(shopId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });
}

export function useCheckFavorite(shopId: number) {
  return useQuery({
    queryKey: ['favorites', 'check', shopId],
    queryFn: () => favoriteApi.check(shopId),
    enabled: !!shopId,
  });
}
