import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OrderStatus } from '@ecommerce/shared-types';

export type OrderStatusHistoryDocument = OrderStatusHistory & Document;

@Schema({ collection: 'order_status_history', timestamps: true })
export class OrderStatusHistory {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: String, enum: OrderStatus, required: true })
  status: OrderStatus;

  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: String, required: false })
  changedBy?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const OrderStatusHistorySchema = SchemaFactory.createForClass(OrderStatusHistory);

OrderStatusHistorySchema.index({ orderId: 1 });
OrderStatusHistorySchema.index({ createdAt: -1 });

