import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PaymentStatus } from '@ecommerce/shared-types';

export type PaymentDocument = Payment & Document;

@Schema({ collection: 'payments', timestamps: true })
export class Payment {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ type: String, required: true })
  gateway: string;

  @Prop({ type: String, required: false })
  gatewayPaymentId?: string;

  @Prop({ type: String, required: false })
  paymentMethod?: string;

  @Prop({ type: String, required: true, unique: true })
  idempotencyKey: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  paidAt?: Date;

  // Virtual property for relations (not stored in DB)
  attempts?: any[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });

