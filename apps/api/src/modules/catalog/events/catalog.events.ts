import { DomainEvent } from '@common/events/domain-event.base';

export class ProductSubmittedForReviewEvent extends DomainEvent {
  constructor(productId: string, vendorId: string) {
    super('catalog.product.submitted_for_review', productId, { vendorId });
  }
}

export class ProductApprovedEvent extends DomainEvent {
  constructor(productId: string, approvedBy: string) {
    super('catalog.product.approved', productId, { approvedBy });
  }
}

export class ProductRejectedEvent extends DomainEvent {
  constructor(productId: string, rejectedBy: string, reason?: string) {
    super('catalog.product.rejected', productId, { rejectedBy, reason });
  }
}

export class ProductArchivedEvent extends DomainEvent {
  constructor(productId: string, vendorId: string) {
    super('catalog.product.archived', productId, { vendorId });
  }
}
