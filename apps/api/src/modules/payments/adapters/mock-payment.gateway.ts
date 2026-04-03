import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
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
export class MockPaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(MockPaymentGateway.name);

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    this.logger.log(`[Mock] Creating payment for order ${request.orderId}, amount ${request.amount} ${request.currency}`);
    return {
      gatewayPaymentId: `mock_pay_${uuidv4()}`,
      status: 'processing',
      metadata: { mock: true },
    };
  }

  async capturePayment(request: CapturePaymentRequest): Promise<CapturePaymentResponse> {
    this.logger.log(`[Mock] Capturing payment ${request.gatewayPaymentId}`);
    return { status: 'succeeded', metadata: { mock: true } };
  }

  async refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse> {
    this.logger.log(`[Mock] Refunding payment ${request.gatewayPaymentId}, amount ${request.amount}`);
    return {
      gatewayRefundId: `mock_ref_${uuidv4()}`,
      status: 'succeeded',
      metadata: { mock: true },
    };
  }

  parseWebhook(payload: WebhookPayload): ParsedWebhookEvent {
    const body = payload.body;
    return {
      eventType: body['eventType'] as ParsedWebhookEvent['eventType'],
      gatewayPaymentId: body['gatewayPaymentId'] as string | undefined,
      gatewayRefundId: body['gatewayRefundId'] as string | undefined,
      amount: body['amount'] as number | undefined,
      currency: body['currency'] as string | undefined,
      metadata: body['metadata'] as Record<string, unknown> | undefined,
    };
  }

  verifyWebhookSignature(_payload: WebhookPayload): boolean {
    return true;
  }
}
