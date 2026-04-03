import React from 'react';
import { Badge } from './badge';
import type { BadgeVariant } from '../lib/constants';
import {
  ORDER_STATUS_COLORS,
  ORDER_ITEM_STATUS_COLORS,
  PRODUCT_STATUS_COLORS,
  OFFER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  SHIPMENT_STATUS_COLORS,
  REVIEW_STATUS_COLORS,
  REVIEW_ELIGIBILITY_STATUS_COLORS,
  VENDOR_STATUS_COLORS,
} from '../lib/constants';
import { getStatusLabel } from '../lib/format';

type StatusMap = 'order' | 'orderItem' | 'product' | 'offer' | 'payment' | 'shipment' | 'review' | 'reviewEligibility' | 'vendor';

const COLOR_MAPS: Record<StatusMap, Record<string, BadgeVariant>> = {
  order: ORDER_STATUS_COLORS,
  orderItem: ORDER_ITEM_STATUS_COLORS,
  product: PRODUCT_STATUS_COLORS,
  offer: OFFER_STATUS_COLORS,
  payment: PAYMENT_STATUS_COLORS,
  shipment: SHIPMENT_STATUS_COLORS,
  review: REVIEW_STATUS_COLORS,
  reviewEligibility: REVIEW_ELIGIBILITY_STATUS_COLORS,
  vendor: VENDOR_STATUS_COLORS,
};

export interface StatusBadgeProps {
  status: string;
  type: StatusMap;
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  if (!status) {
    return <Badge variant="gray" className={className}>Unknown</Badge>;
  }
  const colorMap = COLOR_MAPS[type];
  const variant = colorMap?.[status] ?? 'gray';
  return (
    <Badge variant={variant} className={className}>
      {getStatusLabel(status)}
    </Badge>
  );
}
