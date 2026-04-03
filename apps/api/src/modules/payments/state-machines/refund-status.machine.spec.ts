import { RefundStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import { canTransitionRefund, assertRefundTransition } from './refund-status.machine';

describe('Refund Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [RefundStatus, RefundStatus][] = [
      [RefundStatus.PENDING, RefundStatus.PROCESSING],
      [RefundStatus.PROCESSING, RefundStatus.SUCCEEDED],
      [RefundStatus.PROCESSING, RefundStatus.FAILED],
      [RefundStatus.FAILED, RefundStatus.PENDING],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionRefund(from, to)).toBe(true);
      expect(() => assertRefundTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [RefundStatus, RefundStatus][] = [
      [RefundStatus.PENDING, RefundStatus.SUCCEEDED],
      [RefundStatus.PENDING, RefundStatus.FAILED],
      [RefundStatus.PROCESSING, RefundStatus.PENDING],
      [RefundStatus.SUCCEEDED, RefundStatus.PENDING],
      [RefundStatus.SUCCEEDED, RefundStatus.PROCESSING],
      [RefundStatus.SUCCEEDED, RefundStatus.FAILED],
      [RefundStatus.FAILED, RefundStatus.PROCESSING],
      [RefundStatus.FAILED, RefundStatus.SUCCEEDED],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionRefund(from, to)).toBe(false);
      expect(() => assertRefundTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
