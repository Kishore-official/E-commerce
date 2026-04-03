import { DomainEvent } from '@common/events/domain-event.base';

export class ShipmentCreatedEvent extends DomainEvent {
  constructor(shipmentId: string, payload: {
    orderId: string;
    vendorId: string;
    orderItemIds: string[];
  }) {
    super('logistics.shipment.created', shipmentId, payload);
  }
}

export class ShipmentShippedEvent extends DomainEvent {
  constructor(shipmentId: string, payload: {
    orderId: string;
    trackingNumber: string;
    carrier: string;
  }) {
    super('logistics.shipment.shipped', shipmentId, payload);
  }
}

export class ShipmentDeliveredEvent extends DomainEvent {
  constructor(shipmentId: string, payload: { orderId: string }) {
    super('logistics.shipment.delivered', shipmentId, payload);
  }
}

export class ShipmentStatusChangedEvent extends DomainEvent {
  constructor(shipmentId: string, payload: {
    orderId: string;
    fromStatus: string;
    toStatus: string;
  }) {
    super('logistics.shipment.status_changed', shipmentId, payload);
  }
}
