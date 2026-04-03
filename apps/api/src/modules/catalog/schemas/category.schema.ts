import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ collection: 'categories', timestamps: true })
export class Category {
  @Prop({ type: String, required: true, unique: true })
  id: string;

  @Prop({ type: String, required: false })
  parentId?: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  imageUrl?: string;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.set('toJSON', {
  versionKey: false,
  transform: (_doc: any, ret: any) => { delete ret._id; delete ret.__v; return ret; },
});

CategorySchema.index({ parentId: 1 });
CategorySchema.index({ isActive: 1 });

