import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VendorStaffDocument = VendorStaff & Document;

@Schema({ collection: 'vendor_staff', timestamps: true })
export class VendorStaff {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  vendorId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const VendorStaffSchema = SchemaFactory.createForClass(VendorStaff);

VendorStaffSchema.index({ vendorId: 1, userId: 1 }, { unique: true });
VendorStaffSchema.index({ vendorId: 1 });
VendorStaffSchema.index({ userId: 1 });

