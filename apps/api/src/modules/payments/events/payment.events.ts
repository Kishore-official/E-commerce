import { DomainEvent } from '@common/events/domain-event.base';

export class PaymentInitiatedEvent extends DomainEvent {
  constructor(paymentId: string, payload: {
    orderId: string;
    amount: number;
    currency: string;
    gateway: string;
  }) {
    super('payments.payment.initiated', paymentId, payload);
  }
}

export class PaymentSucceededEvent extends DomainEvent {
  constructor(paymentId: string, payload: {
    orderId: string;
    amount: number;
    currency: string;
    gatewayPaymentId: string;
  }) {
    super('payments.payment.succeeded', paymentId, payload);
  }
}

export class PaymentFailedEvent extends DomainEvent {
  constructor(paymentId: string, payload: {
    orderId: string;
    errorMessage?: string;
  }) {
    super('payments.payment.failed', paymentId, payload);
  }
}

export class RefundSucceededEvent extends DomainEvent {
  constructor(refundId: string, payload: {
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
  }) {
    super('payments.refund.succeeded', refundId, payload);
  }
}
