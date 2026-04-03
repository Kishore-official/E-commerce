import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OrderItemStatus, OfferType } from '@ecommerce/shared-types';

export type OrderItemDocument = OrderItem & Document;

@Schema({ collection: 'order_items', timestamps: true })
export class OrderItem {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: String, required: true })
  offerId: string;

  @Prop({ type: String, required: true })
  vendorId: string;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: true })
  variantName: string;

  @Prop({ type: String, required: true })
  sku: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  unitPrice: number;

  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, enum: OfferType, required: true })
  offerType: OfferType;

  @Prop({ type: String, enum: OrderItemStatus, default: OrderItemStatus.PENDING })
  status: OrderItemStatus;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

OrderItemSchema.index({ orderId: 1 });
OrderItemSchema.index({ offerId: 1 });
OrderItemSchema.index({ vendorId: 1 });
OrderItemSchema.index({ status: 1 });

