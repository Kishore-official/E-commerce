import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentAttemptDocument = PaymentAttempt & Document;

@Schema({ collection: 'payment_attempts', timestamps: true })
export class PaymentAttempt {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  paymentId: string;

  @Prop({ type: Object, required: false })
  gatewayResponse?: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  errorMessage?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const PaymentAttemptSchema = SchemaFactory.createForClass(PaymentAttempt);

PaymentAttemptSchema.index({ paymentId: 1 });

