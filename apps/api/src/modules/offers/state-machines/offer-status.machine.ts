import { OfferStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

const VALID_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  [OfferStatus.DRAFT]: [OfferStatus.PENDING_REVIEW, OfferStatus.ARCHIVED],
  [OfferStatus.PENDING_REVIEW]: [OfferStatus.ACTIVE, OfferStatus.REJECTED],
  [OfferStatus.ACTIVE]: [
    OfferStatus.PAUSED,
    OfferStatus.OUT_OF_STOCK,
    OfferStatus.ARCHIVED,
  ],
  [OfferStatus.PAUSED]: [OfferStatus.ACTIVE, OfferStatus.ARCHIVED],
  [OfferStatus.OUT_OF_STOCK]: [OfferStatus.ACTIVE, OfferStatus.ARCHIVED],
  [OfferStatus.REJECTED]: [OfferStatus.DRAFT, OfferStatus.ARCHIVED],
  [OfferStatus.ARCHIVED]: [OfferStatus.DRAFT],
};

export function canTransitionOffer(
  from: OfferStatus,
  to: OfferStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertOfferTransition(
  from: OfferStatus,
  to: OfferStatus,
): void {
  if (!canTransitionOffer(from, to)) {
    throw new InvalidStateTransitionException('Offer', from, to);
  }
}
