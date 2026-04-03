import { ProductStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import {
  canTransitionProduct,
  assertProductTransition,
} from './product-status.machine';

describe('Product Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [ProductStatus, ProductStatus][] = [
      [ProductStatus.DRAFT, ProductStatus.PENDING_REVIEW],
      [ProductStatus.PENDING_REVIEW, ProductStatus.APPROVED],
      [ProductStatus.PENDING_REVIEW, ProductStatus.REJECTED],
      [ProductStatus.APPROVED, ProductStatus.ARCHIVED],
      [ProductStatus.REJECTED, ProductStatus.DRAFT],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionProduct(from, to)).toBe(true);
      expect(() => assertProductTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [ProductStatus, ProductStatus][] = [
      [ProductStatus.DRAFT, ProductStatus.APPROVED],
      [ProductStatus.DRAFT, ProductStatus.REJECTED],
      [ProductStatus.DRAFT, ProductStatus.ARCHIVED],
      [ProductStatus.PENDING_REVIEW, ProductStatus.DRAFT],
      [ProductStatus.PENDING_REVIEW, ProductStatus.ARCHIVED],
      [ProductStatus.APPROVED, ProductStatus.DRAFT],
      [ProductStatus.APPROVED, ProductStatus.PENDING_REVIEW],
      [ProductStatus.APPROVED, ProductStatus.REJECTED],
      [ProductStatus.REJECTED, ProductStatus.APPROVED],
      [ProductStatus.REJECTED, ProductStatus.ARCHIVED],
      [ProductStatus.ARCHIVED, ProductStatus.DRAFT],
      [ProductStatus.ARCHIVED, ProductStatus.PENDING_REVIEW],
      [ProductStatus.ARCHIVED, ProductStatus.APPROVED],
      [ProductStatus.ARCHIVED, ProductStatus.REJECTED],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionProduct(from, to)).toBe(false);
      expect(() => assertProductTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
