import type { CurrencyCode } from '@ecommerce/shared-types';
import { COUNTRY_CONFIGS } from './constants';

/**
 * Format price from minor units (halalah) to display string.
 * Example: formatPrice(14999, 'SAR') → "SAR 149.99"
 */
export function formatPrice(
  amount: number,
  currency: CurrencyCode = 'SAR',
): string {
  const config = Object.values(COUNTRY_CONFIGS).find(
    (c) => c.currency === currency,
  );
  const decimals = config?.currencyDecimals ?? 2;
  const symbol = config?.currencySymbol ?? currency;
  const value = (amount / Math.pow(10, decimals)).toFixed(decimals);
  return `${symbol} ${value}`;
}

/**
 * Format date for display. Relative for recent dates, absolute otherwise.
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
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
export function formatDateTime(date: string | Date): string {
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

