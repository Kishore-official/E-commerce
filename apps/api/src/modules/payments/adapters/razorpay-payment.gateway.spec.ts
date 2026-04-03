import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RazorpayPaymentGateway } from './razorpay-payment.gateway';
import { WebhookPayload } from '../ports/payment-gateway.port';

// Mock the Razorpay SDK
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn(),
      fetchPayments: jest.fn(),
    },
    payments: {
      capture: jest.fn(),
      refund: jest.fn(),
    },
  }));
});

describe('RazorpayPaymentGateway', () => {
  let gateway: RazorpayPaymentGateway;
  let mockConfigService: Partial<ConfigService>;
  const WEBHOOK_SECRET = 'test_webhook_secret_123';
  const KEY_ID = 'rzp_test_12345';
  const KEY_SECRET = 'test_secret_key';

  beforeEach(() => {
    const configMap: Record<string, string> = {
      RAZORPAY_KEY_ID: KEY_ID,
      RAZORPAY_KEY_SECRET: KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    };
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        return configMap[key] || defaultValue;
      }),
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (!configMap[key]) throw new Error(`Missing config: ${key}`);
        return configMap[key];
      }),
    } as any;

    gateway = new RazorpayPaymentGateway(mockConfigService as ConfigService);
  });

  describe('createPayment', () => {
    it('should create a Razorpay order and return response', async () => {
      const mockOrder = { id: 'order_abc123', amount: 10000, currency: 'INR' };
      (gateway as any).razorpay.orders.create.mockResolvedValue(mockOrder);

      const result = await gateway.createPayment({
        orderId: 'test-order-id',
        amount: 10000,
        currency: 'INR',
        idempotencyKey: 'idem-key-1',
        paymentMethod: 'upi',
      });

      expect(result.gatewayPaymentId).toBe('order_abc123');
      expect(result.status).toBe('processing');
      expect(result.clientSecret).toBe(KEY_ID);
      expect(result.metadata).toEqual({
        razorpayOrderId: 'order_abc123',
        razorpayKeyId: KEY_ID,
      });
    });

    it('should throw when Razorpay API fails', async () => {
      (gateway as any).razorpay.orders.create.mockRejectedValue(
        new Error('Razorpay API error'),
      );

      await expect(
        gateway.createPayment({
          orderId: 'test-order-id',
          amount: 10000,
          currency: 'INR',
          idempotencyKey: 'idem-key-2',
        }),
      ).rejects.toThrow('Razorpay API error');
    });
  });

  describe('capturePayment', () => {
    it('should capture a payment and return succeeded', async () => {
      (gateway as any).razorpay.payments.capture.mockResolvedValue({
        id: 'pay_abc123',
        status: 'captured',
        method: 'card',
      });

      const result = await gateway.capturePayment({
        gatewayPaymentId: 'pay_abc123',
        amount: 10000,
      });

      expect(result.status).toBe('succeeded');
    });

    it('should return failed when capture fails', async () => {
      (gateway as any).razorpay.payments.capture.mockRejectedValue(
        new Error('Capture failed'),
      );

      const result = await gateway.capturePayment({
        gatewayPaymentId: 'pay_abc123',
        amount: 10000,
      });

      expect(result.status).toBe('failed');
    });
  });

  describe('refundPayment', () => {
    it('should find captured payment and create refund', async () => {
      (gateway as any).razorpay.orders.fetchPayments.mockResolvedValue({
        items: [{ id: 'pay_captured_1', status: 'captured' }],
      });
      (gateway as any).razorpay.payments.refund.mockResolvedValue({
        id: 'rfnd_abc123',
        status: 'processed',
      });

      const result = await gateway.refundPayment({
        gatewayPaymentId: 'order_abc123',
        amount: 5000,
        reason: 'Customer request',
        idempotencyKey: 'refund-idem-1',
      });

      expect(result.gatewayRefundId).toBe('rfnd_abc123');
      expect(result.status).toBe('succeeded');
    });

    it('should return failed when no captured payment found', async () => {
      (gateway as any).razorpay.orders.fetchPayments.mockResolvedValue({
        items: [{ id: 'pay_1', status: 'failed' }],
      });

      const result = await gateway.refundPayment({
        gatewayPaymentId: 'order_abc123',
        amount: 5000,
        idempotencyKey: 'refund-idem-2',
      });

      expect(result.status).toBe('failed');
    });
  });

  describe('parseWebhook', () => {
    it('should parse payment.captured event', () => {
      const payload: WebhookPayload = {
        headers: {},
        body: {
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: 'pay_123',
                order_id: 'order_abc',
                amount: 10000,
                currency: 'INR',
                method: 'upi',
              },
            },
          },
        },
      };

      const result = gateway.parseWebhook(payload);

      expect(result.eventType).toBe('payment.succeeded');
      expect(result.gatewayPaymentId).toBe('order_abc');
      expect(result.amount).toBe(10000);
      expect(result.currency).toBe('INR');
    });

    it('should parse payment.failed event', () => {
      const payload: WebhookPayload = {
        headers: {},
        body: {
          event: 'payment.failed',
          payload: {
            payment: {
              entity: {
                id: 'pay_456',
                order_id: 'order_def',
                amount: 20000,
                currency: 'INR',
              },
            },
          },
        },
      };

      const result = gateway.parseWebhook(payload);
      expect(result.eventType).toBe('payment.failed');
      expect(result.gatewayPaymentId).toBe('order_def');
    });

    it('should parse refund.processed event', () => {
      const payload: WebhookPayload = {
        headers: {},
        body: {
          event: 'refund.processed',
          payload: {
            payment: { entity: { id: 'pay_789', order_id: 'order_ghi' } },
            refund: { entity: { id: 'rfnd_abc', amount: 5000, currency: 'INR' } },
          },
        },
      };

      const result = gateway.parseWebhook(payload);
      expect(result.eventType).toBe('refund.succeeded');
      expect(result.gatewayRefundId).toBe('rfnd_abc');
    });

    it('should handle unknown event type gracefully', () => {
      const payload: WebhookPayload = {
        headers: {},
        body: { event: 'some.unknown.event', payload: {} },
      };

      const result = gateway.parseWebhook(payload);
      expect(result.eventType).toBe('payment.failed');
      expect(result.metadata?.unhandled).toBe(true);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify a valid signature', () => {
      const body = JSON.stringify({ event: 'payment.captured', payload: {} });
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      const payload: WebhookPayload = {
        headers: { 'x-razorpay-signature': signature },
        body: JSON.parse(body),
      };

      expect(gateway.verifyWebhookSignature(payload)).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const payload: WebhookPayload = {
        headers: { 'x-razorpay-signature': 'invalid_signature_here' },
        body: { event: 'payment.captured' },
      };

      expect(gateway.verifyWebhookSignature(payload)).toBe(false);
    });

    it('should reject when signature header is missing', () => {
      const payload: WebhookPayload = {
        headers: {},
        body: { event: 'payment.captured' },
      };

      expect(gateway.verifyWebhookSignature(payload)).toBe(false);
    });
  });
});
