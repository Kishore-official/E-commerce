import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ReviewEligibilityStatus } from '@ecommerce/shared-types';

export type ReviewEligibilityDocument = ReviewEligibility & Document;

@Schema({ collection: 'review_eligibility', timestamps: true })
export class ReviewEligibility {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  orderId: string;

  @Prop({ type: String, required: true, unique: true })
  orderItemId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ type: String, required: true })
  variantId: string;

  @Prop({ type: String, enum: ReviewEligibilityStatus, default: ReviewEligibilityStatus.ELIGIBLE })
  status: ReviewEligibilityStatus;

  @Prop({ type: Date, required: true })
  eligibleUntil: Date;

  @Prop({ type: String, required: true, unique: true })
  idempotencyKey: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const ReviewEligibilitySchema = SchemaFactory.createForClass(ReviewEligibility);

ReviewEligibilitySchema.index({ userId: 1 });
ReviewEligibilitySchema.index({ productId: 1 });
ReviewEligibilitySchema.index({ status: 1 });

