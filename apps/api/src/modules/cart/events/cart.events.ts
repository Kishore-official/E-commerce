import { DomainEvent } from '@common/events/domain-event.base';

export class CartConvertedEvent extends DomainEvent {
  constructor(cartId: string, userId: string, orderId: string) {
    super('cart.cart.converted', cartId, { userId, orderId });
  }
}

export class CartMergedEvent extends DomainEvent {
  constructor(guestCartId: string, userCartId: string, userId: string) {
    super('cart.cart.merged', guestCartId, { userCartId, userId });
  }
}
