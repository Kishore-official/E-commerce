// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// API Response envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// Money
export interface Money {
  amount: number; // in minor units (e.g., paise for INR)
  currency: CurrencyCode;
}

// Address
export interface Address {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  countryCode: CountryCode;
  phone?: string;
}

// Country and Currency
export type CountryCode = 'SA' | 'AE' | 'EG' | 'JO' | 'KW' | 'BH' | 'QA' | 'OM' | 'IQ' | 'LB' | 'MA' | 'TN' | 'DZ' | 'LY' | 'SD' | 'YE' | 'PS' | 'IN' | 'US' | 'GB' | 'DE' | 'FR' | 'TR' | 'PK';

export type CurrencyCode = 'SAR' | 'INR' | 'AED' | 'EGP' | 'JOD' | 'KWD' | 'BHD' | 'QAR' | 'OMR' | 'IQD' | 'LBP' | 'MAD' | 'TND' | 'DZD' | 'LYD' | 'SDG' | 'YER' | 'USD' | 'GBP' | 'EUR' | 'TRY' | 'PKR';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: CurrencyCode;
  currencySymbol: string;
  currencyDecimals: number;
  locale: string;
}

// Date helpers
export type ISODateString = string;

