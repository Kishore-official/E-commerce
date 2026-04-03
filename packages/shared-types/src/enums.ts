// User roles
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  OPS = 'ops',
  VENDOR = 'vendor',
  VENDOR_STAFF = 'vendor_staff',
  CUSTOMER = 'customer',
}

// Vendor status
export enum VendorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

// Product status
export enum ProductStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

// Offer type
export enum OfferType {
  MARKETPLACE = 'marketplace',
  AFFILIATE = 'affiliate',
}

// Offer status
export enum OfferStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  PAUSED = 'paused',
  OUT_OF_STOCK = 'out_of_stock',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

// Fulfillment type
export enum FulfillmentType {
  VENDOR = 'vendor',
  PLATFORM = 'platform',
}

// Order status
export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  PARTIALLY_SHIPPED = 'partially_shipped',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// Order item status
export enum OrderItemStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// Payment status
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REFUNDED = 'refunded',
}

// Refund status
export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

// Shipment status
export enum ShipmentStatus {
  PENDING = 'pending',
  PICKING = 'picking',
  PACKED = 'packed',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED_DELIVERY = 'failed_delivery',
  RETURNED = 'returned',
  CANCELLED = 'cancelled',
}

// Review eligibility status
export enum ReviewEligibilityStatus {
  ELIGIBLE = 'eligible',
  REVIEW_SUBMITTED = 'review_submitted',
  EXPIRED = 'expired',
}

// Review status
export enum ReviewStatus {
  PENDING_MODERATION = 'pending_moderation',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Cart status
export enum CartStatus {
  ACTIVE = 'active',
  MERGED = 'merged',
  CONVERTED = 'converted',
  ABANDONED = 'abandoned',
}

// Commission status
export enum CommissionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

// Notification type
export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  OFFER_APPROVED = 'OFFER_APPROVED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  PRODUCT_APPROVED = 'PRODUCT_APPROVED',
  PRODUCT_REJECTED = 'PRODUCT_REJECTED',
  STOCK_DEPLETED = 'STOCK_DEPLETED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  VENDOR_REGISTERED = 'VENDOR_REGISTERED',
  PRODUCT_SUBMITTED = 'PRODUCT_SUBMITTED',
  OFFER_SUBMITTED = 'OFFER_SUBMITTED',
  REVIEW_SUBMITTED = 'REVIEW_SUBMITTED',
}

// Payout status
export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Coupon discount type
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

// Coupon status
export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

