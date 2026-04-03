import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  PaymentStatus,
  RefundStatus,
  OrderStatus,
  PaginatedResult,
} from '@ecommerce/shared-types';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { PaginationDto } from '@common/dto/pagination.dto';
import { EventBusService } from '@common/events/event-bus.service';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { PaymentAttempt, PaymentAttemptDocument } from '../schemas/payment-attempt.schema';
import { Refund, RefundDocument } from '../schemas/refund.schema';
import { Order, OrderDocument } from '@modules/orders/schemas/order.schema';
import { InitiatePaymentDto, InitiateRefundDto } from '../dto';
import {
  PAYMENT_GATEWAY_PORT,
  PaymentGatewayPort,
} from '../ports/payment-gateway.port';
import { assertPaymentTransition } from '../state-machines/payment-status.machine';
import { assertRefundTransition } from '../state-machines/refund-status.machine';
import {
  PaymentInitiatedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  RefundSucceededEvent,
} from '../events/payment.events';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly gatewayName: string;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(PaymentAttempt.name)
    private readonly attemptModel: Model<PaymentAttemptDocument>,
    @InjectModel(Refund.name)
    private readonly refundModel: Model<RefundDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @Inject(PAYMENT_GATEWAY_PORT)
    private readonly gateway: PaymentGatewayPort,
    private readonly eventBus: EventBusService,
    private readonly configService: ConfigService,
  ) {
    this.gatewayName = this.configService.get<string>('PAYMENT_GATEWAY', 'mock');
  }

  async initiatePayment(
    userId: string,
    dto: InitiatePaymentDto,
    idempotencyKey: string,
  ): Promise<Payment> {
    // Idempotency check
    const existing = await this.paymentModel.findOne({ idempotencyKey }).exec();
    if (existing) {
      const attempts = await this.attemptModel.find({ paymentId: existing.id }).exec();
      (existing as any).attempts = attempts;
      return existing;
    }

    // Validate order
    const order = await this.orderModel.findOne({ id: dto.orderId }).exec();
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to you');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Order is not awaiting payment (status: ${order.status})`,
      );
    }

    // Create payment record
    const payment = await this.paymentModel.create({
      id: uuidv4(),
      orderId: order.id,
      amount: order.grandTotal,
      currency: order.currency,
      status: PaymentStatus.PENDING,
      gateway: this.gatewayName,
      paymentMethod: dto.paymentMethod || undefined,
      idempotencyKey,
    });

    // Call gateway
    const gatewayResponse = await this.gateway.createPayment({
      orderId: order.id,
      amount: order.grandTotal,
      currency: order.currency,
      idempotencyKey,
      paymentMethod: dto.paymentMethod,
    });

    // Update with gateway info
    assertPaymentTransition(payment.status, PaymentStatus.PROCESSING);
    const updated = await this.paymentModel.findOneAndUpdate(
      { id: payment.id },
      {
        $set: {
          gatewayPaymentId: gatewayResponse.gatewayPaymentId,
          status: PaymentStatus.PROCESSING,
          metadata: gatewayResponse.metadata || undefined,
        },
      },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException('Payment not found after update');

    // Record attempt
    await this.recordAttempt(
      updated,
      gatewayResponse as unknown as Record<string, unknown>,
      'processing',
    );

    this.eventBus.emit(
      new PaymentInitiatedEvent(updated.id, {
        orderId: order.id,
        amount: order.grandTotal,
        currency: order.currency,
        gateway: this.gatewayName,
      }),
    );

    return updated;
  }

  async getPaymentById(paymentId: string): Promise<Payment> {
    const payment = await this.paymentModel.findOne({ id: paymentId }).exec();
    if (!payment) throw new NotFoundException('Payment not found');
    const attempts = await this.attemptModel.find({ paymentId }).exec();
    (payment as any).attempts = attempts;
    return payment;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment> {
    const payment = await this.paymentModel.findOne({ orderId }).exec();
    if (!payment) throw new NotFoundException('Payment not found for this order');
    const attempts = await this.attemptModel.find({ paymentId: payment.id }).exec();
    (payment as any).attempts = attempts;
    return payment;
  }

  async findAll(query: PaginationDto): Promise<PaginatedResult<Payment>> {
    const [data, total] = await Promise.all([
      this.paymentModel
        .find()
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.paymentModel.countDocuments().exec(),
    ]);
    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async processWebhook(
    gateway: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
  ): Promise<void> {
    // Verify signature
    if (!this.gateway.verifyWebhookSignature({ headers, body })) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Parse event
    const event = this.gateway.parseWebhook({ headers, body });

    if (event.eventType === 'payment.succeeded' || event.eventType === 'payment.failed') {
      await this.handlePaymentWebhook(event);
    } else if (event.eventType === 'refund.succeeded' || event.eventType === 'refund.failed') {
      await this.handleRefundWebhook(event);
    }
  }

  async initiateRefund(
    dto: InitiateRefundDto,
    idempotencyKey: string,
    adminUserId: string,
  ): Promise<Refund> {
    // Idempotency check
    const existing = await this.refundModel.findOne({ idempotencyKey }).exec();
    if (existing) return existing;

    // Find the payment
    const payment = await this.paymentModel.findOne({ orderId: dto.orderId }).exec();
    if (!payment) throw new NotFoundException('Payment not found for this order');
    if (
      payment.status !== PaymentStatus.SUCCEEDED &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot refund payment in status: ${payment.status}`,
      );
    }
    // Sum existing refunds to prevent exceeding total payment
    const existingRefunds = await this.refundModel.find({
      paymentId: payment.id,
      status: { $in: [RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.SUCCEEDED] },
    }).exec();
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    if (totalRefunded + dto.amount > payment.amount) {
      throw new BadRequestException(
        `Refund amount exceeds remaining refundable amount. Already refunded: ${totalRefunded}, payment: ${payment.amount}`,
      );
    }

    // Create refund record
    const refund = await this.refundModel.create({
      id: uuidv4(),
      paymentId: payment.id,
      orderId: dto.orderId,
      amount: dto.amount,
      currency: payment.currency,
      status: RefundStatus.PENDING,
      reason: dto.reason || undefined,
      idempotencyKey,
    });

    // Call gateway
    const gatewayResponse = await this.gateway.refundPayment({
      gatewayPaymentId: payment.gatewayPaymentId!,
      amount: dto.amount,
      reason: dto.reason,
      idempotencyKey,
    });

    // Update refund
    const updateData: Record<string, unknown> = {
      gatewayRefundId: gatewayResponse.gatewayRefundId,
    };
    if (gatewayResponse.status === 'succeeded') {
      assertRefundTransition(refund.status, RefundStatus.PROCESSING);
      updateData.status = RefundStatus.PROCESSING;
    }
    
    const updated = await this.refundModel.findOneAndUpdate(
      { id: refund.id },
      { $set: updateData },
      { new: true }
    ).exec();
    if (!updated) throw new NotFoundException('Refund not found after update');

    return updated;
  }

  private async handlePaymentWebhook(
    event: { eventType: string; gatewayPaymentId?: string },
  ): Promise<void> {
    if (!event.gatewayPaymentId) {
      this.logger.warn('Webhook missing gatewayPaymentId');
      return;
    }

    const payment = await this.paymentModel.findOne({
      gatewayPaymentId: event.gatewayPaymentId,
    }).exec();
    if (!payment) {
      this.logger.warn(`Payment not found for gatewayPaymentId: ${event.gatewayPaymentId}`);
      return;
    }

    // Idempotent: skip if already in terminal state
    if (
      payment.status === PaymentStatus.SUCCEEDED ||
      payment.status === PaymentStatus.CANCELLED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      this.logger.log(`Payment ${payment.id} already in terminal state ${payment.status}, skipping webhook`);
      return;
    }

    if (event.eventType === 'payment.succeeded') {
      assertPaymentTransition(payment.status, PaymentStatus.SUCCEEDED);
      await this.paymentModel.findOneAndUpdate(
        { id: payment.id },
        { $set: { status: PaymentStatus.SUCCEEDED, paidAt: new Date() } },
        { new: true }
      ).exec();

      const updated = await this.paymentModel.findOne({ id: payment.id }).exec();
      if (updated) {
        await this.recordAttempt(updated, event as unknown as Record<string, unknown>, 'succeeded');

        this.eventBus.emit(
          new PaymentSucceededEvent(updated.id, {
            orderId: updated.orderId,
            amount: updated.amount,
            currency: updated.currency,
            gatewayPaymentId: updated.gatewayPaymentId!,
          }),
        );
      }
    } else if (event.eventType === 'payment.failed') {
      assertPaymentTransition(payment.status, PaymentStatus.FAILED);
      await this.paymentModel.findOneAndUpdate(
        { id: payment.id },
        { $set: { status: PaymentStatus.FAILED } },
        { new: true }
      ).exec();

      const updated = await this.paymentModel.findOne({ id: payment.id }).exec();
      if (updated) {
        await this.recordAttempt(
          updated,
          event as unknown as Record<string, unknown>,
          'failed',
          'Payment failed',
        );

        this.eventBus.emit(
          new PaymentFailedEvent(updated.id, {
            orderId: updated.orderId,
            errorMessage: 'Payment failed',
          }),
        );
      }
    }
  }

  private async handleRefundWebhook(
    event: { eventType: string; gatewayRefundId?: string },
  ): Promise<void> {
    if (!event.gatewayRefundId) {
      this.logger.warn('Refund webhook missing gatewayRefundId');
      return;
    }

    const refund = await this.refundModel.findOne({
      gatewayRefundId: event.gatewayRefundId,
    }).exec();
    if (!refund) {
      this.logger.warn(`Refund not found for gatewayRefundId: ${event.gatewayRefundId}`);
      return;
    }

    if (refund.status === RefundStatus.SUCCEEDED) return;

    if (event.eventType === 'refund.succeeded') {
      assertRefundTransition(refund.status, RefundStatus.SUCCEEDED);
      await this.refundModel.findOneAndUpdate(
        { id: refund.id },
        { $set: { status: RefundStatus.SUCCEEDED, processedAt: new Date() } },
        { new: true }
      ).exec();

      // Update payment status
      const payment = await this.paymentModel.findOne({ id: refund.paymentId }).exec();
      if (payment && refund.amount >= payment.amount) {
        await this.paymentModel.findOneAndUpdate(
          { id: payment.id },
          { $set: { status: PaymentStatus.REFUNDED } },
          { new: true }
        ).exec();
      } else if (payment) {
        await this.paymentModel.findOneAndUpdate(
          { id: payment.id },
          { $set: { status: PaymentStatus.PARTIALLY_REFUNDED } },
          { new: true }
        ).exec();
      }

      this.eventBus.emit(
        new RefundSucceededEvent(refund.id, {
          paymentId: refund.paymentId,
          orderId: refund.orderId,
          amount: refund.amount,
          currency: refund.currency,
        }),
      );
    } else if (event.eventType === 'refund.failed') {
      assertRefundTransition(refund.status, RefundStatus.FAILED);
      await this.refundModel.findOneAndUpdate(
        { id: refund.id },
        { $set: { status: RefundStatus.FAILED } },
        { new: true }
      ).exec();
    }
  }

  private async recordAttempt(
    payment: Payment,
    gatewayResponse: Record<string, unknown>,
    status: string,
    errorMessage?: string,
  ): Promise<PaymentAttempt> {
    const attempt = await this.attemptModel.create({
      id: uuidv4(),
      paymentId: payment.id,
      gatewayResponse,
      status,
      errorMessage: errorMessage || undefined,
    });
    return attempt;
  }
}
