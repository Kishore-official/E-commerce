import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShipmentItemDocument = ShipmentItem & Document;

@Schema({ collection: 'shipment_items', timestamps: true })
export class ShipmentItem {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  shipmentId: string;

  @Prop({ type: String, required: true })
  orderItemId: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const ShipmentItemSchema = SchemaFactory.createForClass(ShipmentItem);

ShipmentItemSchema.index({ shipmentId: 1, orderItemId: 1 }, { unique: true });
ShipmentItemSchema.index({ shipmentId: 1 });

