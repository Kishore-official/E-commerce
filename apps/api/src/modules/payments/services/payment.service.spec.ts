import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PaymentStatus,
  RefundStatus,
  OrderStatus,
} from '@ecommerce/shared-types';
import { PaymentService } from './payment.service';
import { Payment } from '../schemas/payment.schema';
import { PaymentAttempt } from '../schemas/payment-attempt.schema';
import { Refund } from '../schemas/refund.schema';
import { Order } from '../../orders/schemas/order.schema';
import { PAYMENT_GATEWAY_PORT } from '../ports/payment-gateway.port';
import { EventBusService } from '@common/events/event-bus.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentModel: any;
  let attemptModel: any;
  let refundModel: any;
  let orderModel: any;
  let gateway: any;
  let eventBus: any;

  const mockOrder = {
    id: 'order-1',
    userId: 'user-1',
    status: OrderStatus.PENDING_PAYMENT,
    grandTotal: 100000,
    currency: 'SAR',
  };

  const mockPayment = {
    id: 'payment-1',
    orderId: 'order-1',
    amount: 100000,
    currency: 'SAR',
    status: PaymentStatus.PENDING,
    gateway: 'mock',
    gatewayPaymentId: null,
    paymentMethod: null,
    idempotencyKey: 'pay-key-1',
    metadata: null,
    paidAt: null,
  };

  const mockRefund = {
    id: 'refund-1',
    paymentId: 'payment-1',
    orderId: 'order-1',
    amount: 50000,
    currency: 'SAR',
    status: RefundStatus.PENDING,
    reason: 'Defective',
    gatewayRefundId: null,
    idempotencyKey: 'ref-key-1',
    processedAt: null,
  };

  beforeEach(async () => {
    const mockPaymentModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
          }),
        }),
      }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockAttemptModel = {
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      create: jest.fn(),
    };

    const mockRefundModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      create: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const mockOrderModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getModelToken(Payment.name),
          useValue: mockPaymentModel,
        },
        {
          provide: getModelToken(PaymentAttempt.name),
          useValue: mockAttemptModel,
        },
        {
          provide: getModelToken(Refund.name),
          useValue: mockRefundModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: PAYMENT_GATEWAY_PORT,
          useValue: {
            createPayment: jest.fn().mockResolvedValue({
              gatewayPaymentId: 'gw-pay-1',
              status: 'processing',
              metadata: { url: 'https://pay.example.com' },
            }),
            refundPayment: jest.fn().mockResolvedValue({
              gatewayRefundId: 'gw-ref-1',
              status: 'succeeded',
            }),
            verifyWebhookSignature: jest.fn().mockReturnValue(true),
            parseWebhook: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { emit: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('mock') },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentModel = module.get(getModelToken(Payment.name));
    attemptModel = module.get(getModelToken(PaymentAttempt.name));
    refundModel = module.get(getModelToken(Refund.name));
    orderModel = module.get(getModelToken(Order.name));
    gateway = module.get(PAYMENT_GATEWAY_PORT);
    eventBus = module.get(EventBusService);
  });

  describe('initiatePayment', () => {
    it('should return existing payment for duplicate idempotency key', async () => {
      const existingPayment = {
        ...mockPayment,
        status: PaymentStatus.PROCESSING,
      };
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingPayment),
      });
      attemptModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.initiatePayment('user-1', {
        orderId: 'order-1',
      } as any, 'pay-key-1');

      expect(result.id).toBe('payment-1');
      expect(gateway.createPayment).not.toHaveBeenCalled();
    });

    it('should create payment and call gateway', async () => {
      // Idempotency check - not found
      paymentModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockOrder }),
      });

      const createdPayment = {
        ...mockPayment,
        id: 'payment-1',
        status: PaymentStatus.PENDING,
      };
      paymentModel.create.mockResolvedValue(createdPayment);

      const updatedPayment = {
        ...createdPayment,
        status: PaymentStatus.PROCESSING,
        gatewayPaymentId: 'gw-pay-1',
      };
      paymentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPayment),
      });

      attemptModel.create.mockResolvedValue({ id: 'attempt-1' });

      const result = await service.initiatePayment('user-1', {
        orderId: 'order-1',
      } as any, 'pay-key-new');

      expect(paymentModel.create).toHaveBeenCalled();
      expect(gateway.createPayment).toHaveBeenCalled();
      expect(paymentModel.findOneAndUpdate).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should throw if order not found', async () => {
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.initiatePayment('user-1', { orderId: 'missing' } as any, 'key'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if order does not belong to user', async () => {
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockOrder,
          userId: 'other-user',
        }),
      });

      await expect(
        service.initiatePayment('user-1', { orderId: 'order-1' } as any, 'key'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if order is not PENDING_PAYMENT', async () => {
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      orderModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.CONFIRMED,
        }),
      });

      await expect(
        service.initiatePayment('user-1', { orderId: 'order-1' } as any, 'key'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentById', () => {
    it('should return payment with attempts', async () => {
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockPayment }),
      });
      attemptModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getPaymentById('payment-1');
      expect(result.id).toBe('payment-1');
    });

    it('should throw if not found', async () => {
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getPaymentById('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processWebhook', () => {
    it('should reject invalid signature', async () => {
      gateway.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.processWebhook('mock', {}, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should process payment.succeeded webhook', async () => {
      gateway.parseWebhook.mockReturnValue({
        eventType: 'payment.succeeded',
        gatewayPaymentId: 'gw-pay-1',
      });
      const processingPayment = {
        ...mockPayment,
        status: PaymentStatus.PROCESSING,
        gatewayPaymentId: 'gw-pay-1',
      };
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(processingPayment),
      });
      paymentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...processingPayment,
          status: PaymentStatus.SUCCEEDED,
        }),
      });
      attemptModel.create.mockResolvedValue({ id: 'attempt-1' });

      await service.processWebhook('mock', {}, {});

      expect(paymentModel.findOneAndUpdate).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should process payment.failed webhook', async () => {
      gateway.parseWebhook.mockReturnValue({
        eventType: 'payment.failed',
        gatewayPaymentId: 'gw-pay-1',
      });
      const processingPayment = {
        ...mockPayment,
        status: PaymentStatus.PROCESSING,
        gatewayPaymentId: 'gw-pay-1',
      };
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(processingPayment),
      });
      paymentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...processingPayment,
          status: PaymentStatus.FAILED,
        }),
      });
      attemptModel.create.mockResolvedValue({ id: 'attempt-1' });

      await service.processWebhook('mock', {}, {});

      expect(paymentModel.findOneAndUpdate).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('should skip duplicate webhook when payment already SUCCEEDED (idempotent)', async () => {
      gateway.parseWebhook.mockReturnValue({
        eventType: 'payment.succeeded',
        gatewayPaymentId: 'gw-pay-1',
      });
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPayment,
          status: PaymentStatus.SUCCEEDED,
          gatewayPaymentId: 'gw-pay-1',
        }),
      });

      await service.processWebhook('mock', {}, {});

      // findOneAndUpdate should NOT be called again
      expect(paymentModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('should skip if payment not found by gatewayPaymentId', async () => {
      gateway.parseWebhook.mockReturnValue({
        eventType: 'payment.succeeded',
        gatewayPaymentId: 'unknown',
      });
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Should not throw, just log and return
      await service.processWebhook('mock', {}, {});
      expect(paymentModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should handle refund.succeeded webhook', async () => {
      gateway.parseWebhook.mockReturnValue({
        eventType: 'refund.succeeded',
        gatewayRefundId: 'gw-ref-1',
      });
      refundModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockRefund,
          status: RefundStatus.PROCESSING,
          gatewayRefundId: 'gw-ref-1',
        }),
      });
      refundModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockRefund,
          status: RefundStatus.SUCCEEDED,
        }),
      });
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPayment,
          status: PaymentStatus.SUCCEEDED,
          amount: 100000,
        }),
      });
      paymentModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPayment,
          status: PaymentStatus.PARTIALLY_REFUNDED,
        }),
      });

      await service.processWebhook('mock', {}, {});

      expect(refundModel.findOneAndUpdate).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });
  });

  describe('initiateRefund', () => {
    it('should return existing refund for duplicate idempotency key', async () => {
      refundModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockRefund }),
      });

      const result = await service.initiateRefund(
        { orderId: 'order-1', amount: 50000 } as any,
        'ref-key-1',
        'admin-1',
      );

      expect(result.id).toBe('refund-1');
      expect(gateway.refundPayment).not.toHaveBeenCalled();
    });

    it('should create refund and call gateway', async () => {
      refundModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPayment,
          status: PaymentStatus.SUCCEEDED,
          gatewayPaymentId: 'gw-pay-1',
        }),
      });
      const createdRefund = {
        ...mockRefund,
        id: 'refund-1',
        status: RefundStatus.PENDING,
      };
      refundModel.create.mockResolvedValue(createdRefund);
      const updatedRefund = {
        ...createdRefund,
        status: RefundStatus.PROCESSING,
        gatewayRefundId: 'gw-ref-1',
      };
      refundModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedRefund),
      });

      const result = await service.initiateRefund(
        { orderId: 'order-1', amount: 50000 } as any,
        'ref-key-new',
        'admin-1',
      );

      expect(refundModel.create).toHaveBeenCalled();
      expect(gateway.refundPayment).toHaveBeenCalled();
    });

    it('should throw if payment not found', async () => {
      refundModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.initiateRefund(
          { orderId: 'order-1', amount: 50000 } as any,
          'key',
          'admin-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if payment not in refundable status', async () => {
      refundModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPayment,
          status: PaymentStatus.PENDING,
        }),
      });

      await expect(
        service.initiateRefund(
          { orderId: 'order-1', amount: 50000 } as any,
          'key',
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if refund amount exceeds payment', async () => {
      refundModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      paymentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockPayment,
          status: PaymentStatus.SUCCEEDED,
          amount: 50000,
        }),
      });

      await expect(
        service.initiateRefund(
          { orderId: 'order-1', amount: 99999 } as any,
          'key',
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
