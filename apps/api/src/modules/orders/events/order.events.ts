import { DomainEvent } from '@common/events/domain-event.base';

export class OrderCreatedEvent extends DomainEvent {
  constructor(orderId: string, payload: {
    userId: string;
    orderNumber: string;
    grandTotal: number;
    currency: string;
    countryCode: string;
    itemCount: number;
  }) {
    super('orders.order.created', orderId, payload);
  }
}

export class OrderConfirmedEvent extends DomainEvent {
  constructor(orderId: string, userId: string) {
    super('orders.order.confirmed', orderId, { userId });
  }
}

export class OrderCancelledEvent extends DomainEvent {
  constructor(orderId: string, payload: { userId: string; reason?: string }) {
    super('orders.order.cancelled', orderId, payload);
  }
}

export class OrderItemConfirmedEvent extends DomainEvent {
  constructor(orderItemId: string, payload: { orderId: string; vendorId: string }) {
    super('orders.order_item.confirmed', orderItemId, payload);
  }
}

export class OrderStatusChangedEvent extends DomainEvent {
  constructor(orderId: string, payload: {
    fromStatus: string;
    toStatus: string;
    changedBy?: string;
    reason?: string;
  }) {
    super('orders.order.status_changed', orderId, payload);
  }
}

export class OrderCompletedEvent extends DomainEvent {
  constructor(orderId: string, userId: string) {
    super('orders.order.completed', orderId, { userId });
  }
}
