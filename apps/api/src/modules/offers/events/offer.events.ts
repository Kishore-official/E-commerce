import { DomainEvent } from '@common/events/domain-event.base';

export class OfferActivatedEvent extends DomainEvent {
  constructor(offerId: string, vendorId: string) {
    super('offers.offer.activated', offerId, { vendorId });
  }
}

export class OfferStockDepletedEvent extends DomainEvent {
  constructor(offerId: string, vendorId: string) {
    super('offers.offer.stock_depleted', offerId, { vendorId });
  }
}

export class OfferPausedEvent extends DomainEvent {
  constructor(offerId: string, vendorId: string) {
    super('offers.offer.paused', offerId, { vendorId });
  }
}

export class OfferArchivedEvent extends DomainEvent {
  constructor(offerId: string, vendorId: string) {
    super('offers.offer.archived', offerId, { vendorId });
  }
}

export class OfferSubmittedForReviewEvent extends DomainEvent {
  constructor(offerId: string, vendorId: string) {
    super('offers.offer.submitted_for_review', offerId, { vendorId });
  }
}

export class OfferApprovedEvent extends DomainEvent {
  constructor(offerId: string, vendorId: string, adminUserId: string) {
    super('offers.offer.approved', offerId, { vendorId, adminUserId });
  }
}

export class OfferRejectedEvent extends DomainEvent {
  constructor(offerId: string, vendorId: string, adminUserId: string, reason?: string) {
    super('offers.offer.rejected', offerId, { vendorId, adminUserId, reason });
  }
}
