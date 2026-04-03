import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '@common/events/domain-event.base';
import { PayoutService } from '../services/payout.service';

@Injectable()
export class PayoutEventListener {
  private readonly logger = new Logger(PayoutEventListener.name);

  constructor(private readonly payoutService: PayoutService) {}

  @OnEvent('payments.payment.succeeded')
  async onPaymentSucceeded(event: DomainEvent): Promise<void> {
    try {
      const { orderId } = event.payload as { orderId: string };
      await this.payoutService.recordOrderEarnings(orderId);
    } catch (error: any) {
      this.logger.error(`Failed to record vendor earnings: ${error.message}`, error.stack);
    }
  }
}
