import { DomainEvent } from '@common/events/domain-event.base';

export class ReviewEligibilityCreatedEvent extends DomainEvent {
  constructor(eligibilityId: string, payload: {
    orderId: string;
    orderItemId: string;
    userId: string;
    productId: string;
  }) {
    super('reviews.eligibility.created', eligibilityId, payload);
  }
}

export class ReviewSubmittedEvent extends DomainEvent {
  constructor(reviewId: string, payload: {
    userId: string;
    productId: string;
    rating: number;
  }) {
    super('reviews.review.submitted', reviewId, payload);
  }
}

export class ReviewApprovedEvent extends DomainEvent {
  constructor(reviewId: string, payload: {
    productId: string;
    moderatedBy: string;
  }) {
    super('reviews.review.approved', reviewId, payload);
  }
}

export class ReviewRejectedEvent extends DomainEvent {
  constructor(reviewId: string, payload: {
    productId: string;
    moderatedBy: string;
    rejectionReason: string;
  }) {
    super('reviews.review.rejected', reviewId, payload);
  }
}
