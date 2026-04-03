import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ShipmentStatus } from '@ecommerce/shared-types';

export type ShipmentDocument = Shipment & Document;

@Schema({ collection: 'shipments', timestamps: true })
export class Shipment {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: String, required: true })
  vendorId: string;

  @Prop({ type: String, required: false })
  trackingNumber?: string;

  @Prop({ type: String, required: false })
  carrier?: string;

  @Prop({ type: String, enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  @Prop({ type: Date, required: false })
  estimatedDeliveryAt?: Date;

  @Prop({ type: Date, required: false })
  shippedAt?: Date;

  @Prop({ type: Date, required: false })
  deliveredAt?: Date;

  @Prop({ type: String, required: false })
  shippingLabelUrl?: string;

  // Virtual properties for relations (not stored in DB)
  items?: any[];
  trackingEvents?: any[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);

ShipmentSchema.index({ orderId: 1 });
ShipmentSchema.index({ vendorId: 1 });
ShipmentSchema.index({ status: 1 });

