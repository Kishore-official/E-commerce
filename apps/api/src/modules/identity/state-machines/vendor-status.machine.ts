import { VendorStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

const VALID_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
  [VendorStatus.PENDING]: [VendorStatus.APPROVED, VendorStatus.REJECTED],
  [VendorStatus.APPROVED]: [VendorStatus.SUSPENDED],
  [VendorStatus.SUSPENDED]: [VendorStatus.APPROVED],
  [VendorStatus.REJECTED]: [],
};

export function canTransitionVendor(
  from: VendorStatus,
  to: VendorStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertVendorTransition(
  from: VendorStatus,
  to: VendorStatus,
): void {
  if (!canTransitionVendor(from, to)) {
    throw new InvalidStateTransitionException('Vendor', from, to);
  }
}

