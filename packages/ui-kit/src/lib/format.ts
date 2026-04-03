import type { CurrencyCode } from '@ecommerce/shared-types';
import { COUNTRY_CONFIGS } from './constants';

/**
 * Format price from minor units to display string using Intl.NumberFormat.
 * Example: formatPrice(14999, 'INR') → "₹14,999.00" (wait, minor units)
 * Actually: formatPrice(1499900, 'INR') → "₹14,999.00"
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode | string = 'INR',
): string {
  const config = Object.values(COUNTRY_CONFIGS).find(
    (c) => c.currency === currency,
  );
  const decimals = config?.currencyDecimals ?? 2;
  const locale = config?.locale ?? 'en-US';
  const value = amount / Math.pow(10, decimals);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    // Fallback for unknown currency codes
    const symbol = config?.currencySymbol ?? currency;
    return `${symbol}${value.toFixed(decimals)}`;
  }
}

/**
 * Format date for display. Relative for recent dates, absolute otherwise.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  // Future dates: use absolute format (e.g. eligibility expiry dates)
  if (diffMs < 0) {
    return d.toLocaleDateString('en-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date as a full datetime string.
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Convert SCREAMING_SNAKE_CASE to Title Case.
 * Example: "PENDING_REVIEW" → "Pending Review"
 */
export function getStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Truncate text to a max length with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
