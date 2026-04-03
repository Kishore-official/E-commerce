import { VendorStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';
import {
  canTransitionVendor,
  assertVendorTransition,
} from './vendor-status.machine';

describe('Vendor Status Machine', () => {
  describe('valid transitions', () => {
    const validCases: [VendorStatus, VendorStatus][] = [
      [VendorStatus.PENDING, VendorStatus.APPROVED],
      [VendorStatus.PENDING, VendorStatus.REJECTED],
      [VendorStatus.APPROVED, VendorStatus.SUSPENDED],
      [VendorStatus.SUSPENDED, VendorStatus.APPROVED],
    ];

    it.each(validCases)('%s → %s should be allowed', (from, to) => {
      expect(canTransitionVendor(from, to)).toBe(true);
      expect(() => assertVendorTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions', () => {
    const invalidCases: [VendorStatus, VendorStatus][] = [
      [VendorStatus.PENDING, VendorStatus.SUSPENDED],
      [VendorStatus.APPROVED, VendorStatus.PENDING],
      [VendorStatus.APPROVED, VendorStatus.REJECTED],
      [VendorStatus.APPROVED, VendorStatus.APPROVED],
      [VendorStatus.SUSPENDED, VendorStatus.PENDING],
      [VendorStatus.SUSPENDED, VendorStatus.REJECTED],
      [VendorStatus.SUSPENDED, VendorStatus.SUSPENDED],
      [VendorStatus.REJECTED, VendorStatus.PENDING],
      [VendorStatus.REJECTED, VendorStatus.APPROVED],
      [VendorStatus.REJECTED, VendorStatus.SUSPENDED],
      [VendorStatus.REJECTED, VendorStatus.REJECTED],
    ];

    it.each(invalidCases)('%s → %s should be rejected', (from, to) => {
      expect(canTransitionVendor(from, to)).toBe(false);
      expect(() => assertVendorTransition(from, to)).toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});

