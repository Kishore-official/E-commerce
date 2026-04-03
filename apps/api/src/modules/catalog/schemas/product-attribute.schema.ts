import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductAttributeDocument = ProductAttribute & Document;

@Schema({ collection: 'product_attributes', timestamps: true })
export class ProductAttribute {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ type: String, required: false })
  variantId?: string;

  @Prop({ type: String, required: true })
  attributeName: string;

  @Prop({ type: String, required: true })
  attributeValue: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const ProductAttributeSchema = SchemaFactory.createForClass(ProductAttribute);

ProductAttributeSchema.index({ productId: 1 });
ProductAttributeSchema.index({ variantId: 1 });

