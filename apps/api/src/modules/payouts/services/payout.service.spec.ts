import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PayoutStatus } from '@ecommerce/shared-types';
import { PayoutService } from './payout.service';
import { Payout } from '../schemas/payout.schema';
import { VendorLedger } from '../schemas/vendor-ledger.schema';
import { Order } from '@modules/orders/schemas/order.schema';
import { OrderItem } from '@modules/orders/schemas/order-item.schema';
import { Payment } from '@modules/payments/schemas/payment.schema';
import { Vendor } from '@modules/identity/schemas/vendor.schema';

describe('PayoutService', () => {
  let service: PayoutService;
  let payoutModel: any;
  let ledgerModel: any;
  let orderModel: any;
  let orderItemModel: any;
  let vendorModel: any;

  const mockVendor = {
    id: 'vendor-1',
    businessName: 'TechWorld',
    commissionRate: 10,
    status: 'approved',
  };

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'MRD-2026-00001',
    currency: 'INR',
  };

  const mockOrderItems = [
    { id: 'item-1', orderId: 'order-1', vendorId: 'vendor-1', totalPrice: 1000000 },
    { id: 'item-2', orderId: 'order-1', vendorId: 'vendor-1', totalPrice: 500000 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutService,
        {
          provide: getModelToken(Payout.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }), exec: jest.fn() }),
            find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }) }) }),
            countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
            findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
          },
        },
        {
          provide: getModelToken(VendorLedger.name),
          useValue: {
            create: jest.fn(),
            findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
            find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }) }), exec: jest.fn().mockResolvedValue([]) }),
            countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
            updateMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
          },
        },
        {
          provide: getModelToken(Order.name),
          useValue: { findOne: jest.fn().mockReturnValue({ exec: jest.fn() }) },
        },
        {
          provide: getModelToken(OrderItem.name),
          useValue: { find: jest.fn().mockReturnValue({ exec: jest.fn() }) },
        },
        {
          provide: getModelToken(Payment.name),
          useValue: { findOne: jest.fn().mockReturnValue({ exec: jest.fn() }) },
        },
        {
          provide: getModelToken(Vendor.name),
          useValue: {
            findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
            find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }) }) }),
            countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
          },
        },
      ],
    }).compile();

    service = module.get(PayoutService);
    payoutModel = module.get(getModelToken(Payout.name));
    ledgerModel = module.get(getModelToken(VendorLedger.name));
    orderModel = module.get(getModelToken(Order.name));
    orderItemModel = module.get(getModelToken(OrderItem.name));
    vendorModel = module.get(getModelToken(Vendor.name));
  });

  describe('recordOrderEarnings', () => {
    it('should create ledger entries for each vendor', async () => {
      orderModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockOrder) });
      orderItemModel.find.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockOrderItems) });
      ledgerModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      vendorModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockVendor) });

      await service.recordOrderEarnings('order-1');

      expect(ledgerModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: 'vendor-1',
          orderId: 'order-1',
          orderItemsTotal: 1500000,
          commissionRate: 10,
          commissionAmount: 150000,
          netPayable: 1350000,
        }),
      );
    });

    it('should skip if order not found', async () => {
      orderModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await service.recordOrderEarnings('nonexistent');
      expect(ledgerModel.create).not.toHaveBeenCalled();
    });

    it('should not duplicate ledger entries', async () => {
      orderModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockOrder) });
      orderItemModel.find.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockOrderItems) });
      ledgerModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ id: 'existing' }) });

      await service.recordOrderEarnings('order-1');
      expect(ledgerModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getVendorBalance', () => {
    it('should calculate vendor balance correctly', async () => {
      vendorModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockVendor) });
      ledgerModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { orderItemsTotal: 1000000, commissionAmount: 100000, netPayable: 900000, createdAt: new Date() },
          { orderItemsTotal: 500000, commissionAmount: 50000, netPayable: 450000, createdAt: new Date() },
        ]),
      });
      payoutModel.find.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });

      const result = await service.getVendorBalance('vendor-1');

      expect(result.totalEarnings).toBe(1500000);
      expect(result.totalCommission).toBe(150000);
      expect(result.pendingBalance).toBe(1350000);
      expect(result.totalPaidOut).toBe(0);
      expect(result.orderCount).toBe(2);
    });

    it('should subtract completed payouts from balance', async () => {
      vendorModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockVendor) });
      ledgerModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { orderItemsTotal: 1000000, commissionAmount: 100000, netPayable: 900000, createdAt: new Date() },
        ]),
      });
      payoutModel.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ amount: 500000 }]),
      });

      const result = await service.getVendorBalance('vendor-1');

      expect(result.pendingBalance).toBe(400000); // 900000 - 500000
      expect(result.totalPaidOut).toBe(500000);
    });

    it('should throw for unknown vendor', async () => {
      vendorModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.getVendorBalance('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPayout', () => {
    it('should throw if no pending balance', async () => {
      vendorModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockVendor) });
      ledgerModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
      payoutModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

      await expect(
        service.createPayout('vendor-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markPayoutCompleted', () => {
    it('should complete a pending payout', async () => {
      const mockPayout = { id: 'pay-1', status: PayoutStatus.PENDING, payoutNumber: 'PAY-202604-00001' };
      payoutModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockPayout) });
      payoutModel.findOneAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockPayout, status: PayoutStatus.COMPLETED }),
      });

      const result = await service.markPayoutCompleted('pay-1', 'NEFT-REF-123', 'admin-1');

      expect(payoutModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'pay-1' },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: PayoutStatus.COMPLETED,
            transactionRef: 'NEFT-REF-123',
          }),
        }),
        { new: true },
      );
    });

    it('should throw for already completed payout', async () => {
      payoutModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ id: 'pay-1', status: PayoutStatus.COMPLETED }),
      });

      await expect(
        service.markPayoutCompleted('pay-1', 'REF', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
