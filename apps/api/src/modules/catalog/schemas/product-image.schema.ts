import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductImageDocument = ProductImage & Document;

@Schema({ collection: 'product_images', timestamps: true })
export class ProductImage {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ type: String, required: false })
  variantId?: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: false })
  altText?: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Boolean, default: false })
  isPrimary: boolean;

  @Prop({ type: Buffer, required: false, select: false })
  imageData?: Buffer;

  @Prop({ type: String, required: false })
  mimeType?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);

ProductImageSchema.index({ productId: 1 });
ProductImageSchema.index({ variantId: 1 });

