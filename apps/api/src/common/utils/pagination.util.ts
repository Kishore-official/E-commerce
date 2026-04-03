import { PaginatedResult, PaginationMeta } from '@ecommerce/shared-types';

export function buildPaginatedResult<T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalItems / limit);
  const meta: PaginationMeta = {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return {
    data,
    meta,
  };
}

