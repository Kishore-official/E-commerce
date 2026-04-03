import React from 'react';
import type { CurrencyCode } from '@ecommerce/shared-types';
import { COUNTRY_CONFIGS } from '../lib/constants';
import { cn } from '../lib/cn';

export interface PriceDisplayProps {
  amount: number;
  currency?: CurrencyCode | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles: Record<string, { symbol: string; amount: string; wrapper: string }> = {
  sm: {
    wrapper: 'text-sm',
    symbol: 'text-[0.75em] mr-[1px] font-normal opacity-70',
    amount: 'font-semibold tracking-tight',
  },
  md: {
    wrapper: 'text-base',
    symbol: 'text-[0.78em] mr-[1px] font-normal opacity-70',
    amount: 'font-semibold tracking-tight',
  },
  lg: {
    wrapper: 'text-xl',
    symbol: 'text-[0.72em] mr-[2px] font-normal opacity-70',
    amount: 'font-bold tracking-tight',
  },
};

function splitPrice(amount: number, currency: string) {
  const config = Object.values(COUNTRY_CONFIGS).find(
    (c) => c.currency === currency,
  );
  const decimals = config?.currencyDecimals ?? 2;
  const locale = config?.locale ?? 'en-US';
  const value = amount / Math.pow(10, decimals);

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const parts = formatter.formatToParts(value);
    let symbol = '';
    let number = '';

    for (const part of parts) {
      if (part.type === 'currency' || part.type === 'literal' && number === '') {
        symbol += part.value;
      } else {
        number += part.value;
      }
    }

    return { symbol: symbol.trim(), number: number.trim() };
  } catch {
    const symbol = config?.currencySymbol ?? currency;
    return { symbol, number: value.toFixed(decimals) };
  }
}

export function PriceDisplay({
  amount,
  currency = 'INR',
  size = 'md',
  className,
}: PriceDisplayProps) {
  const styles = sizeStyles[size];
  const { symbol, number } = splitPrice(amount, currency);

  return (
    <span className={cn('inline-flex items-baseline text-gray-900', styles.wrapper, className)}>
      <span className={styles.symbol}>{symbol}</span>
      <span className={styles.amount}>{number}</span>
    </span>
  );
}
