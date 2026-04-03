import { RefundStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

const VALID_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  [RefundStatus.PENDING]: [RefundStatus.PROCESSING],
  [RefundStatus.PROCESSING]: [RefundStatus.SUCCEEDED, RefundStatus.FAILED],
  [RefundStatus.SUCCEEDED]: [],
  [RefundStatus.FAILED]: [RefundStatus.PENDING], // allow retry
};

export function canTransitionRefund(from: RefundStatus, to: RefundStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertRefundTransition(from: RefundStatus, to: RefundStatus): void {
  if (!canTransitionRefund(from, to)) {
    throw new InvalidStateTransitionException('Refund', from, to);
  }
}
