import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OfferType, OfferStatus, FulfillmentType } from '@ecommerce/shared-types';

export type OfferDocument = Offer & Document;

@Schema({ collection: 'offers', timestamps: true })
export class Offer {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ type: String, required: true })
  variantId: string;

  @Prop({ type: String, required: true })
  vendorId: string;

  @Prop({ type: String, enum: OfferType, required: true })
  offerType: OfferType;

  @Prop({ type: String, enum: OfferStatus, default: OfferStatus.DRAFT })
  status: OfferStatus;

  @Prop({ type: String, default: 'SA' })
  countryCode: string;

  @Prop({ type: Number, required: true })
  priceAmount: number;

  @Prop({ type: String, default: 'INR' })
  priceCurrency: string;

  @Prop({ type: Number, required: false })
  compareAtPrice?: number;

  @Prop({ type: Number, required: false })
  costPrice?: number;

  @Prop({ type: Number, default: 0 })
  stockQuantity: number;

  @Prop({ type: Number, default: 0 })
  stockReserved: number;

  @Prop({ type: String, required: false })
  affiliateUrl?: string;

  @Prop({ type: Number, required: false })
  affiliateCommissionPct?: number;

  @Prop({ type: String, enum: FulfillmentType, default: FulfillmentType.VENDOR })
  fulfillmentType: FulfillmentType;

  @Prop({ type: Boolean, default: false })
  isFeatured: boolean;

  @Prop({ type: String, required: false })
  rejectionReason?: string;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);

OfferSchema.index({ variantId: 1, vendorId: 1, countryCode: 1 }, { unique: true });
OfferSchema.index({ productId: 1, countryCode: 1, status: 1 });
OfferSchema.index({ vendorId: 1, status: 1 });
OfferSchema.index({ offerType: 1 });

