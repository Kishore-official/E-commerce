import { PaymentStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import { canTransitionPayment, assertPaymentTransition } from './payment-status.machine';

describe('Payment Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [PaymentStatus, PaymentStatus][] = [
      [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
      [PaymentStatus.PENDING, PaymentStatus.CANCELLED],
      [PaymentStatus.PROCESSING, PaymentStatus.SUCCEEDED],
      [PaymentStatus.PROCESSING, PaymentStatus.FAILED],
      [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED],
      [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED],
      [PaymentStatus.FAILED, PaymentStatus.PENDING],
      [PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionPayment(from, to)).toBe(true);
      expect(() => assertPaymentTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [PaymentStatus, PaymentStatus][] = [
      [PaymentStatus.PENDING, PaymentStatus.SUCCEEDED],
      [PaymentStatus.PENDING, PaymentStatus.FAILED],
      [PaymentStatus.PENDING, PaymentStatus.REFUNDED],
      [PaymentStatus.PROCESSING, PaymentStatus.PENDING],
      [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED],
      [PaymentStatus.PROCESSING, PaymentStatus.REFUNDED],
      [PaymentStatus.SUCCEEDED, PaymentStatus.PENDING],
      [PaymentStatus.SUCCEEDED, PaymentStatus.PROCESSING],
      [PaymentStatus.SUCCEEDED, PaymentStatus.FAILED],
      [PaymentStatus.SUCCEEDED, PaymentStatus.CANCELLED],
      [PaymentStatus.FAILED, PaymentStatus.PROCESSING],
      [PaymentStatus.FAILED, PaymentStatus.SUCCEEDED],
      [PaymentStatus.FAILED, PaymentStatus.CANCELLED],
      [PaymentStatus.CANCELLED, PaymentStatus.PENDING],
      [PaymentStatus.CANCELLED, PaymentStatus.PROCESSING],
      [PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.PENDING],
      [PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.SUCCEEDED],
      [PaymentStatus.REFUNDED, PaymentStatus.PENDING],
      [PaymentStatus.REFUNDED, PaymentStatus.SUCCEEDED],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionPayment(from, to)).toBe(false);
      expect(() => assertPaymentTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
