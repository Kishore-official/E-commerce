import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DiscountType, CouponStatus } from '@ecommerce/shared-types';

export type CouponDocument = Coupon & Document;

@Schema({ collection: 'coupons', timestamps: true })
export class Coupon {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, enum: DiscountType, required: true })
  discountType: DiscountType;

  @Prop({ type: Number, required: true })
  discountValue: number;

  @Prop({ type: Number, required: false })
  maxDiscountAmount?: number;

  @Prop({ type: Number, default: 0 })
  minOrderAmount: number;

  @Prop({ type: String, enum: CouponStatus, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Prop({ type: Number, default: 0 })
  maxUses: number;

  @Prop({ type: Number, default: 0 })
  maxUsesPerUser: number;

  @Prop({ type: Number, default: 0 })
  usedCount: number;

  @Prop({ type: Date, required: true })
  validFrom: Date;

  @Prop({ type: Date, required: true })
  validUntil: Date;

  @Prop({ type: [String], default: [] })
  applicableCategoryIds: string[];

  @Prop({ type: [String], default: [] })
  applicableProductIds: string[];

  @Prop({ type: String, required: false })
  createdBy?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
