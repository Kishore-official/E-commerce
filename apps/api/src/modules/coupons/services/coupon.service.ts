import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  DiscountType,
  CouponStatus,
  PaginatedResult,
} from '@ecommerce/shared-types';
import { buildPaginatedResult } from '@common/utils/pagination.util';
import { PaginationDto } from '@common/dto/pagination.dto';
import { Coupon, CouponDocument } from '../schemas/coupon.schema';
import { CouponUsage, CouponUsageDocument } from '../schemas/coupon-usage.schema';
import { CreateCouponDto, UpdateCouponDto } from '../dto';

export interface CouponValidationResult {
  valid: boolean;
  coupon: Coupon;
  discountAmount: number;
  message?: string;
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private readonly usageModel: Model<CouponUsageDocument>,
  ) {}

  // ── Admin CRUD ───────────────────────────────────────────────

  async create(dto: CreateCouponDto, adminUserId: string): Promise<Coupon> {
    const existing = await this.couponModel.findOne({ code: dto.code.toUpperCase() }).exec();
    if (existing) throw new BadRequestException(`Coupon code "${dto.code}" already exists`);

    return this.couponModel.create({
      id: uuidv4(),
      code: dto.code.toUpperCase(),
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscountAmount,
      minOrderAmount: dto.minOrderAmount || 0,
      maxUses: dto.maxUses || 0,
      maxUsesPerUser: dto.maxUsesPerUser || 0,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      applicableCategoryIds: dto.applicableCategoryIds || [],
      applicableProductIds: dto.applicableProductIds || [],
      createdBy: adminUserId,
    });
  }

  async update(couponId: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.couponModel.findOne({ id: couponId }).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');

    const updateData: Record<string, unknown> = {};
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.discountValue !== undefined) updateData.discountValue = dto.discountValue;
    if (dto.maxDiscountAmount !== undefined) updateData.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.minOrderAmount !== undefined) updateData.minOrderAmount = dto.minOrderAmount;
    if (dto.maxUses !== undefined) updateData.maxUses = dto.maxUses;
    if (dto.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = dto.maxUsesPerUser;
    if (dto.validFrom !== undefined) updateData.validFrom = new Date(dto.validFrom);
    if (dto.validUntil !== undefined) updateData.validUntil = new Date(dto.validUntil);
    if (dto.applicableCategoryIds !== undefined) updateData.applicableCategoryIds = dto.applicableCategoryIds;
    if (dto.applicableProductIds !== undefined) updateData.applicableProductIds = dto.applicableProductIds;

    const updated = await this.couponModel.findOneAndUpdate(
      { id: couponId },
      { $set: updateData },
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundException('Coupon not found');
    return updated;
  }

  async findById(couponId: string): Promise<Coupon> {
    const coupon = await this.couponModel.findOne({ id: couponId }).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async findAll(query: PaginationDto): Promise<PaginatedResult<Coupon>> {
    const [data, total] = await Promise.all([
      this.couponModel
        .find()
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.couponModel.countDocuments().exec(),
    ]);
    return buildPaginatedResult(data, total, query.page, query.limit);
  }

  async deactivate(couponId: string): Promise<Coupon> {
    return this.update(couponId, { status: CouponStatus.INACTIVE });
  }

  // ── Validation & Calculation ─────────────────────────────────

  async validateCoupon(
    code: string,
    userId: string,
    orderSubtotal: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.couponModel
      .findOne({ code: code.toUpperCase() })
      .exec();

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    // Status check
    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('This coupon is no longer active');
    }

    // Date validation
    const now = new Date();
    if (now < coupon.validFrom) {
      throw new BadRequestException('This coupon is not yet valid');
    }
    if (now > coupon.validUntil) {
      throw new BadRequestException('This coupon has expired');
    }

    // Total usage limit
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    // Per-user usage limit
    if (coupon.maxUsesPerUser > 0) {
      const userUsageCount = await this.usageModel.countDocuments({
        couponId: coupon.id,
        userId,
      }).exec();
      if (userUsageCount >= coupon.maxUsesPerUser) {
        throw new BadRequestException('You have already used this coupon the maximum number of times');
      }
    }

    // Minimum order amount
    if (coupon.minOrderAmount > 0 && orderSubtotal < coupon.minOrderAmount) {
      const minAmountFormatted = (coupon.minOrderAmount / 100).toFixed(2);
      throw new BadRequestException(
        `Minimum order amount of ₹${minAmountFormatted} required for this coupon`,
      );
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(coupon, orderSubtotal);

    return {
      valid: true,
      coupon,
      discountAmount,
      message: `Coupon applied! You save ₹${(discountAmount / 100).toFixed(2)}`,
    };
  }

  calculateDiscount(coupon: Coupon, orderSubtotal: number): number {
    let discount: number;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = Math.round(orderSubtotal * (coupon.discountValue / 100));
      // Apply max discount cap
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else {
      // Fixed amount
      discount = coupon.discountValue;
    }

    // Discount cannot exceed subtotal
    if (discount > orderSubtotal) {
      discount = orderSubtotal;
    }

    return discount;
  }

  // ── Usage Tracking ───────────────────────────────────────────

  async recordUsage(
    couponId: string,
    userId: string,
    orderId: string,
    discountAmount: number,
  ): Promise<void> {
    await this.usageModel.create({
      id: uuidv4(),
      couponId,
      userId,
      orderId,
      discountAmount,
    });

    await this.couponModel.findOneAndUpdate(
      { id: couponId },
      { $inc: { usedCount: 1 } },
    ).exec();

    this.logger.log(`Coupon ${couponId} used by ${userId} on order ${orderId}`);
  }
}
