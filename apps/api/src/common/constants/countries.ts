import type { CountryConfig, CountryCode, CurrencyCode } from '@ecommerce/shared-types';

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'SA',
    name: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: '﷼',
    currencyDecimals: 2,
    locale: 'en-SA',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'د.إ',
    currencyDecimals: 2,
    locale: 'en-AE',
  },
  {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    currencyDecimals: 2,
    locale: 'en-IN',
  },
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    currencyDecimals: 2,
    locale: 'en-US',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    currencyDecimals: 2,
    locale: 'en-GB',
  },
  {
    code: 'DE',
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    currencyDecimals: 2,
    locale: 'de-DE',
  },
  {
    code: 'FR',
    name: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    currencyDecimals: 2,
    locale: 'fr-FR',
  },
  {
    code: 'TR',
    name: 'Turkey',
    currency: 'TRY',
    currencySymbol: '₺',
    currencyDecimals: 2,
    locale: 'tr-TR',
  },
  {
    code: 'EG',
    name: 'Egypt',
    currency: 'EGP',
    currencySymbol: 'E£',
    currencyDecimals: 2,
    locale: 'en-EG',
  },
  {
    code: 'PK',
    name: 'Pakistan',
    currency: 'PKR',
    currencySymbol: '₨',
    currencyDecimals: 2,
    locale: 'en-PK',
  },
  {
    code: 'KW',
    name: 'Kuwait',
    currency: 'KWD',
    currencySymbol: 'د.ك',
    currencyDecimals: 3,
    locale: 'en-KW',
  },
  {
    code: 'QA',
    name: 'Qatar',
    currency: 'QAR',
    currencySymbol: 'ر.ق',
    currencyDecimals: 2,
    locale: 'en-QA',
  },
  {
    code: 'BH',
    name: 'Bahrain',
    currency: 'BHD',
    currencySymbol: 'BD',
    currencyDecimals: 3,
    locale: 'en-BH',
  },
  {
    code: 'OM',
    name: 'Oman',
    currency: 'OMR',
    currencySymbol: 'ر.ع',
    currencyDecimals: 3,
    locale: 'en-OM',
  },
  {
    code: 'JO',
    name: 'Jordan',
    currency: 'JOD',
    currencySymbol: 'JD',
    currencyDecimals: 3,
    locale: 'en-JO',
  },
];

export const LAUNCH_COUNTRY: CountryCode = 'SA';
export const LAUNCH_CURRENCY: CurrencyCode = 'SAR';

export function isValidCountryCode(code: string): code is CountryCode {
  return SUPPORTED_COUNTRIES.some((c) => c.code === code);
}

export function getCurrencyForCountry(code: CountryCode): CurrencyCode {
  const country = SUPPORTED_COUNTRIES.find((c) => c.code === code);
  if (!country) {
    throw new Error(`Unsupported country code: ${code}`);
  }
  return country.currency;
}
