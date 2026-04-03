import { OrderStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import { canTransitionOrder, assertOrderTransition } from './order-status.machine';

describe('Order Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED, OrderStatus.PROCESSING],
      [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING, OrderStatus.PARTIALLY_SHIPPED],
      [OrderStatus.PROCESSING, OrderStatus.SHIPPED],
      [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PARTIALLY_SHIPPED, OrderStatus.SHIPPED],
      [OrderStatus.PARTIALLY_SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED, OrderStatus.COMPLETED],
      [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
      [OrderStatus.COMPLETED, OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED, OrderStatus.REFUNDED],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionOrder(from, to)).toBe(true);
      expect(() => assertOrderTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [OrderStatus, OrderStatus][] = [
      [OrderStatus.PENDING_PAYMENT, OrderStatus.PROCESSING],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.SHIPPED],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.DELIVERED],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.COMPLETED],
      [OrderStatus.PENDING_PAYMENT, OrderStatus.REFUNDED],
      [OrderStatus.CONFIRMED, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.CONFIRMED, OrderStatus.SHIPPED],
      [OrderStatus.CONFIRMED, OrderStatus.DELIVERED],
      [OrderStatus.PROCESSING, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.PROCESSING, OrderStatus.CONFIRMED],
      [OrderStatus.PROCESSING, OrderStatus.DELIVERED],
      [OrderStatus.SHIPPED, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.SHIPPED, OrderStatus.CONFIRMED],
      [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.CANCELLED, OrderStatus.CONFIRMED],
      [OrderStatus.REFUNDED, OrderStatus.PENDING_PAYMENT],
      [OrderStatus.REFUNDED, OrderStatus.CANCELLED],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionOrder(from, to)).toBe(false);
      expect(() => assertOrderTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
