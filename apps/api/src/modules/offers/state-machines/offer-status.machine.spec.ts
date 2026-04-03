import { OfferStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import {
  canTransitionOffer,
  assertOfferTransition,
} from './offer-status.machine';

describe('Offer Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [OfferStatus, OfferStatus][] = [
      [OfferStatus.DRAFT, OfferStatus.PENDING_REVIEW],
      [OfferStatus.DRAFT, OfferStatus.ARCHIVED],
      [OfferStatus.PENDING_REVIEW, OfferStatus.ACTIVE],
      [OfferStatus.PENDING_REVIEW, OfferStatus.REJECTED],
      [OfferStatus.ACTIVE, OfferStatus.PAUSED],
      [OfferStatus.ACTIVE, OfferStatus.OUT_OF_STOCK],
      [OfferStatus.ACTIVE, OfferStatus.ARCHIVED],
      [OfferStatus.PAUSED, OfferStatus.ACTIVE],
      [OfferStatus.PAUSED, OfferStatus.ARCHIVED],
      [OfferStatus.OUT_OF_STOCK, OfferStatus.ACTIVE],
      [OfferStatus.OUT_OF_STOCK, OfferStatus.ARCHIVED],
      [OfferStatus.REJECTED, OfferStatus.DRAFT],
      [OfferStatus.REJECTED, OfferStatus.ARCHIVED],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionOffer(from, to)).toBe(true);
      expect(() => assertOfferTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [OfferStatus, OfferStatus][] = [
      [OfferStatus.DRAFT, OfferStatus.ACTIVE],
      [OfferStatus.DRAFT, OfferStatus.PAUSED],
      [OfferStatus.DRAFT, OfferStatus.OUT_OF_STOCK],
      [OfferStatus.DRAFT, OfferStatus.REJECTED],
      [OfferStatus.PENDING_REVIEW, OfferStatus.DRAFT],
      [OfferStatus.PENDING_REVIEW, OfferStatus.PAUSED],
      [OfferStatus.PENDING_REVIEW, OfferStatus.OUT_OF_STOCK],
      [OfferStatus.PENDING_REVIEW, OfferStatus.ARCHIVED],
      [OfferStatus.ACTIVE, OfferStatus.DRAFT],
      [OfferStatus.ACTIVE, OfferStatus.PENDING_REVIEW],
      [OfferStatus.ACTIVE, OfferStatus.REJECTED],
      [OfferStatus.PAUSED, OfferStatus.DRAFT],
      [OfferStatus.PAUSED, OfferStatus.PENDING_REVIEW],
      [OfferStatus.PAUSED, OfferStatus.OUT_OF_STOCK],
      [OfferStatus.PAUSED, OfferStatus.REJECTED],
      [OfferStatus.OUT_OF_STOCK, OfferStatus.DRAFT],
      [OfferStatus.OUT_OF_STOCK, OfferStatus.PENDING_REVIEW],
      [OfferStatus.OUT_OF_STOCK, OfferStatus.PAUSED],
      [OfferStatus.OUT_OF_STOCK, OfferStatus.REJECTED],
      [OfferStatus.REJECTED, OfferStatus.PENDING_REVIEW],
      [OfferStatus.REJECTED, OfferStatus.ACTIVE],
      [OfferStatus.REJECTED, OfferStatus.PAUSED],
      [OfferStatus.REJECTED, OfferStatus.OUT_OF_STOCK],
      [OfferStatus.ARCHIVED, OfferStatus.DRAFT],
      [OfferStatus.ARCHIVED, OfferStatus.PENDING_REVIEW],
      [OfferStatus.ARCHIVED, OfferStatus.ACTIVE],
      [OfferStatus.ARCHIVED, OfferStatus.PAUSED],
      [OfferStatus.ARCHIVED, OfferStatus.OUT_OF_STOCK],
      [OfferStatus.ARCHIVED, OfferStatus.REJECTED],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionOffer(from, to)).toBe(false);
      expect(() => assertOfferTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});

