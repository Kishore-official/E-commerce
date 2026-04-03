import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BrandDocument = Brand & Document;

@Schema({ collection: 'brands', timestamps: true })
export class Brand {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: false })
  logoUrl?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);

BrandSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc: any, ret: any) => { delete ret._id; delete ret.__v; return ret; },
});

BrandSchema.index({ isActive: 1 });

