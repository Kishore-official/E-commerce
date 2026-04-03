import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VariantDocument = Variant & Document;

@Schema({ collection: 'variants', timestamps: true })
export class Variant {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ type: String, required: true, unique: true })
  sku: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  barcode?: string;

  @Prop({ type: Number, required: false })
  weightGrams?: number;

  @Prop({ type: Object, required: false })
  dimensionsCm?: { length: number; width: number; height: number };

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const VariantSchema = SchemaFactory.createForClass(Variant);

VariantSchema.index({ productId: 1 });

