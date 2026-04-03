import type { CountryConfig, CountryCode } from '@ecommerce/shared-types';
import {
  OrderStatus,
  OrderItemStatus,
  ProductStatus,
  OfferStatus,
  PaymentStatus,
  ShipmentStatus,
  ReviewStatus,
  ReviewEligibilityStatus,
  VendorStatus,
  UserRole,
} from '@ecommerce/shared-types';

// Country configurations — synced with API's SUPPORTED_COUNTRIES
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  SA: { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', currencySymbol: '﷼', currencyDecimals: 2, locale: 'en-SA' },
  AE: { code: 'AE', name: 'United Arab Emirates', currency: 'AED', currencySymbol: 'د.إ', currencyDecimals: 2, locale: 'en-AE' },
  IN: { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', currencyDecimals: 2, locale: 'en-IN' },
  US: { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', currencyDecimals: 2, locale: 'en-US' },
  GB: { code: 'GB', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£', currencyDecimals: 2, locale: 'en-GB' },
  DE: { code: 'DE', name: 'Germany', currency: 'EUR', currencySymbol: '€', currencyDecimals: 2, locale: 'de-DE' },
  FR: { code: 'FR', name: 'France', currency: 'EUR', currencySymbol: '€', currencyDecimals: 2, locale: 'fr-FR' },
  TR: { code: 'TR', name: 'Turkey', currency: 'TRY', currencySymbol: '₺', currencyDecimals: 2, locale: 'tr-TR' },
  EG: { code: 'EG', name: 'Egypt', currency: 'EGP', currencySymbol: 'E£', currencyDecimals: 2, locale: 'en-EG' },
  PK: { code: 'PK', name: 'Pakistan', currency: 'PKR', currencySymbol: '₨', currencyDecimals: 2, locale: 'en-PK' },
  KW: { code: 'KW', name: 'Kuwait', currency: 'KWD', currencySymbol: 'د.ك', currencyDecimals: 3, locale: 'en-KW' },
  QA: { code: 'QA', name: 'Qatar', currency: 'QAR', currencySymbol: 'ر.ق', currencyDecimals: 2, locale: 'en-QA' },
  BH: { code: 'BH', name: 'Bahrain', currency: 'BHD', currencySymbol: 'BD', currencyDecimals: 3, locale: 'en-BH' },
  OM: { code: 'OM', name: 'Oman', currency: 'OMR', currencySymbol: 'ر.ع', currencyDecimals: 3, locale: 'en-OM' },
  JO: { code: 'JO', name: 'Jordan', currency: 'JOD', currencySymbol: 'JD', currencyDecimals: 3, locale: 'en-JO' },
};

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange' | 'purple';

// Status → badge color mappings
export const ORDER_STATUS_COLORS: Record<OrderStatus, BadgeVariant> = {
  [OrderStatus.PENDING_PAYMENT]: 'yellow',
  [OrderStatus.CONFIRMED]: 'blue',
  [OrderStatus.PROCESSING]: 'blue',
  [OrderStatus.PARTIALLY_SHIPPED]: 'orange',
  [OrderStatus.SHIPPED]: 'purple',
  [OrderStatus.DELIVERED]: 'green',
  [OrderStatus.COMPLETED]: 'green',
  [OrderStatus.CANCELLED]: 'red',
  [OrderStatus.REFUNDED]: 'gray',
};

export const ORDER_ITEM_STATUS_COLORS: Record<OrderItemStatus, BadgeVariant> = {
  [OrderItemStatus.PENDING]: 'yellow',
  [OrderItemStatus.CONFIRMED]: 'blue',
  [OrderItemStatus.SHIPPED]: 'purple',
  [OrderItemStatus.DELIVERED]: 'green',
  [OrderItemStatus.CANCELLED]: 'red',
  [OrderItemStatus.REFUNDED]: 'gray',
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, BadgeVariant> = {
  [ProductStatus.DRAFT]: 'gray',
  [ProductStatus.PENDING_REVIEW]: 'yellow',
  [ProductStatus.APPROVED]: 'green',
  [ProductStatus.REJECTED]: 'red',
  [ProductStatus.ARCHIVED]: 'gray',
};

export const OFFER_STATUS_COLORS: Record<OfferStatus, BadgeVariant> = {
  [OfferStatus.DRAFT]: 'gray',
  [OfferStatus.PENDING_REVIEW]: 'yellow',
  [OfferStatus.ACTIVE]: 'green',
  [OfferStatus.PAUSED]: 'yellow',
  [OfferStatus.OUT_OF_STOCK]: 'orange',
  [OfferStatus.REJECTED]: 'red',
  [OfferStatus.ARCHIVED]: 'gray',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, BadgeVariant> = {
  [PaymentStatus.PENDING]: 'yellow',
  [PaymentStatus.PROCESSING]: 'blue',
  [PaymentStatus.SUCCEEDED]: 'green',
  [PaymentStatus.FAILED]: 'red',
  [PaymentStatus.CANCELLED]: 'gray',
  [PaymentStatus.PARTIALLY_REFUNDED]: 'orange',
  [PaymentStatus.REFUNDED]: 'gray',
};

export const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, BadgeVariant> = {
  [ShipmentStatus.PENDING]: 'yellow',
  [ShipmentStatus.PICKING]: 'blue',
  [ShipmentStatus.PACKED]: 'blue',
  [ShipmentStatus.SHIPPED]: 'purple',
  [ShipmentStatus.IN_TRANSIT]: 'purple',
  [ShipmentStatus.OUT_FOR_DELIVERY]: 'orange',
  [ShipmentStatus.DELIVERED]: 'green',
  [ShipmentStatus.FAILED_DELIVERY]: 'red',
  [ShipmentStatus.RETURNED]: 'gray',
  [ShipmentStatus.CANCELLED]: 'gray',
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, BadgeVariant> = {
  [ReviewStatus.PENDING_MODERATION]: 'yellow',
  [ReviewStatus.APPROVED]: 'green',
  [ReviewStatus.REJECTED]: 'red',
};

export const REVIEW_ELIGIBILITY_STATUS_COLORS: Record<ReviewEligibilityStatus, BadgeVariant> = {
  [ReviewEligibilityStatus.ELIGIBLE]: 'green',
  [ReviewEligibilityStatus.REVIEW_SUBMITTED]: 'blue',
  [ReviewEligibilityStatus.EXPIRED]: 'gray',
};

export const VENDOR_STATUS_COLORS: Record<VendorStatus, BadgeVariant> = {
  [VendorStatus.PENDING]: 'yellow',
  [VendorStatus.APPROVED]: 'green',
  [VendorStatus.SUSPENDED]: 'orange',
  [VendorStatus.REJECTED]: 'red',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.MODERATOR]: 'Moderator',
  [UserRole.OPS]: 'Operations',
  [UserRole.VENDOR]: 'Vendor',
  [UserRole.VENDOR_STAFF]: 'Vendor Staff',
  [UserRole.CUSTOMER]: 'Customer',
};

export type { BadgeVariant };
