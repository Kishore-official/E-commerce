import { ReviewEligibilityStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import {
  canTransitionReviewEligibility,
  assertReviewEligibilityTransition,
} from './review-eligibility-status.machine';

describe('ReviewEligibility Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [ReviewEligibilityStatus, ReviewEligibilityStatus][] = [
      [ReviewEligibilityStatus.ELIGIBLE, ReviewEligibilityStatus.REVIEW_SUBMITTED],
      [ReviewEligibilityStatus.ELIGIBLE, ReviewEligibilityStatus.EXPIRED],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionReviewEligibility(from, to)).toBe(true);
      expect(() => assertReviewEligibilityTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [ReviewEligibilityStatus, ReviewEligibilityStatus][] = [
      [ReviewEligibilityStatus.REVIEW_SUBMITTED, ReviewEligibilityStatus.ELIGIBLE],
      [ReviewEligibilityStatus.REVIEW_SUBMITTED, ReviewEligibilityStatus.EXPIRED],
      [ReviewEligibilityStatus.EXPIRED, ReviewEligibilityStatus.ELIGIBLE],
      [ReviewEligibilityStatus.EXPIRED, ReviewEligibilityStatus.REVIEW_SUBMITTED],
      [ReviewEligibilityStatus.ELIGIBLE, ReviewEligibilityStatus.ELIGIBLE],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionReviewEligibility(from, to)).toBe(false);
      expect(() => assertReviewEligibilityTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
