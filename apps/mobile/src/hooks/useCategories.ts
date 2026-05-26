import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../services/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list(),
    staleTime: 10 * 60 * 1000,
  });
}
