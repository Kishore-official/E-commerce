import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvent } from '@common/events/domain-event.base';
import { ShipmentService } from '../services/shipment.service';

@Injectable()
export class OrderEventListener {
  private readonly logger = new Logger(OrderEventListener.name);

  constructor(private readonly shipmentService: ShipmentService) {}

  @OnEvent('orders.order.cancelled')
  async onOrderCancelled(event: DomainEvent): Promise<void> {
    this.logger.log(`Order ${event.aggregateId} cancelled, cancelling pending shipments`);
    await this.shipmentService.cancelPendingShipments(event.aggregateId);
  }
}
