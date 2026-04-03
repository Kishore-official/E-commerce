import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentAttempt, PaymentAttemptSchema } from './schemas/payment-attempt.schema';
import { Refund, RefundSchema } from './schemas/refund.schema';
import { OrdersModule } from '../orders/orders.module';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { AdminRefundController } from './controllers/admin-refund.controller';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { PAYMENT_GATEWAY_PORT } from './ports/payment-gateway.port';
import { MockPaymentGateway } from './adapters/mock-payment.gateway';
import { RazorpayPaymentGateway } from './adapters/razorpay-payment.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentAttempt.name, schema: PaymentAttemptSchema },
      { name: Refund.name, schema: RefundSchema },
    ]),
    OrdersModule,
  ],
  controllers: [PaymentController, PaymentWebhookController, AdminRefundController, AdminPaymentController],
  providers: [
    PaymentService,
    {
      provide: PAYMENT_GATEWAY_PORT,
      useFactory: (configService: ConfigService) => {
        const gateway = configService.get<string>('PAYMENT_GATEWAY', 'mock');
        if (gateway === 'razorpay') {
          return new RazorpayPaymentGateway(configService);
        }
        return new MockPaymentGateway();
      },
      inject: [ConfigService],
    },
  ],
  exports: [MongooseModule, PaymentService],
})
export class PaymentsModule {}
