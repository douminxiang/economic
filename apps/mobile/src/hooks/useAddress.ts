import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressApi } from '../services/api';

export function useAddressList() {
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressApi.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => addressApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => addressApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => addressApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}
