import { ReviewStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import { canTransitionReview, assertReviewTransition } from './review-status.machine';

describe('Review Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [ReviewStatus, ReviewStatus][] = [
      [ReviewStatus.PENDING_MODERATION, ReviewStatus.APPROVED],
      [ReviewStatus.PENDING_MODERATION, ReviewStatus.REJECTED],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionReview(from, to)).toBe(true);
      expect(() => assertReviewTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [ReviewStatus, ReviewStatus][] = [
      [ReviewStatus.APPROVED, ReviewStatus.PENDING_MODERATION],
      [ReviewStatus.APPROVED, ReviewStatus.REJECTED],
      [ReviewStatus.REJECTED, ReviewStatus.PENDING_MODERATION],
      [ReviewStatus.REJECTED, ReviewStatus.APPROVED],
      [ReviewStatus.PENDING_MODERATION, ReviewStatus.PENDING_MODERATION],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionReview(from, to)).toBe(false);
      expect(() => assertReviewTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
