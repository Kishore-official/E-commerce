import { ProductStatus } from '@ecommerce/shared-types';
import { InvalidStateTransitionException } from '@common/exceptions/invalid-state-transition.exception';

const VALID_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  [ProductStatus.DRAFT]: [ProductStatus.PENDING_REVIEW],
  [ProductStatus.PENDING_REVIEW]: [ProductStatus.APPROVED, ProductStatus.REJECTED],
  [ProductStatus.APPROVED]: [ProductStatus.ARCHIVED],
  [ProductStatus.REJECTED]: [ProductStatus.DRAFT],
  [ProductStatus.ARCHIVED]: [],
};

export function canTransitionProduct(
  from: ProductStatus,
  to: ProductStatus,
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertProductTransition(
  from: ProductStatus,
  to: ProductStatus,
): void {
  if (!canTransitionProduct(from, to)) {
    throw new InvalidStateTransitionException('Product', from, to);
  }
}
