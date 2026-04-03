import { ReviewEligibilityStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

const VALID_TRANSITIONS: Record<ReviewEligibilityStatus, ReviewEligibilityStatus[]> = {
  [ReviewEligibilityStatus.ELIGIBLE]: [
    ReviewEligibilityStatus.REVIEW_SUBMITTED,
    ReviewEligibilityStatus.EXPIRED,
  ],
  [ReviewEligibilityStatus.REVIEW_SUBMITTED]: [],
  [ReviewEligibilityStatus.EXPIRED]: [],
};

export function canTransitionReviewEligibility(
  from: ReviewEligibilityStatus,
  to: ReviewEligibilityStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertReviewEligibilityTransition(
  from: ReviewEligibilityStatus,
  to: ReviewEligibilityStatus,
): void {
  if (!canTransitionReviewEligibility(from, to)) {
    throw new InvalidStateTransitionException('ReviewEligibility', from, to);
  }
}
