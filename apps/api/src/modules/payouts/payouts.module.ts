import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payout, PayoutSchema } from './schemas/payout.schema';
import { VendorLedger, VendorLedgerSchema } from './schemas/vendor-ledger.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { OrderItem, OrderItemSchema } from '../orders/schemas/order-item.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Vendor, VendorSchema } from '../identity/schemas/vendor.schema';
import { PayoutService } from './services/payout.service';
import { PayoutEventListener } from './listeners/payout-event.listener';
import { AdminPayoutController } from './controllers/admin-payout.controller';
import { VendorPayoutController } from './controllers/vendor-payout.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payout.name, schema: PayoutSchema },
      { name: VendorLedger.name, schema: VendorLedgerSchema },
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Vendor.name, schema: VendorSchema },
    ]),
  ],
  controllers: [AdminPayoutController, VendorPayoutController],
  providers: [PayoutService, PayoutEventListener],
  exports: [PayoutService],
})
export class PayoutsModule {}
