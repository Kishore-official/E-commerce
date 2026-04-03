import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Shipment, ShipmentSchema } from './schemas/shipment.schema';
import { ShipmentItem, ShipmentItemSchema } from './schemas/shipment-item.schema';
import { ShipmentTrackingEvent, ShipmentTrackingEventSchema } from './schemas/shipment-tracking-event.schema';
import { OrdersModule } from '../orders/orders.module';
import { ShipmentService } from './services/shipment.service';
import { OrderEventListener } from './listeners/order-event.listener';
import { VendorShipmentController } from './controllers/vendor-shipment.controller';
import { TrackingController } from './controllers/tracking.controller';
import { CarrierWebhookController } from './controllers/carrier-webhook.controller';
import { AdminShipmentController } from './controllers/admin-shipment.controller';
import { CARRIER_PROVIDER_PORT } from './ports/carrier-provider.port';
import { MockCarrierProvider } from './adapters/mock-carrier.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shipment.name, schema: ShipmentSchema },
      { name: ShipmentItem.name, schema: ShipmentItemSchema },
      { name: ShipmentTrackingEvent.name, schema: ShipmentTrackingEventSchema },
    ]),
    OrdersModule,
  ],
  controllers: [
    VendorShipmentController,
    TrackingController,
    CarrierWebhookController,
    AdminShipmentController,
  ],
  providers: [
    ShipmentService,
    OrderEventListener,
    { provide: CARRIER_PROVIDER_PORT, useClass: MockCarrierProvider },
  ],
  exports: [MongooseModule, ShipmentService],
})
export class LogisticsModule {}
