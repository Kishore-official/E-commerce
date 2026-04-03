import { OrderItemStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import { canTransitionOrderItem, assertOrderItemTransition } from './order-item-status.machine';

describe('Order Item Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [OrderItemStatus, OrderItemStatus][] = [
      [OrderItemStatus.PENDING, OrderItemStatus.CONFIRMED],
      [OrderItemStatus.PENDING, OrderItemStatus.CANCELLED],
      [OrderItemStatus.CONFIRMED, OrderItemStatus.SHIPPED],
      [OrderItemStatus.CONFIRMED, OrderItemStatus.CANCELLED],
      [OrderItemStatus.SHIPPED, OrderItemStatus.DELIVERED],
      [OrderItemStatus.DELIVERED, OrderItemStatus.REFUNDED],
      [OrderItemStatus.CANCELLED, OrderItemStatus.REFUNDED],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionOrderItem(from, to)).toBe(true);
      expect(() => assertOrderItemTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [OrderItemStatus, OrderItemStatus][] = [
      [OrderItemStatus.PENDING, OrderItemStatus.SHIPPED],
      [OrderItemStatus.PENDING, OrderItemStatus.DELIVERED],
      [OrderItemStatus.PENDING, OrderItemStatus.REFUNDED],
      [OrderItemStatus.CONFIRMED, OrderItemStatus.PENDING],
      [OrderItemStatus.CONFIRMED, OrderItemStatus.DELIVERED],
      [OrderItemStatus.CONFIRMED, OrderItemStatus.REFUNDED],
      [OrderItemStatus.SHIPPED, OrderItemStatus.PENDING],
      [OrderItemStatus.SHIPPED, OrderItemStatus.CONFIRMED],
      [OrderItemStatus.SHIPPED, OrderItemStatus.CANCELLED],
      [OrderItemStatus.DELIVERED, OrderItemStatus.PENDING],
      [OrderItemStatus.DELIVERED, OrderItemStatus.CONFIRMED],
      [OrderItemStatus.DELIVERED, OrderItemStatus.CANCELLED],
      [OrderItemStatus.CANCELLED, OrderItemStatus.PENDING],
      [OrderItemStatus.CANCELLED, OrderItemStatus.CONFIRMED],
      [OrderItemStatus.REFUNDED, OrderItemStatus.PENDING],
      [OrderItemStatus.REFUNDED, OrderItemStatus.CANCELLED],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionOrderItem(from, to)).toBe(false);
      expect(() => assertOrderItemTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
