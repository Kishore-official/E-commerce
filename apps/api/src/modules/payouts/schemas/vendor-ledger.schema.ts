import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VendorLedgerDocument = VendorLedger & Document;

@Schema({ collection: 'vendor_ledger', timestamps: true })
export class VendorLedger {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  vendorId: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: Number, required: true })
  orderItemsTotal: number;

  @Prop({ type: Number, required: true })
  commissionRate: number;

  @Prop({ type: Number, required: true })
  commissionAmount: number;

  @Prop({ type: Number, required: true })
  netPayable: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: false })
  payoutId?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const VendorLedgerSchema = SchemaFactory.createForClass(VendorLedger);

VendorLedgerSchema.index({ vendorId: 1, createdAt: -1 });
VendorLedgerSchema.index({ orderId: 1, vendorId: 1 }, { unique: true });
VendorLedgerSchema.index({ payoutId: 1 });
