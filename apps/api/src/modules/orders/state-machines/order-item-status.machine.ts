import { OrderItemStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

const VALID_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  [OrderItemStatus.PENDING]: [OrderItemStatus.CONFIRMED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.CONFIRMED]: [OrderItemStatus.SHIPPED, OrderItemStatus.CANCELLED],
  [OrderItemStatus.SHIPPED]: [OrderItemStatus.DELIVERED],
  [OrderItemStatus.DELIVERED]: [OrderItemStatus.REFUNDED],
  [OrderItemStatus.CANCELLED]: [OrderItemStatus.REFUNDED],
  [OrderItemStatus.REFUNDED]: [],
};

export function canTransitionOrderItem(from: OrderItemStatus, to: OrderItemStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertOrderItemTransition(from: OrderItemStatus, to: OrderItemStatus): void {
  if (!canTransitionOrderItem(from, to)) {
    throw new InvalidStateTransitionException('OrderItem', from, to);
  }
}
