import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReviewMediaDocument = ReviewMedia & Document;

@Schema({ collection: 'review_media', timestamps: true })
export class ReviewMedia {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  reviewId: string;

  @Prop({ type: String, required: true })
  mediaType: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const ReviewMediaSchema = SchemaFactory.createForClass(ReviewMedia);

ReviewMediaSchema.index({ reviewId: 1 });

