'use client';

import React from 'react';
import { SWRConfig } from 'swr';
import { apiClient } from '../lib/api-client';

const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  return response.data.data ?? response.data;
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        dedupingInterval: 2000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
