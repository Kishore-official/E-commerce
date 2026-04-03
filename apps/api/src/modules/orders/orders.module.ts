import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrderItem, OrderItemSchema } from './schemas/order-item.schema';
import { OrderStatusHistory, OrderStatusHistorySchema } from './schemas/order-status-history.schema';
import { CartModule } from '../cart/cart.module';
import { OffersModule } from '../offers/offers.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CouponsModule } from '../coupons/coupons.module';
import { OrderService } from './services/order.service';
import { CustomerOrderController } from './controllers/customer-order.controller';
import { VendorOrderController } from './controllers/vendor-order.controller';
import { AdminOrderController } from './controllers/admin-order.controller';
import { PaymentEventListener } from './listeners/payment-event.listener';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: OrderStatusHistory.name, schema: OrderStatusHistorySchema },
    ]),
    CartModule,
    OffersModule,
    CatalogModule,
    CouponsModule,
  ],
  controllers: [CustomerOrderController, VendorOrderController, AdminOrderController],
  providers: [OrderService, PaymentEventListener],
  exports: [MongooseModule, OrderService],
})
export class OrdersModule {}
