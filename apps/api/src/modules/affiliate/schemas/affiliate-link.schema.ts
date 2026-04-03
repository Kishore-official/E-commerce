import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AffiliateLinkDocument = AffiliateLink & Document;

@Schema({ collection: 'affiliate_links', timestamps: true })
export class AffiliateLink {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  offerId: string;

  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: String, required: true })
  targetUrl: string;

  @Prop({ type: Number, default: 0 })
  clickCount: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const AffiliateLinkSchema = SchemaFactory.createForClass(AffiliateLink);

AffiliateLinkSchema.index({ offerId: 1 });
AffiliateLinkSchema.index({ isActive: 1 });

