export interface CreatePaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentResponse {
  gatewayPaymentId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  redirectUrl?: string;
  clientSecret?: string;
  metadata?: Record<string, unknown>;
}

export interface CapturePaymentRequest {
  gatewayPaymentId: string;
  amount?: number;
}

export interface CapturePaymentResponse {
  status: 'succeeded' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface RefundPaymentRequest {
  gatewayPaymentId: string;
  amount: number;
  reason?: string;
  idempotencyKey: string;
}

export interface RefundPaymentResponse {
  gatewayRefundId: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface WebhookPayload {
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

export interface ParsedWebhookEvent {
  eventType: 'payment.succeeded' | 'payment.failed' | 'refund.succeeded' | 'refund.failed';
  gatewayPaymentId?: string;
  gatewayRefundId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export const PAYMENT_GATEWAY_PORT = 'PAYMENT_GATEWAY_PORT';

export interface PaymentGatewayPort {
  createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse>;
  capturePayment(request: CapturePaymentRequest): Promise<CapturePaymentResponse>;
  refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResponse>;
  parseWebhook(payload: WebhookPayload): ParsedWebhookEvent;
  verifyWebhookSignature(payload: WebhookPayload): boolean;
}
