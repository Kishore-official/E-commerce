import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ReviewStatus } from '@ecommerce/shared-types';

export type ReviewDocument = Review & Document;

@Schema({ collection: 'reviews', timestamps: true })
export class Review {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true, unique: true })
  reviewEligibilityId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ type: String, required: true })
  variantId: string;

  @Prop({ type: Number, required: true })
  rating: number;

  @Prop({ type: String, required: false })
  title?: string;

  @Prop({ type: String, required: false })
  body?: string;

  @Prop({ type: String, enum: ReviewStatus, default: ReviewStatus.PENDING_MODERATION })
  status: ReviewStatus;

  @Prop({ type: String, required: false })
  moderatedBy?: string;

  @Prop({ type: Date, required: false })
  moderatedAt?: Date;

  @Prop({ type: String, required: false })
  rejectionReason?: string;

  @Prop({ type: String, required: true, unique: true })
  idempotencyKey: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ productId: 1 });
ReviewSchema.index({ status: 1 });

