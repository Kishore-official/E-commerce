import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '@common/events/domain-event.base';
import { OrderService } from '../services/order.service';

@Injectable()
export class PaymentEventListener {
  private readonly logger = new Logger(PaymentEventListener.name);

  constructor(private readonly orderService: OrderService) {}

  @OnEvent('payments.payment.succeeded')
  async onPaymentSucceeded(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload as { orderId: string };
    this.logger.log(`Payment succeeded for order ${orderId}, confirming order`);
    await this.orderService.confirmOrder(orderId, event.aggregateId);
  }
}
