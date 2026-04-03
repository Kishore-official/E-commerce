import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';

describe('EmailTemplateService', () => {
  let service: EmailTemplateService;

  beforeEach(() => {
    const mockConfig = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          'app.storefrontUrl': 'http://localhost:3001',
        };
        return config[key] || defaultValue;
      }),
    } as any;
    service = new EmailTemplateService(mockConfig);
  });

  describe('orderConfirmation', () => {
    it('should generate order confirmation email', () => {
      const result = service.orderConfirmation({
        customerName: 'Deepa',
        orderNumber: 'MRD-2026-00001',
        grandTotal: 12999900,
        currency: 'INR',
        itemCount: 2,
      });

      expect(result.subject).toContain('MRD-2026-00001');
      expect(result.html).toContain('Deepa');
      expect(result.html).toContain('MRD-2026-00001');
      expect(result.html).toContain('MERIDIAN');
      expect(result.html).toContain('₹');
      expect(result.text).toContain('Deepa');
    });
  });

  describe('shipmentUpdate', () => {
    it('should generate shipment shipped email', () => {
      const result = service.shipmentUpdate({
        customerName: 'Karthik',
        orderNumber: 'MRD-2026-00002',
        trackingNumber: 'DELHIVERY-001',
        carrier: 'Delhivery',
        status: 'shipped',
      });

      expect(result.subject).toContain('Shipped');
      expect(result.html).toContain('DELHIVERY-001');
      expect(result.html).toContain('Delhivery');
    });

    it('should generate delivered email', () => {
      const result = service.shipmentUpdate({
        customerName: 'Meera',
        orderNumber: 'MRD-2026-00003',
        status: 'delivered',
      });

      expect(result.subject).toContain('Delivered');
    });
  });

  describe('paymentSuccess', () => {
    it('should generate payment success email', () => {
      const result = service.paymentSuccess({
        customerName: 'Deepa',
        orderNumber: 'MRD-2026-00001',
        amount: 500000,
        currency: 'INR',
      });

      expect(result.subject).toContain('Payment Received');
      expect(result.html).toContain('Payment Confirmed');
      expect(result.html).toContain('₹');
    });
  });

  describe('paymentFailed', () => {
    it('should generate payment failed email', () => {
      const result = service.paymentFailed({
        customerName: 'Karthik',
        orderNumber: 'MRD-2026-00002',
        amount: 100000,
        currency: 'INR',
      });

      expect(result.subject).toContain('Payment Failed');
      expect(result.html).toContain('Retry Payment');
    });
  });

  describe('vendorApproval', () => {
    it('should generate approval email', () => {
      const result = service.vendorApproval({
        vendorName: 'TechWorld',
        entityType: 'Product',
        entityName: 'iPhone 15 Pro',
      });

      expect(result.subject).toContain('approved');
      expect(result.html).toContain('Approved');
      expect(result.html).toContain('iPhone 15 Pro');
    });
  });

  describe('vendorRejection', () => {
    it('should include rejection reason', () => {
      const result = service.vendorRejection({
        vendorName: 'TechWorld',
        entityType: 'Product',
        reason: 'Missing product images',
      });

      expect(result.html).toContain('Missing product images');
      expect(result.text).toContain('Missing product images');
    });
  });

  describe('otpVerification', () => {
    it('should generate OTP email with code', () => {
      const result = service.otpVerification({
        name: 'Deepa',
        otp: '482917',
        expiresInMinutes: 10,
      });

      expect(result.subject).toContain('482917');
      expect(result.html).toContain('482917');
      expect(result.html).toContain('10 minutes');
    });
  });

  describe('welcomeEmail', () => {
    it('should generate welcome email', () => {
      const result = service.welcomeEmail('Deepa');

      expect(result.subject).toContain('Welcome');
      expect(result.html).toContain('Deepa');
      expect(result.html).toContain('Start Shopping');
    });
  });

  describe('stockDepleted', () => {
    it('should generate stock alert email', () => {
      const result = service.stockDepleted('TechWorld', 'iPhone 15 Pro');

      expect(result.subject).toContain('out of stock');
      expect(result.html).toContain('iPhone 15 Pro');
      expect(result.html).toContain('Action needed');
    });
  });
});
