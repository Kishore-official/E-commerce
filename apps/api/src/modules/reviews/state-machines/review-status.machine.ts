import { ReviewStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

const VALID_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  [ReviewStatus.PENDING_MODERATION]: [
    ReviewStatus.APPROVED,
    ReviewStatus.REJECTED,
  ],
  [ReviewStatus.APPROVED]: [],
  [ReviewStatus.REJECTED]: [],
};

export function canTransitionReview(
  from: ReviewStatus,
  to: ReviewStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertReviewTransition(
  from: ReviewStatus,
  to: ReviewStatus,
): void {
  if (!canTransitionReview(from, to)) {
    throw new InvalidStateTransitionException('Review', from, to);
  }
}
