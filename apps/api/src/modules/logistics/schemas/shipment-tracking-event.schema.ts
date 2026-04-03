import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShipmentTrackingEventDocument = ShipmentTrackingEvent & Document;

@Schema({ collection: 'shipment_tracking_events', timestamps: true })
export class ShipmentTrackingEvent {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  shipmentId: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  location?: string;

  @Prop({ type: Date, required: true })
  occurredAt: Date;

  @Prop({ type: Object, required: false })
  rawPayload?: Record<string, unknown>;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const ShipmentTrackingEventSchema = SchemaFactory.createForClass(ShipmentTrackingEvent);

ShipmentTrackingEventSchema.index({ shipmentId: 1 });

