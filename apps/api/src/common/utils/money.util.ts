/**
 * Convert a major unit amount (e.g., 10.50 SAR) to minor units (e.g., 1050 halalah).
 */
export function toMinorUnits(amount: number, decimals: number = 2): number {
  return Math.round(amount * Math.pow(10, decimals));
}

/**
 * Convert minor units (e.g., 1050 halalah) to major units (e.g., 10.50 SAR).
 */
export function fromMinorUnits(amount: number, decimals: number = 2): number {
  return amount / Math.pow(10, decimals);
}

/**
 * Format money for display.
 */
export function formatMoney(
  amountInMinorUnits: number,
  currency: string,
  decimals: number = 2,
): string {
  const major = fromMinorUnits(amountInMinorUnits, decimals);
  return `${major.toFixed(decimals)} ${currency}`;
}
