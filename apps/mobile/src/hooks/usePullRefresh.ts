import { useState, useCallback } from 'react';

interface UsePullRefreshOptions<T> {
  fetchFn: (page: number) => Promise<{ data: T[]; total: number }>;
  pageSize?: number;
}

export function usePullRefresh<T>({ fetchFn, pageSize = 10 }: UsePullRefreshOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetchFn(1);
      setData(res.data);
      setPage(1);
      setHasMore(res.data.length < res.total);
    } catch {} finally {
      setRefreshing(false);
    }
  }, [fetchFn]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetchFn(nextPage);
      setData(prev => [...prev, ...res.data]);
      setPage(nextPage);
      setHasMore(res.data.length < res.total);
    } catch {} finally {
      setLoadingMore(false);
    }
  }, [page, loadingMore, hasMore, fetchFn]);

  return { data, refreshing, loadingMore, hasMore, refresh, loadMore };
}
