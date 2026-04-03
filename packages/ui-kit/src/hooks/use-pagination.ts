'use client';

import { useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

export function usePagination(defaultLimit = 20): UsePaginationReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || defaultLimit;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        params.set(key, value);
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const setPage = useCallback(
    (newPage: number) => updateParams({ page: String(newPage) }),
    [updateParams],
  );

  const setLimit = useCallback(
    (newLimit: number) => updateParams({ limit: String(newLimit), page: '1' }),
    [updateParams],
  );

  return { page, limit, setPage, setLimit };
}
