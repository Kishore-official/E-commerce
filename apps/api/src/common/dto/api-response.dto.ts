import type { PaginationMeta } from '@ecommerce/shared-types';

export class ApiResponseDto<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;

  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.success = true;
    response.data = data;
    response.message = message;
    return response;
  }

  static error(message: string, errors?: Record<string, string[]>): ApiResponseDto<null> {
    const response = new ApiResponseDto<null>();
    response.success = false;
    response.data = null;
    response.message = message;
    response.errors = errors;
    return response;
  }
}

export class PaginatedResponseDto<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;

  static ok<T>(data: T[], meta: PaginationMeta): PaginatedResponseDto<T> {
    const response = new PaginatedResponseDto<T>();
    response.success = true;
    response.data = data;
    response.meta = meta;
    return response;
  }
}

export function buildPaginationMeta(
  totalItems: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
