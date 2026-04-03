import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DiscountType, CouponStatus } from '@ecommerce/shared-types';
import { CouponService } from './coupon.service';
import { Coupon } from '../schemas/coupon.schema';
import { CouponUsage } from '../schemas/coupon-usage.schema';

describe('CouponService', () => {
  let service: CouponService;
  let couponModel: any;
  let usageModel: any;

  const now = new Date();
  const mockCoupon = {
    id: 'coupon-1',
    code: 'WELCOME20',
    description: '20% off',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20,
    maxDiscountAmount: 500000, // ₹5000
    minOrderAmount: 100000,   // ₹1000
    status: CouponStatus.ACTIVE,
    maxUses: 100,
    maxUsesPerUser: 1,
    usedCount: 5,
    validFrom: new Date(now.getTime() - 86400000),
    validUntil: new Date(now.getTime() + 86400000 * 30),
    applicableCategoryIds: [],
    applicableProductIds: [],
  };

  beforeEach(async () => {
    const mockCouponModel = {
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

    const mockUsageModel = {
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponService,
        { provide: getModelToken(Coupon.name), useValue: mockCouponModel },
        { provide: getModelToken(CouponUsage.name), useValue: mockUsageModel },
      ],
    }).compile();

    service = module.get(CouponService);
    couponModel = module.get(getModelToken(Coupon.name));
    usageModel = module.get(getModelToken(CouponUsage.name));
  });

  describe('create', () => {
    it('should create a new coupon', async () => {
      couponModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      couponModel.create.mockResolvedValueOnce({ ...mockCoupon });

      const result = await service.create({
        code: 'WELCOME20',
        description: '20% off',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        validFrom: '2026-04-01T00:00:00Z',
        validUntil: '2026-12-31T23:59:59Z',
      }, 'admin-1');

      expect(couponModel.create).toHaveBeenCalled();
    });

    it('should throw if code already exists', async () => {
      couponModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockCoupon) });

      await expect(service.create({
        code: 'WELCOME20',
        description: '20% off',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        validFrom: '2026-04-01T00:00:00Z',
        validUntil: '2026-12-31T23:59:59Z',
      }, 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateCoupon', () => {
    it('should validate an active coupon and calculate percentage discount', async () => {
      couponModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockCoupon) });
      usageModel.countDocuments.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(0) });

      const result = await service.validateCoupon('WELCOME20', 'user-1', 1000000);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(200000); // 20% of ₹10000 = ₹2000
    });

    it('should cap percentage discount at maxDiscountAmount', async () => {
      couponModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockCoupon) });
      usageModel.countDocuments.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(0) });

      const result = await service.validateCoupon('WELCOME20', 'user-1', 5000000);

      // 20% of ₹50000 = ₹10000, but max is ₹5000
      expect(result.discountAmount).toBe(500000);
    });

    it('should throw for invalid code', async () => {
      couponModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.validateCoupon('INVALID', 'user-1', 1000000),
      ).rejects.toThrow('Invalid coupon code');
    });

    it('should throw for inactive coupon', async () => {
      couponModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockCoupon, status: CouponStatus.INACTIVE }),
      });

      await expect(
        service.validateCoupon('WELCOME20', 'user-1', 1000000),
      ).rejects.toThrow('no longer active');
    });

    it('should throw for expired coupon', async () => {
      couponModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({
          ...mockCoupon,
          validUntil: new Date(now.getTime() - 86400000),
        }),
      });

      await expect(
        service.validateCoupon('WELCOME20', 'user-1', 1000000),
      ).rejects.toThrow('expired');
    });

    it('should throw when max uses reached', async () => {
      couponModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue({ ...mockCoupon, usedCount: 100, maxUses: 100 }),
      });

      await expect(
        service.validateCoupon('WELCOME20', 'user-1', 1000000),
      ).rejects.toThrow('usage limit');
    });

    it('should throw when user max uses reached', async () => {
      couponModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockCoupon) });
      usageModel.countDocuments.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(1) });

      await expect(
        service.validateCoupon('WELCOME20', 'user-1', 1000000),
      ).rejects.toThrow('maximum number of times');
    });

    it('should throw when order below minimum', async () => {
      couponModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(mockCoupon) });
      usageModel.countDocuments.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(0) });

      await expect(
        service.validateCoupon('WELCOME20', 'user-1', 50000), // ₹500 < ₹1000 min
      ).rejects.toThrow('Minimum order amount');
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate fixed amount discount', () => {
      const fixedCoupon = {
        ...mockCoupon,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 200000, // ₹2000
      } as Coupon;

      const result = service.calculateDiscount(fixedCoupon, 1000000);
      expect(result).toBe(200000);
    });

    it('should not exceed subtotal for fixed amount', () => {
      const fixedCoupon = {
        ...mockCoupon,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: 2000000, // ₹20000
      } as Coupon;

      const result = service.calculateDiscount(fixedCoupon, 500000); // ₹5000 subtotal
      expect(result).toBe(500000); // Capped at subtotal
    });
  });

  describe('recordUsage', () => {
    it('should create usage record and increment count', async () => {
      usageModel.create.mockResolvedValueOnce({});
      couponModel.findOneAndUpdate.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({}) });

      await service.recordUsage('coupon-1', 'user-1', 'order-1', 200000);

      expect(usageModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          couponId: 'coupon-1',
          userId: 'user-1',
          orderId: 'order-1',
          discountAmount: 200000,
        }),
      );
      expect(couponModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'coupon-1' },
        { $inc: { usedCount: 1 } },
      );
    });
  });
});
