import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { OrderItem, OrderItemSchema } from '../orders/schemas/order-item.schema';
import { User, UserSchema } from '../identity/schemas/user.schema';
import { Vendor, VendorSchema } from '../identity/schemas/vendor.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { InvoiceService } from './services/invoice.service';
import { CustomerInvoiceController } from './controllers/customer-invoice.controller';
import { AdminInvoiceController } from './controllers/admin-invoice.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: User.name, schema: UserSchema },
      { name: Vendor.name, schema: VendorSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [CustomerInvoiceController, AdminInvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoicesModule {}
