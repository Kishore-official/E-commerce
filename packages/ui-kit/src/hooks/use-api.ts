'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import useSWRMutation from 'swr/mutation';
import type { PaginatedResult } from '@ecommerce/shared-types';
import { apiClient } from '../lib/api-client';

// Typed SWR hook for single resource
export function useApiGet<T>(
  url: string | null,
  config?: SWRConfiguration,
) {
  return useSWR<T>(url, config);
}

// Typed SWR hook for paginated list
export function useApiList<T>(
  url: string | null,
  config?: SWRConfiguration,
) {
  return useSWR<PaginatedResult<T>>(url, config);
}

// Mutation hook for POST
export function useApiPost<T, D = unknown>(url: string) {
  return useSWRMutation<T, Error, string, D>(url, async (key, { arg }) => {
    const response = await apiClient.post(key, arg);
    return response.data.data ?? response.data;
  });
}

// Mutation hook for PATCH
export function useApiPatch<T, D = unknown>(url: string) {
  return useSWRMutation<T, Error, string, D>(url, async (key, { arg }) => {
    const response = await apiClient.patch(key, arg);
    return response.data.data ?? response.data;
  });
}

// Mutation hook for DELETE
export function useApiDelete<T = void>(url: string) {
  return useSWRMutation<T, Error, string>(url, async (key) => {
    const response = await apiClient.delete(key);
    return response.data.data ?? response.data;
  });
}

// Build query string from params (strips undefined/null values)
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}
