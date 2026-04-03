import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '@common/events/domain-event.base';
import { ReviewEligibilityService } from '../services/review-eligibility.service';

@Injectable()
export class DeliveryEventListener {
  private readonly logger = new Logger(DeliveryEventListener.name);

  constructor(
    private readonly eligibilityService: ReviewEligibilityService,
  ) {}

  @OnEvent('logistics.shipment.delivered')
  async onShipmentDelivered(event: DomainEvent): Promise<void> {
    const { orderId } = event.payload as { orderId: string };
    const shipmentId = event.aggregateId;

    this.logger.log(
      `Shipment ${shipmentId} delivered for order ${orderId}, creating review eligibilities`,
    );

    await this.eligibilityService.createForDeliveredShipment(
      shipmentId,
      orderId,
    );
  }
}
