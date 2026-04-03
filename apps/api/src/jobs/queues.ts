/**
 * BullMQ queue name constants.
 * Each queue handles a specific category of background jobs.
 */
export const QUEUES = {
  // Search indexing
  SEARCH_INDEX: 'search-index',

  // Email delivery
  EMAIL: 'email',

  // Domain event processing
  ORDER_EVENTS: 'order-events',
  PAYMENT_EVENTS: 'payment-events',
  LOGISTICS_EVENTS: 'logistics-events',
  AFFILIATE_EVENTS: 'affiliate-events',

  // Scheduled jobs
  REVIEW_CRON: 'review-cron',
  CART_CRON: 'cart-cron',

  // Audit logging
  AUDIT: 'audit',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
