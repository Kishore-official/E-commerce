import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OrderStatus } from '@ecommerce/shared-types';

export type OrderDocument = Order & Document;

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true, unique: true })
  orderNumber: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  countryCode: string;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, default: 0 })
  shippingTotal: number;

  @Prop({ type: Number, default: 0 })
  taxTotal: number;

  @Prop({ type: Number, default: 0 })
  discountTotal: number;

  @Prop({ type: Number, required: true })
  grandTotal: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: Object, required: true })
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    countryCode: string;
    phone?: string;
  };

  @Prop({ type: Object, required: false })
  billingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    countryCode: string;
    phone?: string;
  };

  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: String, required: true, unique: true })
  idempotencyKey: string;

  @Prop({ type: Date, required: false })
  cancelledAt?: Date;

  @Prop({ type: String, required: false })
  cancellationReason?: string;

  @Prop({ type: Date, required: false })
  completedAt?: Date;

  // Virtual properties for relations (not stored in DB)
  items?: any[];
  statusHistory?: any[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1 });
OrderSchema.index({ countryCode: 1 });
OrderSchema.index({ status: 1 });

