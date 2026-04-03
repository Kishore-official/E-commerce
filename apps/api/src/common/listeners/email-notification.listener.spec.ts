import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmailNotificationListener } from './email-notification.listener';
import { EMAIL_SERVICE_PORT } from '@common/services/email/email.port';
import { SMS_SERVICE_PORT } from '@common/services/sms/sms.port';
import { EmailTemplateService } from '@common/services/email/email-template.service';
import { User } from '@modules/identity/schemas/user.schema';
import { Vendor } from '@modules/identity/schemas/vendor.schema';
import { Order } from '@modules/orders/schemas/order.schema';
import { DomainEvent } from '@common/events/domain-event.base';

class TestEvent extends DomainEvent {
  constructor(name: string, id: string, payload: Record<string, unknown>) {
    super(name, id, payload);
  }
}

describe('EmailNotificationListener', () => {
  let listener: EmailNotificationListener;
  let emailService: any;
  let smsService: any;
  let userModel: any;
  let orderModel: any;

  const mockUser = {
    id: 'user-1',
    email: 'customer@test.com',
    firstName: 'Deepa',
    phone: '+91-9876543210',
  };

  const mockOrder = {
    id: 'order-1',
    userId: 'user-1',
    orderNumber: 'MRD-2026-00001',
    grandTotal: 12999900,
    currency: 'INR',
  };

  beforeEach(async () => {
    const mockUserModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) }),
    };

    const mockVendorModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    const mockOrderModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockOrder) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationListener,
        {
          provide: EMAIL_SERVICE_PORT,
          useValue: { sendEmail: jest.fn().mockResolvedValue({ id: 'email-1', success: true }) },
        },
        {
          provide: SMS_SERVICE_PORT,
          useValue: { sendSms: jest.fn().mockResolvedValue({ id: 'sms-1', success: true }) },
        },
        {
          provide: EmailTemplateService,
          useValue: {
            orderConfirmation: jest.fn().mockReturnValue({
              subject: 'Order Confirmed',
              html: '<h1>Order Confirmed</h1>',
              text: 'Order Confirmed',
            }),
            paymentSuccess: jest.fn().mockReturnValue({
              subject: 'Payment Received',
              html: '<h1>Payment</h1>',
              text: 'Payment Received',
            }),
            paymentFailed: jest.fn().mockReturnValue({
              subject: 'Payment Failed',
              html: '<h1>Failed</h1>',
              text: 'Payment Failed',
            }),
            shipmentUpdate: jest.fn().mockReturnValue({
              subject: 'Shipped',
              html: '<h1>Shipped</h1>',
              text: 'Shipped',
            }),
          },
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Vendor.name), useValue: mockVendorModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
      ],
    }).compile();

    listener = module.get(EmailNotificationListener);
    emailService = module.get(EMAIL_SERVICE_PORT);
    smsService = module.get(SMS_SERVICE_PORT);
    userModel = module.get(getModelToken(User.name));
    orderModel = module.get(getModelToken(Order.name));
  });

  describe('onOrderConfirmed', () => {
    it('should send email and SMS on order confirmation', async () => {
      const event = new TestEvent('orders.order.confirmed', 'order-1', {
        userId: 'user-1',
        orderNumber: 'MRD-2026-00001',
        grandTotal: 12999900,
        currency: 'INR',
        itemCount: 2,
      });

      await listener.onOrderConfirmed(event);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@test.com',
          subject: 'Order Confirmed',
          tags: ['order-confirmed'],
        }),
      );

      expect(smsService.sendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+91-9876543210',
        }),
      );
    });

    it('should not send if user not found', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const event = new TestEvent('orders.order.confirmed', 'order-1', {
        userId: 'nonexistent',
        orderNumber: 'MRD-2026-00001',
        grandTotal: 12999900,
        currency: 'INR',
        itemCount: 1,
      });

      await listener.onOrderConfirmed(event);

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('onPaymentSucceeded', () => {
    it('should send payment success email', async () => {
      const event = new TestEvent('payments.payment.succeeded', 'pay-1', {
        orderId: 'order-1',
        amount: 12999900,
        currency: 'INR',
      });

      await listener.onPaymentSucceeded(event);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@test.com',
          tags: ['payment-success'],
        }),
      );
    });
  });

  describe('onPaymentFailed', () => {
    it('should send payment failed email', async () => {
      const event = new TestEvent('payments.payment.failed', 'pay-1', {
        orderId: 'order-1',
      });

      await listener.onPaymentFailed(event);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@test.com',
          tags: ['payment-failed'],
        }),
      );
    });
  });

  describe('onShipmentShipped', () => {
    it('should send shipment email and SMS', async () => {
      const event = new TestEvent('logistics.shipment.shipped', 'ship-1', {
        orderId: 'order-1',
        trackingNumber: 'DELHIVERY-001',
        carrier: 'Delhivery',
      });

      await listener.onShipmentShipped(event);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['shipment-shipped'],
        }),
      );

      expect(smsService.sendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+91-9876543210',
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should not throw when email service fails', async () => {
      emailService.sendEmail.mockRejectedValue(new Error('API error'));

      const event = new TestEvent('orders.order.confirmed', 'order-1', {
        userId: 'user-1',
        orderNumber: 'MRD-2026-00001',
        grandTotal: 12999900,
        currency: 'INR',
        itemCount: 1,
      });

      await expect(listener.onOrderConfirmed(event)).resolves.not.toThrow();
    });
  });
});
