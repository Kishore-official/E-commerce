import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PayoutStatus } from '@ecommerce/shared-types';

export type PayoutDocument = Payout & Document;

@Schema({ collection: 'payouts', timestamps: true })
export class Payout {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true, unique: true })
  payoutNumber: string;

  @Prop({ type: String, required: true })
  vendorId: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: true })
  orderCount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Prop({ type: Date, required: true })
  periodFrom: Date;

  @Prop({ type: Date, required: true })
  periodTo: Date;

  @Prop({ type: String, required: false })
  transactionRef?: string;

  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: String, required: false })
  processedBy?: string;

  @Prop({ type: Date, required: false })
  processedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);

PayoutSchema.index({ vendorId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1 });
PayoutSchema.index({ payoutNumber: 1 }, { unique: true });
