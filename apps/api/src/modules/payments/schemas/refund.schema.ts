import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { RefundStatus } from '@ecommerce/shared-types';

export type RefundDocument = Refund & Document;

@Schema({ collection: 'refunds', timestamps: true })
export class Refund {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  paymentId: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, enum: RefundStatus, default: RefundStatus.PENDING })
  status: RefundStatus;

  @Prop({ type: String, required: false })
  reason?: string;

  @Prop({ type: String, required: false, unique: true })
  gatewayRefundId?: string;

  @Prop({ type: String, required: true, unique: true })
  idempotencyKey: string;

  @Prop({ type: Date, required: false })
  processedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);

RefundSchema.index({ paymentId: 1 });
RefundSchema.index({ orderId: 1 });

