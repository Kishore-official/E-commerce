import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AffiliateClickDocument = AffiliateClick & Document;

@Schema({ collection: 'affiliate_clicks', timestamps: false })
export class AffiliateClick {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  affiliateLinkId: string;

  @Prop({ type: String, required: false })
  userId?: string;

  @Prop({ type: String, required: false })
  ipAddress?: string;

  @Prop({ type: String, required: false })
  userAgent?: string;

  @Prop({ type: String, required: false })
  referer?: string;

  @Prop({ type: String, required: false })
  countryCode?: string;

  @Prop({ type: Date, required: true })
  clickedAt: Date;
}

export const AffiliateClickSchema = SchemaFactory.createForClass(AffiliateClick);

AffiliateClickSchema.index({ affiliateLinkId: 1 });

