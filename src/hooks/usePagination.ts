import { useState, useCallback, useMemo } from 'react';

interface UsePaginationOptions {
  initialPageSize?: number;
  initialPage?: number;
}

export function usePagination({ initialPageSize = 10, initialPage = 1 }: UsePaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const skip = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const take = pageSize;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const next = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const previous = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goTo = useCallback(
    (p: number) => {
      setPage(Math.max(1, Math.min(p, totalPages)));
    },
    [totalPages],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    total,
    skip,
    take,
    totalPages,
    next,
    previous,
    goTo,
    setPageSize,
    setTotal,
  };
}
