import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  PaymentGatewayPort,
  CreatePaymentRequest,
  CreatePaymentResponse,
  CapturePaymentRequest,
  CapturePaymentResponse,
  RefundPaymentRequest,
  RefundPaymentResponse,
  WebhookPayload,
  ParsedWebhookEvent,
} from '../ports/payment-gateway.port';

@Injectable()
export class RazorpayPaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(RazorpayPaymentGateway.name);
  private readonly razorpay: InstanceType<typeof Razorpay>;
  private readonly webhookSecret: string;
  private readonly keyId: string;

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.getOrThrow<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = this.configService.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET');

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: keySecret,
    });

    this.logger.log('Razorpay payment gateway initialized');
  }

  /**
   * Creates a Razorpay Order.
   * The frontend uses this order ID to open the Razorpay checkout modal.
   * Razorpay amount is in the smallest currency unit (paise for INR).
   */
  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    this.logger.log(
      `Creating Razorpay order for ${request.orderId}, amount ${request.amount} ${request.currency}`,
    );

    try {
      const razorpayOrder = await this.razorpay.orders.create({
        amount: request.amount,
        currency: request.currency,
        receipt: request.orderId,
        notes: {
          orderId: request.orderId,
          idempotencyKey: request.idempotencyKey,
          ...(request.paymentMethod ? { paymentMethod: request.paymentMethod } : {}),
        },
      });

      return {
        gatewayPaymentId: razorpayOrder.id,
        status: 'processing',
        clientSecret: this.keyId,
        metadata: {
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: this.keyId,
        },
      };
    } catch (error: any) {
      this.logger.error(`Razorpay order creation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Captures a Razorpay payment (for manual capture mode).
   * By default Razorpay auto-captures, so this is only needed if auto_capture is off.
   */
  async capturePayment(request: CapturePaymentRequest): Promise<CapturePaymentResponse> {
    this.logger.log(`Capturing Razorpay payment ${request.gatewayPaymentId}`);

    try {
      const payment = await this.razorpay.payments.capture(
        request.gatewayPaymentId,
        request.amount || 0,
        'INR',
      );

      return {
        status: payment.status === 'captured' ? 'succeeded' : 'failed',
        metadata: {
          razorpayPaymentId: payment.id,
          method: payment.method,
        },
      };
    } catch (error: any) {
      this.logger.error(`Razorpay capture failed: ${error.message}`, error.stack);
      return { status: 'failed', metadata: { error: error.message } };
    }
  }

  /**
   * Creates a Razorpay refund for a captured payment.
   */
  async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse> {
    this.logger.log(
      `Refunding Razorpay payment ${request.gatewayPaymentId}, amount ${request.amount}`,
    );

    try {
      // gatewayPaymentId here is the razorpay order ID stored from createPayment.
      // We need to fetch the payment associated with the order to refund it.
      const payments = await this.razorpay.orders.fetchPayments(request.gatewayPaymentId);
      const capturedPayment = (payments as any).items?.find(
        (p: any) => p.status === 'captured',
      );

      if (!capturedPayment) {
        this.logger.error(`No captured payment found for order ${request.gatewayPaymentId}`);
        return {
          gatewayRefundId: '',
          status: 'failed',
          metadata: { error: 'No captured payment found' },
        };
      }

      const refund = await this.razorpay.payments.refund(capturedPayment.id, {
        amount: request.amount,
        notes: {
          reason: request.reason || 'Customer refund',
          idempotencyKey: request.idempotencyKey,
        },
      });

      return {
        gatewayRefundId: refund.id,
        status: refund.status === 'processed' ? 'succeeded' : 'processing',
        metadata: {
          razorpayRefundId: refund.id,
          razorpayPaymentId: capturedPayment.id,
        },
      };
    } catch (error: any) {
      this.logger.error(`Razorpay refund failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Parses a Razorpay webhook event body into our normalized format.
   *
   * Razorpay webhook payload structure:
   * {
   *   "event": "payment.captured" | "payment.failed" | "refund.processed" | ...,
   *   "payload": {
   *     "payment": { "entity": { ... } },
   *     "refund": { "entity": { ... } }
   *   }
   * }
   */
  parseWebhook(payload: WebhookPayload): ParsedWebhookEvent {
    const body = payload.body;
    const event = body['event'] as string;
    const payloadData = body['payload'] as Record<string, any> | undefined;

    // Map Razorpay events to our internal event types
    const eventMap: Record<string, ParsedWebhookEvent['eventType']> = {
      'payment.captured': 'payment.succeeded',
      'payment.authorized': 'payment.succeeded',
      'payment.failed': 'payment.failed',
      'refund.processed': 'refund.succeeded',
      'refund.failed': 'refund.failed',
    };

    const eventType = eventMap[event];
    if (!eventType) {
      this.logger.warn(`Unhandled Razorpay webhook event: ${event}`);
      return {
        eventType: 'payment.failed',
        metadata: { originalEvent: event, unhandled: true },
      };
    }

    const paymentEntity = payloadData?.payment?.entity;
    const refundEntity = payloadData?.refund?.entity;

    return {
      eventType,
      // Razorpay payment entity has `order_id` which maps to our gatewayPaymentId
      gatewayPaymentId: paymentEntity?.order_id || undefined,
      gatewayRefundId: refundEntity?.id || undefined,
      amount: paymentEntity?.amount || refundEntity?.amount || undefined,
      currency: paymentEntity?.currency || refundEntity?.currency || undefined,
      metadata: {
        razorpayPaymentId: paymentEntity?.id,
        razorpayOrderId: paymentEntity?.order_id,
        method: paymentEntity?.method,
        ...(refundEntity ? { razorpayRefundId: refundEntity.id } : {}),
      },
    };
  }

  /**
   * Verifies Razorpay webhook signature using HMAC SHA256.
   * Razorpay sends the signature in the `x-razorpay-signature` header.
   */
  verifyWebhookSignature(payload: WebhookPayload): boolean {
    const signature = payload.headers['x-razorpay-signature'];
    if (!signature) {
      this.logger.warn('Missing x-razorpay-signature header');
      return false;
    }

    try {
      const body = typeof payload.body === 'string'
        ? payload.body
        : JSON.stringify(payload.body);

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error: any) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      return false;
    }
  }
}
