import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CouponUsageDocument = CouponUsage & Document;

@Schema({ collection: 'coupon_usages', timestamps: true })
export class CouponUsage {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  couponId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: Number, required: true })
  discountAmount: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const CouponUsageSchema = SchemaFactory.createForClass(CouponUsage);

CouponUsageSchema.index({ couponId: 1, userId: 1 });
CouponUsageSchema.index({ orderId: 1 }, { unique: true });
