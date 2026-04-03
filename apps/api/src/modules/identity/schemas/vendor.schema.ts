import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { VendorStatus } from '@ecommerce/shared-types';

export type VendorDocument = Vendor & Document;

@Schema({ collection: 'vendors', timestamps: true })
export class Vendor {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  businessName: string;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: true })
  businessEmail: string;

  @Prop({ type: String, required: false })
  phone?: string;

  @Prop({ type: String, required: false })
  logoUrl?: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, default: 'SA', index: true })
  countryCode: string;

  @Prop({ type: String, enum: VendorStatus, default: VendorStatus.PENDING, index: true })
  status: VendorStatus;

  @Prop({ type: Number, default: 10.0 })
  commissionRate: number;

  @Prop({ type: String, required: false })
  gstin?: string;

  @Prop({ type: String, required: false })
  pan?: string;

  @Prop({ type: String, required: false })
  legalName?: string;

  @Prop({ type: Object, required: false })
  businessAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    countryCode: string;
  };

  @Prop({ type: Date, required: false })
  approvedAt?: Date;

  @Prop({ type: String, required: false })
  rejectionReason?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const VendorSchema = SchemaFactory.createForClass(Vendor);

VendorSchema.index({ userId: 1 }, { unique: true });
VendorSchema.index({ countryCode: 1 });
VendorSchema.index({ status: 1 });

