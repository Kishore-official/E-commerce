import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ProductStatus } from '@ecommerce/shared-types';

export type ProductDocument = Product & Document;

@Schema({ collection: 'products', timestamps: true })
export class Product {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: true })
  vendorId: string;

  @Prop({ type: String, required: false })
  categoryId?: string;

  @Prop({ type: String, required: false })
  brandId?: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  shortDescription?: string;

  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Prop({ type: String, required: false })
  countryOfOrigin?: string;

  @Prop({ type: String, required: false })
  metaTitle?: string;

  @Prop({ type: String, required: false })
  metaDescription?: string;

  @Prop({ type: String, required: false })
  rejectionReason?: string;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  // Virtual properties for relations (not stored in DB)
  images?: any[];
  attributes?: any[];
  variants?: any[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ vendorId: 1 });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ status: 1 });

